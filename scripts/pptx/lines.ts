import { face } from "./faces";

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
    // A line may break after a space, a hyphen or a slash, as Chrome and LibreOffice break.
    for (const tok of sp.text.split(/(\n|[^\s/-]*[/-]+|[^\S\n]+)/).filter(Boolean)) {
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

type MeasuredPiece = {
  text: string;
  width: number;
  breakMeasure?: { width: number; space: number };
  trailing?: number;
  forced?: boolean;
};

/** The measured pieces of spans at a line width, with oversized pieces split by code point. */
export function* fitPieces(spans: Span[], width: number): Iterable<MeasuredPiece> {
  for (const p of pieces(spans)) {
    if (p.forced && !p.parts.length) {
      yield { text: "", width: 0, forced: true };
      continue;
    }
    const pw = pieceWidth(p);
    const breakMeasure = { width: pw, space: p.space };
    if (pw - p.space > width) {
      // The whole piece still gets a break before its characters, which wrap only at non-space
      // characters. Its trailing space and forced break apply after the last character.
      yield { text: "", width: 0, breakMeasure };
      for (const [sp, t] of p.parts)
        for (const ch of t) {
          const cw = spanWidth(sp, ch);
          yield {
            text: ch,
            width: cw,
            breakMeasure: /\s/.test(ch) ? undefined : { width: cw, space: 0 },
          };
        }
      yield { text: "", width: 0, trailing: p.space, forced: p.forced };
      continue;
    }
    yield { text: pieceText(p), width: pw, breakMeasure, trailing: p.space, forced: p.forced };
  }
}

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
  for (const p of fitPieces(spans, width)) {
    const measure = p.breakMeasure;
    if (text && measure && w + measure.width - measure.space > width) end();
    text += p.text;
    w += p.width;
    if (p.trailing !== undefined) trail = p.trailing;
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

/** The lines `text-wrap: pretty` sets, as brand's text base asks of paragraphs and list items:
 *  where the greedy lines leave a single word on the last, the widest narrower measure that keeps
 *  the line count and gives the last line two words; undefined where the greedy lines stand. */
export function pretty(spans: Span[], width: number): Line[] | undefined {
  const greedy = wrap(spans, width);
  const lone = (lines: Line[]) => !/\S\s+\S/.test(lines[lines.length - 1].text.trim());
  if (greedy.length < 2 || !lone(greedy)) return undefined;
  // Never narrower than the longest word, which a renderer would break inside.
  const floor = Math.max(width * 0.7, longest(spans));
  for (let w = width * 0.98; w >= floor; w -= width * 0.02) {
    const lines = wrap(spans, w);
    if (lines.length !== greedy.length) return undefined;
    if (!lone(lines)) return lines;
  }
  return undefined;
}

/** The widest piece of `spans` a line cannot break inside, in points. */
export const longest = (spans: Span[]) =>
  Math.max(0, ...pieces(spans).map((p) => pieceWidth(p) - p.space));
