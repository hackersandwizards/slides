import { MONO, SANS } from "./faces";
import { longest, wrap, type pretty, type Span } from "./lines";
import { LEADING, type Area, type Measure } from "./stage";
import { CAPS, plain, type BoxOpts, type Para, type Run, type TextType } from "./text";

/** Width in inches of `text` set in one face, with 1 % to spare: LibreOffice sets a line up to
 *  0.7 % wider than the faces' advances add up to, so a box sized to its text keeps it on a line. */
export const textWidth = (
  text: string,
  { size, mono = false, bold = false, tracking = 0 }: TextType,
) =>
  (wrap([{ text: plain(text), size, mono, bold, tracking: tracking * size }], Infinity)[0].width /
    72) *
  1.01;

/** The size a paragraph is drawn at, at scale k: pptxgenjs writes half points. */
export const drawnSize = (p: Para, o: BoxOpts, k: number) =>
  Math.round(o.size * (p.rel ?? 1) * k * 2) / 2;

export function paraType(p: Para, o: BoxOpts, k: number) {
  const size = drawnSize(p, o, k);
  return {
    size,
    face: (p.mono ?? o.mono) ? MONO : SANS,
    bold: p.bold ?? o.bold,
    tracking: (o.tracking ?? 0) * size,
  };
}

/** A paragraph as the measure reads it: each run in the face and weight it is drawn in. */
export function spansOf(p: Para, o: BoxOpts, k: number): Span[] {
  const base = paraType(p, o, k);
  return p.runs.map((r) => {
    const own = r.options ?? {};
    return {
      text: r.text,
      size: own.fontSize ?? base.size,
      mono: (own.fontFace ?? base.face) === MONO,
      bold: !!(own.bold ?? base.bold),
      tracking: base.tracking,
      caps: own.lang === CAPS,
    };
  });
}

/** A paragraph's left margin in inches: a bullet's, as `box` writes it. */
export const marginOf = (p: Para) => (p.bullet ? (BULLET_INDENT * (1 + (p.indent ?? 0))) / 72 : 0);
export const BULLET_INDENT = 16;

/** A paragraph's line height in points at scale k: the web's leading for its size, exact. */
export const lineOf = (p: Para, o: BoxOpts, k: number) =>
  drawnSize(p, o, k) * (p.line ?? o.line ?? LEADING.body) * (o.lineScale ?? 1);

export function parasHeight(paras: Para[], o: BoxOpts, { w, k }: Measure) {
  return paras.reduce((sum, p, i) => {
    const n = wrap(spansOf(p, o, k), (w - marginOf(p)) * 72).length;
    const after = i < paras.length - 1 ? (p.after ?? 0) * k : 0;
    return sum + (n * lineOf(p, o, k) + after) / 72;
  }, 0);
}

/** The scale in [floor, 1] at which `paras` fit `h` inches and their longest word `w`. */
export function fitScale(paras: Para[], o: BoxOpts, { w, h }: Pick<Area, "w" | "h">) {
  let k = 1;
  const floor = o.floor ?? 0.6;
  const widest = (kk: number) =>
    Math.max(...paras.map((p) => longest(spansOf(p, o, kk)) / 72 + marginOf(p)));
  while (k > floor && (parasHeight(paras, o, { w, k }) > h + 0.005 || widest(k) > w)) k -= 0.02;
  return Math.max(k, floor);
}

/** A paragraph's runs with a forced line break (`\n`) where the web breaks it, `text-wrap:
 *  balance` or `pretty`, at the drawn size, so PowerPoint sets the slide's lines. */
export function breakAt(runs: Run[], lines: ReturnType<typeof pretty>): Run[] {
  if (!lines || lines.length < 2) return runs;
  // Each line's end in the paragraph's text, past the spaces it broke at.
  const text = runs.map((r) => r.text).join("");
  const cuts: [number, number][] = [];
  let at = 0;
  for (const line of lines.slice(0, -1)) {
    at = text.indexOf(line.text, at) + line.text.length;
    // A line the text breaks itself keeps its own break.
    if (text[at] === "\n") {
      at++;
      continue;
    }
    const gap = /^[ \t]*/.exec(text.slice(at))![0].length;
    cuts.push([at, at + gap]);
    at += gap;
  }
  const out: Run[] = [];
  let pos = 0;
  for (const r of runs) {
    let t = "";
    for (let i = 0; i < r.text.length; i++, pos++) {
      const cut = cuts.find(([from, to]) => pos >= from && pos < to);
      if (cut) {
        if (pos === cut[0]) t += "\n";
      } else {
        if (cuts.some(([from, to]) => from === to && pos === from)) t += "\n";
        t += r.text[i];
      }
    }
    out.push({ ...r, text: t });
  }
  return out;
}
