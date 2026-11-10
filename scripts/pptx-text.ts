// The PowerPoint export's text measure: the brand faces' own advance widths and line heights, read
// from the woff2 files brand exports, the line breaks a renderer makes with them, and the check
// that no text box of a written slide runs past its box, the shape it stands in or the slide.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { brotliDecompressSync } from "node:zlib";
import { tokens } from "@hackersandwizards/brand/tokens";

/** The first family of a brand font stack, as PowerPoint names the installed font. */
export function family(stack: string): string {
  return stack
    .split(",")[0]
    .replace(/"/g, "")
    .replace(/ Variable$/, "")
    .trim();
}
export const MONO = family(tokens["--font-mono"]);
export const SANS = family(tokens["--font-sans"]);

/** One face's metrics in em: its line height (hhea ascender, descender and gap, which PowerPoint
 *  and LibreOffice take for single spacing) and an advance per code point. */
export interface FaceMetrics {
  line: number;
  ascent: number;
  advance: (cp: number) => number | undefined;
}

// WOFF2's table tags by their index in the table directory (WOFF2 §5.1).
const TAGS =
  "cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill"
    .match(/.{4}\s?/g)!
    .map((t) => t.slice(0, 4));

/** The tables of a WOFF2 font, decompressed; glyf and loca stay in their transformed form, which
 *  the measure never reads. */
export function woff2Tables(buf: Buffer): Map<string, Buffer> {
  if (buf.toString("latin1", 0, 4) !== "wOF2") throw new Error("not a WOFF2 font");
  const count = buf.readUInt16BE(12);
  let at = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[at++];
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    throw new Error("bad UIntBase128");
  };
  const dir: [string, number][] = [];
  for (let i = 0; i < count; i++) {
    const flags = buf[at++];
    const tag = (flags & 0x3f) === 63 ? buf.toString("latin1", at, (at += 4)) : TAGS[flags & 0x3f];
    const orig = base128();
    const version = flags >> 6;
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    dir.push([tag, transformed ? base128() : orig]);
  }
  const data = brotliDecompressSync(buf.subarray(at, at + buf.readUInt32BE(20)));
  const tables = new Map<string, Buffer>();
  let off = 0;
  for (const [tag, len] of dir) {
    tables.set(tag, data.subarray(off, off + len));
    off += len;
  }
  return tables;
}

/** A cmap's code points to glyph ids, from its format 4 or 12 Unicode subtable. */
function cmapOf(t: Buffer): Map<number, number> {
  const map = new Map<number, number>();
  const n = t.readUInt16BE(2);
  const subs = Array.from({ length: n }, (_, i) => t.readUInt32BE(4 + i * 8 + 4));
  const pick =
    subs.find((o) => t.readUInt16BE(o) === 12) ?? subs.find((o) => t.readUInt16BE(o) === 4);
  if (pick === undefined) throw new Error("no Unicode cmap");
  if (t.readUInt16BE(pick) === 12) {
    const groups = t.readUInt32BE(pick + 12);
    for (let g = 0; g < groups; g++) {
      const o = pick + 16 + g * 12;
      const [start, end, gid] = [t.readUInt32BE(o), t.readUInt32BE(o + 4), t.readUInt32BE(o + 8)];
      for (let cp = start; cp <= end; cp++) map.set(cp, gid + cp - start);
    }
    return map;
  }
  const segs = t.readUInt16BE(pick + 6) / 2;
  const ends = pick + 14;
  const starts = ends + segs * 2 + 2;
  const deltas = starts + segs * 2;
  const ranges = deltas + segs * 2;
  for (let s = 0; s < segs; s++) {
    const [end, start] = [t.readUInt16BE(ends + s * 2), t.readUInt16BE(starts + s * 2)];
    const [delta, range] = [t.readInt16BE(deltas + s * 2), t.readUInt16BE(ranges + s * 2)];
    for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
      const gid = range
        ? t.readUInt16BE(ranges + s * 2 + range + (cp - start) * 2)
        : (cp + delta) & 0xffff;
      if (gid) map.set(cp, range ? (gid + delta) & 0xffff : gid);
    }
  }
  return map;
}

/** A face's metrics from its WOFF2 files, the first file holding a code point giving its advance,
 *  as the unicode-range subsets of one face do. */
