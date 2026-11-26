import { face, MONO } from "./faces";
import { longest, wrap, type Span } from "./lines";
import { num, unescape, xmlAttr } from "./xml";

const EMU = 914400;
const TOLERANCE = 0.02;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectOf = (xml: string): Rect | undefined => {
  const transform = /<(?:a|p):xfrm[^>]*>(.*?)<\/(?:a|p):xfrm>/s.exec(xml)?.[1] ?? "";
  const off = /<a:off x="(-?\d+)" y="(-?\d+)"\/>/.exec(transform);
  const ext = /<a:ext cx="(-?\d+)" cy="(-?\d+)"\/>/.exec(transform);
  if (!off || !ext) return undefined;
  return { x: +off[1] / EMU, y: +off[2] / EMU, w: +ext[1] / EMU, h: +ext[2] / EMU };
};

/** The text and font metrics settings written in one DrawingML run. */
export function spanOf(xml: string): Span {
  const rPr = /<a:rPr[^>]*?(?:\/>|>.*?<\/a:rPr>)/s.exec(xml)?.[0] ?? "";
  const text = unescape(/<a:t>(.*?)<\/a:t>/s.exec(xml)?.[1] ?? "");
  return {
    text,
    size: num(rPr, "sz", 1800) / 100,
    mono: rPr.includes(`typeface="${MONO}"`),
    bold: xmlAttr(rPr, "b") === "1",
    tracking: num(rPr, "spc") / 100,
    caps: xmlAttr(rPr, "cap") === "all",
  };
}

/** A DrawingML paragraph's runs, margin and spacing in the units used by its XML. */
export function paragraphOf(xml: string) {
  const pPr = /<a:pPr[^>]*?(?:\/>|>.*?<\/a:pPr>)/s.exec(xml)?.[0] ?? "";
  const spans: Span[] = [];
  for (const match of xml.matchAll(/<a:r>(.*?)<\/a:r>|<a:br>.*?<\/a:br>|<a:br\/>/gs)) {
    if (!match[1]) {
      if (spans.length) spans[spans.length - 1].text += "\n";
      continue;
    }
    spans.push(spanOf(match[1]));
  }
  return {
    spans,
    marL: num(pPr, "marL") / EMU,
    exact: /<a:lnSpc><a:spcPts val="(\d+)"\/>/.exec(pPr)?.[1],
    pct: /<a:lnSpc><a:spcPct val="(\d+)"\/>/.exec(pPr)?.[1],
    after: /<a:spcAft><a:spcPts val="(\d+)"\/>/.exec(pPr)?.[1],
  };
}

/** The height in inches a text body's paragraphs take at `width` inches, measured as a renderer
 *  lays them out: exact line spacing as written, a percentage of the face's own line height, and
 *  each paragraph's space after; with the widest piece no line can break. */
function bodyHeight(paragraphs: string[], width: number) {
  let h = 0;
  let widest = 0;
  let line = 0;
  for (const [i, p] of paragraphs.entries()) {
    const { spans, marL, exact, pct, after } = paragraphOf(p);
    if (!spans.some((sp) => sp.text.trim())) continue;
    const lineH = exact
      ? +exact / 100
      : (pct ? +pct / 100000 : 1) *
        Math.max(...spans.map((sp) => face(sp.mono, sp.bold).line * sp.size));
    const lines = wrap(spans, (width - marL) * 72);
    h += lines.length * lineH;
    line = Math.max(line, ...lines.map((l) => l.width / 72 + marL));
    if (i < paragraphs.length - 1 && after) h += +after / 100;
    widest = Math.max(widest, longest(spans) / 72 + marL);
  }
  return { h: h / 72, widest, line };
}

