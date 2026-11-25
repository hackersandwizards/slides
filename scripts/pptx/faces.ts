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
/** Each brand face's PANOSE family class (sans 34, monospace 49), so a machine without it
 *  substitutes a face of the same kind. */
export const PITCH: Record<string, string> = { [SANS]: "34", [MONO]: "49" };

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
    // A transformed hmtx holds no left side bearings, so the advances would be read off by a field.
    if (transformed && tag === "hmtx") throw new Error("a transformed hmtx table");
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

/** Glyph IDs from the consecutive code points in a format 12 subtable's groups. */
export function readCmapFormat12(t: Buffer, pick: number): Map<number, number> {
  const map = new Map<number, number>();
  const groups = t.readUInt32BE(pick + 12);
  for (let g = 0; g < groups; g++) {
    const o = pick + 16 + g * 12;
    const [start, end, gid] = [t.readUInt32BE(o), t.readUInt32BE(o + 4), t.readUInt32BE(o + 8)];
    for (let cp = start; cp <= end; cp++) map.set(cp, gid + cp - start);
  }
  return map;
}

/** Glyph IDs from the deltas and glyph arrays in a format 4 subtable's segments. */
export function readCmapFormat4(t: Buffer, pick: number): Map<number, number> {
  const map = new Map<number, number>();
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

const CMAP_READERS = new Map([
  [12, readCmapFormat12],
  [4, readCmapFormat4],
]);

/** A cmap's code points to glyph ids, from its format 4 or 12 Unicode subtable. */
function cmapOf(t: Buffer): Map<number, number> {
  const n = t.readUInt16BE(2);
  const subs = Array.from({ length: n }, (_, i) => t.readUInt32BE(4 + i * 8 + 4));
  for (const [format, read] of CMAP_READERS) {
    const pick = subs.find((o) => t.readUInt16BE(o) === format);
    if (pick !== undefined) return read(t, pick);
  }
  throw new Error("no Unicode cmap");
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
/** The static WOFF2 subsets brand's `static-fonts.css` names for one brand face, regular or
 *  bold, latin first. */
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