export function faceMetrics(files: Buffer[]): FaceMetrics {
  const fonts = files.map((f) => {
    const t = woff2Tables(f);
    const head = t.get("head")!;
    const hhea = t.get("hhea")!;
    const hmtx = t.get("hmtx")!;
    const upm = head.readUInt16BE(18);
    const metrics = hhea.readUInt16BE(34);
    const cmap = cmapOf(t.get("cmap")!);
    return {
      upm,
      ascent: hhea.readInt16BE(4) / upm,
      line: (hhea.readInt16BE(4) - hhea.readInt16BE(6) + hhea.readInt16BE(8)) / upm,
      advance: (cp: number) => {
        const gid = cmap.get(cp);
        if (gid === undefined) return undefined;
        return hmtx.readUInt16BE(Math.min(gid, metrics - 1) * 4) / upm;
      },
    };
  });
  return {
    line: fonts[0].line,
    ascent: fonts[0].ascent,
    advance: (cp) => {
      for (const f of fonts) {
        const a = f.advance(cp);
        if (a !== undefined) return a;
      }
      return undefined;
    },
  };
}

/** The two brand faces at the weights the export sets, regular and bold: every static WOFF2
 *  subset brand's `static-fonts.css` names for them, latin first. */
const require = createRequire(import.meta.url);
const staticFaces = [
  ...readFileSync(require.resolve("@hackersandwizards/brand/static-fonts.css"), "utf8").matchAll(
    /@font-face\s*{([^}]*)}/g,
  ),
].map(([, body]) => {
  const decl = new Map(
    [...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  );
  return {
    family: decl.get("font-family")?.replace(/"/g, "") ?? "",
    weight: Number(decl.get("font-weight")),
    file: /url\("[^"]*\/([^"/]+\.woff2)"\)/.exec(decl.get("src") ?? "")?.[1],
  };
});
export const faceFiles = (mono: boolean, bold: boolean) => {
  const name = mono ? MONO : SANS;
  const files = staticFaces
    .filter((f) => f.file && f.family.startsWith(name) && f.weight === (bold ? 700 : 400))
    .map((f) => f.file!)
    .sort((x, y) => Number(/-latin-\d/.test(y)) - Number(/-latin-\d/.test(x)));
  if (!files.length)
    throw new Error(`brand's static-fonts.css names no ${name} ${bold ? 700 : 400}`);
  return files.map((f) => require.resolve(`@hackersandwizards/brand/fonts/${f}`));
};
const faces = new Map<string, FaceMetrics>();
export function face(mono: boolean, bold: boolean): FaceMetrics {
  const key = `${mono}-${bold}`;
  let f = faces.get(key);
  if (!f) {
    f = faceMetrics(faceFiles(mono, bold).map((file) => readFileSync(file)));
    faces.set(key, f);
  }
  return f;
}

/** A stretch of text in one face and size, as a text run is drawn: `tracking` in points after
 *  each character, `caps` drawn as capitals whatever the text's case. */
export interface Span {
  text: string;
  size: number;
  mono: boolean;
  bold: boolean;
  tracking?: number;
  caps?: boolean;
}

/** Width in points of `text` in a span's face; a character neither face file holds takes the
 *  face's widest common letter, so an unknown glyph never measures narrow. */
function spanWidth(sp: Span, text: string): number {
  const f = face(sp.mono, sp.bold);
  let em = 0;
  for (const ch of sp.caps ? text.toUpperCase() : text)
    em += f.advance(ch.codePointAt(0)!) ?? f.advance(0x4d) ?? 0.6;
  return em * sp.size + [...text].length * (sp.tracking ?? 0);
}

/** One drawn line: its text and its width in points without the spaces it ends on. */
export interface Line {
  text: string;
  width: number;
}

/** The pieces a line may break after: a word with the spaces after it, or a word up to and with
 *  its hyphen, each split over the spans it crosses. A forced break is a `\n` in a span. */
type Piece = { parts: [Span, string][]; space: number; forced: boolean };
function pieces(spans: Span[]): Piece[] {
  const out: Piece[] = [];
  let cur: Piece = { parts: [], space: 0, forced: false };
  const push = (forced = false) => {
    if (cur.parts.length || forced) out.push({ ...cur, forced });
    cur = { parts: [], space: 0, forced: false };
  };
  for (const sp of spans) {
    for (const tok of sp.text.split(/(\n|[^\s-]*-+|\s+)/).filter(Boolean)) {
      if (tok === "\n") {
        push(true);
        continue;
      }
      if (/^\s+$/.test(tok)) {
        cur.parts.push([sp, tok]);
        cur.space += spanWidth(sp, tok);
        push();
        continue;
      }
      if (cur.space) push();
      cur.parts.push([sp, tok]);
      if (tok.endsWith("-")) push();
    }
  }
  push();
  return out;
}

const pieceWidth = (p: Piece) => p.parts.reduce((w, [sp, t]) => w + spanWidth(sp, t), 0);
const pieceText = (p: Piece) => p.parts.map(([, t]) => t).join("");

/** The lines a renderer breaks `spans` into at `width` points: greedy, at spaces and after
 *  hyphens, a piece wider than the line broken by character, as PowerPoint and LibreOffice do. */
export function wrap(spans: Span[], width: number): Line[] {
  const lines: Line[] = [];
  let text = "";
  let w = 0;
  let trail = 0;
  const end = () => {
    lines.push({ text: text.trimEnd(), width: w - trail });
    [text, w, trail] = ["", 0, 0];
  };
  for (const p of pieces(spans)) {
    if (p.forced && !p.parts.length) {
      end();
      continue;
    }
    const pw = pieceWidth(p);
    if (text && w + pw - p.space > width) end();
    if (pw - p.space > width) {
      // Broken by character over as many lines as it takes.
      for (const [sp, t] of p.parts)
        for (const ch of t) {
          const cw = spanWidth(sp, ch);
          if (text && w + cw > width && !/\s/.test(ch)) end();
          text += ch;
          w += cw;
        }
      trail = p.space;
    } else {
      text += pieceText(p);
      w += pw;
      trail = p.space;
    }
    if (p.forced) end();
  }
  if (text || !lines.length) end();
  return lines;
}

/** The lines `text-wrap: balance` gives: as many as the greedy break, at the narrowest width that
 *  keeps that count, which evens them out. The line counts are Chrome's limit for balancing. */
export function balance(spans: Span[], width: number): Line[] {
  const greedy = wrap(spans, width);
  if (greedy.length < 2 || greedy.length > 6) return greedy;
  let [lo, hi] = [0, width];
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(spans, mid).length > greedy.length) lo = mid;
    else hi = mid;
  }
  return wrap(spans, hi);
}

/** The widest piece of `spans` a line cannot break inside, in points. */
export const longest = (spans: Span[]) =>
  Math.max(0, ...pieces(spans).map((p) => pieceWidth(p) - p.space));

const EMU = 914400;
const xmlAttr = (xml: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(xml)?.[1];
const num = (xml: string, name: string, fallback = 0) => {
  const v = xmlAttr(xml, name);
  return v === undefined ? fallback : Number(v);
};
const unescape = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const rectOf = (xml: string): Rect | undefined => {
  const off = /<a:off x="(-?\d+)" y="(-?\d+)"\/>/.exec(xml);
  const ext = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(xml);
  if (!off || !ext) return undefined;
  return { x: +off[1] / EMU, y: +off[2] / EMU, w: +ext[1] / EMU, h: +ext[2] / EMU };
};

/** The height in inches a text body's paragraphs take at `width` inches, measured as a renderer
 *  lays them out: exact line spacing as written, a percentage of the face's own line height, and
 *  each paragraph's space after; with the widest piece no line can break. */
function bodyHeight(body: string, width: number) {
  let h = 0;
  let widest = 0;
  const paras = [...body.matchAll(/<a:p>(.*?)<\/a:p>/gs)].map((m) => m[1]);
  paras.forEach((p, i) => {
    const pPr = /<a:pPr[^>]*?(?:\/>|>.*?<\/a:pPr>)/s.exec(p)?.[0] ?? "";
    const marL = num(pPr, "marL") / EMU;
    const spans: Span[] = [];
    for (const m of p.matchAll(/<a:r>(.*?)<\/a:r>|<a:br>.*?<\/a:br>|<a:br\/>/gs)) {
      if (!m[1]) {
        if (spans.length) spans[spans.length - 1].text += "\n";
        continue;
      }
      const rPr = /<a:rPr[^>]*?(?:\/>|>.*?<\/a:rPr>)/s.exec(m[1])?.[0] ?? "";
      const text = unescape(/<a:t>(.*?)<\/a:t>/s.exec(m[1])?.[1] ?? "");
      spans.push({
        text,
        size: num(rPr, "sz", 1800) / 100,
        mono: rPr.includes(`typeface="${MONO}"`),
        bold: xmlAttr(rPr, "b") === "1",
        tracking: num(rPr, "spc") / 100,
        caps: xmlAttr(rPr, "cap") === "all",
      });
    }
    if (!spans.some((sp) => sp.text.trim())) {
      return;
    }
    const size = Math.max(...spans.map((sp) => sp.size));
    const exact = /<a:lnSpc><a:spcPts val="(\d+)"\/>/.exec(pPr);
    const pct = /<a:lnSpc><a:spcPct val="(\d+)"\/>/.exec(pPr);
    const lineH = exact
      ? +exact[1] / 100
      : (pct ? +pct[1] / 100000 : 1) *
        Math.max(...spans.map((sp) => face(sp.mono, sp.bold).line * sp.size));
    const after = /<a:spcAft><a:spcPts val="(\d+)"\/>/.exec(pPr);
    h += wrap(spans, (width - marL) * 72).length * lineH;
    if (i < paras.length - 1 && after) h += +after[1] / 100;
    widest = Math.max(widest, longest(spans) / 72 + marL);
    void size;
  });
  return { h: h / 72, widest };
}

/** What a written slide draws wrong: a text box whose measured text is taller or wider than the
 *  box, text standing past the shape it sits in, and anything outside the slide. `w` and `h` are
 *  the slide's size in inches. */
export function checkSlide(xml: string, w: number, h: number): string[] {
  const found: string[] = [];
  const tol = 0.02;
  const shapes = [...xml.matchAll(/<p:(sp|pic|graphicFrame|cxnSp)>(.*?)<\/p:\1>/gs)].map((m) => {
    const name = xmlAttr(m[2], "name") ?? m[1];
    const body = /<p:txBody>(.*?)<\/p:txBody>/s.exec(m[2])?.[1];
    const text = body && [...body.matchAll(/<a:t>(.*?)<\/a:t>/gs)].map((t) => t[1]).join("");
    return {
      kind: m[1],
      name,
      rect: rectOf(/<(?:a|p):xfrm[^>]*>(.*?)<\/(?:a|p):xfrm>/s.exec(m[2])?.[1] ?? ""),
      geom: xmlAttr(m[2].match(/<a:prstGeom[^>]*>/)?.[0] ?? "", "prst"),
      body: text?.trim() ? body : undefined,
      text: text ? unescape(text) : "",
    };
  });
  for (const s of shapes) {
    const r = s.rect;
    if (!r) continue;
    if (r.x < -tol || r.y < -tol || r.x + r.w > w + tol || r.y + r.h > h + tol)
      found.push(`${s.name} "${s.text.slice(0, 40)}" stands outside the slide`);
    if (!s.body) continue;
    const pr = /<a:bodyPr[^>]*>/.exec(s.body)?.[0] ?? "";
    const ins = (n: string, d: number) => num(pr, n, d) / EMU;
    const [l, t, rt, b] = [
      ins("lIns", 91440),
      ins("tIns", 45720),
      ins("rIns", 91440),
      ins("bIns", 45720),
    ];
    const inner = r.w - l - rt;
    const m = bodyHeight(s.body, inner);
    const label = `${s.name} "${s.text.slice(0, 40)}"`;
    if (m.h > r.h - t - b + tol)
      found.push(
        `${label}: text ${m.h.toFixed(2)} in tall in a box ${(r.h - t - b).toFixed(2)} in`,
      );
    if (m.widest > inner + tol)
      found.push(`${label}: a word ${m.widest.toFixed(2)} in wide in a box ${inner.toFixed(2)} in`);
    // Where the text stands, by its anchor, and the smallest filled shape holding the box's centre.
    const anchor = xmlAttr(pr, "anchor") ?? "t";
    const top =
      anchor === "ctr"
        ? r.y + t + (r.h - t - b - m.h) / 2
        : anchor === "b"
          ? r.y + r.h - b - m.h
          : r.y + t;
    const [cx, cy] = [r.x + r.w / 2, r.y + r.h / 2];
    const holder = shapes
      .filter(
        (o) =>
          o !== s &&
          !o.body &&
          o.kind === "sp" &&
          o.rect &&
          o.geom !== "line" &&
          o.rect.w * o.rect.h < w * h * 0.9 &&
          o.rect.x <= cx &&
          cx <= o.rect.x + o.rect.w &&
          o.rect.y <= cy &&
          cy <= o.rect.y + o.rect.h &&
          // An ellipse holds only the points inside it, never its frame's corners.
          (o.geom !== "ellipse" ||
            ((cx - o.rect.x - o.rect.w / 2) / (o.rect.w / 2)) ** 2 +
              ((cy - o.rect.y - o.rect.h / 2) / (o.rect.h / 2)) ** 2 <=
              1),
      )
      .sort((p, q) => p.rect!.w * p.rect!.h - q.rect!.w * q.rect!.h)[0]?.rect;
    if (
      holder &&
      (top < holder.y - tol ||
        top + m.h > holder.y + holder.h + tol ||
        r.x + l < holder.x - tol ||
        r.x + r.w - rt > holder.x + holder.w + tol)
    )
      found.push(`${label}: text crosses the edge of the shape it stands in`);
  }
  return found;
}