interface TextBody {
  paragraphs: string[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  anchor: string | undefined;
  alignment: string | undefined;
}

interface Shape {
  kind: string;
  name: string;
  rect: Rect;
  geom: string | undefined;
  text: string;
  body?: TextBody;
}

/** A written shape's rectangle, label and text body, if it has a transform with a rectangle. */
export function shapeOf(xml: string, kind: string): Shape | undefined {
  const body = /<p:txBody>(.*?)<\/p:txBody>/s.exec(xml)?.[1] ?? "";
  const raw = [...body.matchAll(/<a:t>(.*?)<\/a:t>/gs)].map((part) => part[1]).join("");
  const rect = rectOf(xml);
  const geom = xmlAttr(xml.match(/<a:prstGeom[^>]*>/)?.[0] ?? "", "prst");
  const name = xmlAttr(xml, "name") ?? kind;
  const text = unescape(raw);
  if (!rect) return undefined;
  const shape = { kind, name, rect, geom, text };
  if (!raw.trim()) return shape;

  const pr = /<a:bodyPr[^>]*>/.exec(body)?.[0] ?? "";
  return {
    ...shape,
    body: {
      paragraphs: [...body.matchAll(/<a:p>(.*?)<\/a:p>/gs)].map((part) => part[1]),
      left: num(pr, "lIns", 91440) / EMU,
      top: num(pr, "tIns", 45720) / EMU,
      right: num(pr, "rIns", 91440) / EMU,
      bottom: num(pr, "bIns", 45720) / EMU,
      anchor: xmlAttr(pr, "anchor"),
      alignment: xmlAttr(body, "algn"),
    },
  };
}

/** Reports a rectangle beyond any edge of a slide, with rounding tolerance. */
export function outsideSlide(r: Rect, w: number, h: number): string | undefined {
  const tol = TOLERANCE;
  if (r.x < -tol || r.y < -tol || r.x + r.w > w + tol || r.y + r.h > h + tol)
    return "stands outside the slide";
  return undefined;
}

interface TextLayout {
  rect: Rect;
  body: TextBody;
  inner: number;
  metrics: ReturnType<typeof bodyHeight>;
}

/** Reports text taller than its text box's interior. */
export function tallerThanBox({ rect: r, body, metrics: m }: TextLayout): string | undefined {
  const { top: t, bottom: b } = body;
  if (m.h > r.h - t - b + TOLERANCE)
    return `text ${m.h.toFixed(2)} in tall in a box ${(r.h - t - b).toFixed(2)} in`;
  return undefined;
}

/** Reports an unbreakable piece wider than its text box's interior. */
export function widerThanBox({ inner, metrics: m }: TextLayout): string | undefined {
  if (m.widest > inner + TOLERANCE)
    return `a word ${m.widest.toFixed(2)} in wide in a box ${inner.toFixed(2)} in`;
  return undefined;
}

/** The smallest filled shape holding the box's centre, first in draw order on a tie. */
export function holderFor(r: Rect, candidates: Pick<Shape, "rect" | "geom">[], limit: number) {
  const [cx, cy] = [r.x + r.w / 2, r.y + r.h / 2];
  let holder: Rect | undefined;
  let smallest = limit;
  for (const { geom, rect } of candidates) {
    const area = rect.w * rect.h;
    if (!(
      area < smallest &&
      rect.x <= cx &&
      cx <= rect.x + rect.w &&
      rect.y <= cy &&
      cy <= rect.y + rect.h
    ))
      continue;
    // An ellipse holds only the points inside it, never its frame's corners.
    if (
      geom === "ellipse" &&
      !(
        ((cx - rect.x - rect.w / 2) / (rect.w / 2)) ** 2 +
          ((cy - rect.y - rect.h / 2) / (rect.h / 2)) ** 2 <=
        1
      )
    )
      continue;
    holder = rect;
    smallest = area;
  }
  return holder;
}

// Where the text stands, by its anchor.
const TOP_BY_ANCHOR = new Map<string | undefined, (layout: TextLayout) => number>([
  [
    "ctr",
    ({ rect: r, body: { top: t, bottom: b }, metrics: m }) => r.y + t + (r.h - t - b - m.h) / 2,
  ],
  ["b", ({ rect: r, body: { bottom: b }, metrics: m }) => r.y + r.h - b - m.h],
]);

// And across: the longest line, from the side its alignment sets it.
const LEFT_BY_ALIGNMENT = new Map<string | undefined, (layout: TextLayout) => number>([
  ["ctr", ({ rect: r, body: { left: l }, inner, metrics: m }) => r.x + l + (inner - m.line) / 2],
  ["r", ({ rect: r, body: { right: rt }, metrics: m }) => r.x + r.w - rt - m.line],
]);

/** Reports the measured text crossing any edge of its holder. */
export function crossesHolder(layout: TextLayout, holder: Rect | undefined): string | undefined {
  if (!holder) return undefined;
  const { rect: r, body, inner, metrics: m } = layout;
  const tol = TOLERANCE;
  const anchor = TOP_BY_ANCHOR.get(body.anchor);
  const alignment = LEFT_BY_ALIGNMENT.get(body.alignment);
  const top = anchor ? anchor(layout) : r.y + body.top;
  const left = alignment ? alignment(layout) : r.x + body.left;
  if (
    top < holder.y - tol ||
    top + m.h > holder.y + holder.h + tol ||
    left < holder.x - tol ||
    left + Math.min(m.line, inner) > holder.x + holder.w + tol
  )
    return "text crosses the edge of the shape it stands in";
  return undefined;
}

const TEXT_CHECKS = [tallerThanBox, widerThanBox, crossesHolder];

/** What a written slide draws wrong: a text box whose measured text is taller or wider than the
 *  box, text standing past the shape it sits in, and anything outside the slide. `w` and `h` are
 *  the slide's size in inches. */
export function checkSlide(xml: string, w: number, h: number): string[] {
  const found: string[] = [];
  const shapes = [...xml.matchAll(/<p:(sp|pic|graphicFrame|cxnSp)>(.*?)<\/p:\1>/gs)]
    .map((match) => shapeOf(match[2], match[1]))
    .filter((shape) => shape !== undefined);
  const candidates = shapes.filter(
    (shape) => !shape.body && shape.kind === "sp" && shape.geom !== "line",
  );
  for (const shape of shapes) {
    const { rect, body } = shape;
    const label = `${shape.name} "${shape.text.slice(0, 40)}"`;
    if (rect.w < 0 || rect.h < 0) {
      found.push(`${label}: has a negative extent`);
      continue;
    }
    const outside = outsideSlide(rect, w, h);
    if (outside) found.push(`${label} ${outside}`);
    if (!body) continue;
    const inner = rect.w - body.left - body.right;
    const layout = { rect, body, inner, metrics: bodyHeight(body.paragraphs, inner) };
    const holder = holderFor(rect, candidates, w * h * 0.9);
    for (const check of TEXT_CHECKS) {
      const message = check(layout, holder);
      if (message) found.push(`${label}: ${message}`);
    }
  }
  return found;
}
