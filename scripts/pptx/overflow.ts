import { face, MONO } from "./faces";
import { longest, wrap, type Span } from "./lines";
import { num, unescape, xmlAttr } from "./xml";

const EMU = 914400;

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
  let line = 0;
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
    const exact = /<a:lnSpc><a:spcPts val="(\d+)"\/>/.exec(pPr);
    const pct = /<a:lnSpc><a:spcPct val="(\d+)"\/>/.exec(pPr);
    const lineH = exact
      ? +exact[1] / 100
      : (pct ? +pct[1] / 100000 : 1) *
        Math.max(...spans.map((sp) => face(sp.mono, sp.bold).line * sp.size));
    const after = /<a:spcAft><a:spcPts val="(\d+)"\/>/.exec(pPr);
    const lines = wrap(spans, (width - marL) * 72);
    h += lines.length * lineH;
    line = Math.max(line, ...lines.map((l) => l.width / 72 + marL));
    if (i < paras.length - 1 && after) h += +after[1] / 100;
    widest = Math.max(widest, longest(spans) / 72 + marL);
  });
  return { h: h / 72, widest, line };
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
    // And across: the longest line, from the side its alignment sets it.
    const algn = xmlAttr(s.body, "algn") ?? "l";
    const left =
      algn === "ctr"
        ? r.x + l + (inner - m.line) / 2
        : algn === "r"
          ? r.x + r.w - rt - m.line
          : r.x + l;
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
        left < holder.x - tol ||
        left + Math.min(m.line, inner) > holder.x + holder.w + tol)
    )
      found.push(`${label}: text crosses the edge of the shape it stands in`);
  }
  return found;
}
