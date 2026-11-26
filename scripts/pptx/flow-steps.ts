import { spansOf, textWidth } from "./fit";
import { longest } from "./lines";
import type { Look } from "./look";
import type { Palette } from "./palette";
import type { Sheet } from "./sheet";
import { PT, REM, TITLE, spacing, type Measure, type Place } from "./stage";
import type { StackItem } from "./stack";
import { caps, md, type BoxOpts, type Para } from "./text";

/** A step of `FlowSteps`: the flow block's, a pipeline's or a process slide's node. */
export interface FlowStep {
  title: string;
  text?: string;
  label?: string;
  subtitle?: string;
  badge?: string;
  dim?: boolean;
  numbered?: false;
  tone?: "red" | "green";
}

/** Input to `stepsLayout`: the steps plus optional active highlight, loop label, and dense flag. */
export interface Steps {
  steps: FlowStep[];
  highlight?: number;
  loop?: string;
  dense?: boolean;
}

export interface StepTone {
  tone: string;
  accent: string;
  titleColor: string;
  textColor: string;
}

export interface StepBox {
  text: Para;
  o: BoxOpts;
  y: number;
  w: number;
  h: number;
}

export interface FlowStepLayout {
  cx: number;
  tileY: number;
  tile: number;
  tileFill: string;
  tileBorder?: { color: string; width: number };
  mark?: string;
  markO: BoxOpts;
  boxes: StepBox[];
}

export interface StepsLayout {
  k: number;
  colW: number;
  tile: number;
  loopH: number;
  loop?: string;
  steps: FlowStepLayout[];
  h: number;
}

/** Decides whether labels fit inside step tiles (`<= 4` chars) and computes each step's tile mark
 *  (its short label, its 1-based sequence number unless any label contains a digit or the step sets
 *  `numbered: false`, or undefined). */
export function stepMarks(steps: readonly FlowStep[]): {
  inTile: boolean;
  marks: (string | undefined)[];
} {
  const inTile = steps.every((st) => (st.label?.length ?? 0) <= 4);
  const counted = !steps.some((st) => /\d/.test(st.label ?? ""));
  let count = 0;
  const marks = steps.map((st) => {
    const n = st.numbered === false ? undefined : ++count;
    if (st.label && inTile) return st.label;
    return counted && n !== undefined ? String(n) : undefined;
  });
  return { inTile, marks };
}

/** Resolves a step's colours from its `dim`, `tone`, and active highlight state. */
export function stepTone(step: FlowStep, active: boolean, c: Palette): StepTone {
  const tone = step.dim ? c.muted : step.tone ? c[step.tone] : c.ink;
  const accent = step.dim ? c.muted : c.teal;
  return {
    tone,
    accent,
    titleColor: active ? c.teal : tone,
    textColor: step.dim ? c.muted : c.ink,
  };
}

/** Width of a flow step's text box: at least `inner`, expanding up to `colW` for wide words. */
export function stepBoxWidth(item: StackItem, inner: number, colW: number): number {
  // A word wider than the text column, such as a path in a chip, stands past it into the
  // step's padding, as the web's chip does.
  return Math.min(colW, Math.max(inner, longest(spansOf(item.text, item.o, 1)) / 72 + 0.02));
}

/** Builds the subtitle, body text, and badge stack items under a step's title. */
export function stepBodyItems(st: FlowStep, c: Palette, k: number): StackItem[] {
  const sp = (v: number) => spacing(v, k);
  const { accent, textColor } = stepTone(st, false, c);
  const textO: BoxOpts = { size: PT.base * k, color: c.ink, line: 1.375, align: "center" };
  return [
    ...(st.subtitle
      ? [
          {
            text: { runs: md(st.subtitle, c, { color: accent }), bold: true, balance: true },
            o: textO,
            gap: sp(2),
          },
        ]
      : []),
    ...(st.text
      ? [
          {
            text: { runs: md(st.text, c, { color: textColor }) },
            o: textO,
            gap: sp(3),
          },
        ]
      : []),
    ...(st.badge
      ? [{ text: { runs: md(st.badge, c, { color: accent }), bold: true }, o: textO, gap: sp(3) }]
      : []),
  ];
}

/** Builds the shared title, above-tile label, and tile-mark text styles for a flow steps row. */
export function stepsTypography(c: Palette, input: Steps, k: number) {
  const dense = !!input.dense;
  const narrow = input.steps.length >= 6;
  const titleO: BoxOpts = {
    size: (dense || narrow ? PT.h4 : PT.h3) * k,
    ...TITLE,
    color: c.ink,
    line: 1.25,
    tracking: -0.015,
    align: "center",
    balance: true,
  };
  const labelO: BoxOpts = {
    size: PT.h4 * k,
    color: c.ink,
    mono: true,
    tracking: 0.06,
    line: 1.4,
    align: "center",
  };
  const markBase: BoxOpts = {
    size: (dense ? 17.33 : PT.h3) * k,
    mono: true,
    bold: true,
    color: c.ink,
    align: "center",
    valign: "middle",
    line: 1,
    floor: 0.5,
  };
  return { titleO, labelO, markBase };
}

/** Steps on one line as the web's `FlowSteps` draws them: a tile each, numbered unless a label
 *  counts already, a grey line with an arrowhead from tile to tile, the title, subtitle, text and
 *  badge centred under the tile, and a `loop` back above, labelled when non-empty. */
export function stepsLayout(look: Look, input: Steps, { w, k }: Measure): StepsLayout {
  const { c } = look;
  const { steps, highlight, loop, dense = false } = input;
  const sp = (v: number) => spacing(v, k);
  const colW = w / steps.length;
  const inner = colW - 2 * sp(steps.length >= 6 ? 2 : 5);
  const tile = sp(dense ? 10 : 24);
  const { inTile, marks } = stepMarks(steps);
  const loopH = loop === undefined ? 0 : sp(loop ? 24 : 16) + sp(2);
  const { titleO, labelO, markBase } = stepsTypography(c, input, k);
  const placed = steps.map((st, i): FlowStepLayout => {
    const on = highlight === i;
    const colors = stepTone(st, on, c);
    const labelAbove = inTile ? undefined : st.label;
    const items: StackItem[] = [
      ...(labelAbove
        ? [{ text: { runs: [caps(labelAbove, { color: colors.accent })] }, o: labelO, gap: sp(5) }]
        : []),
      {
        text: { runs: md(st.title, c, { color: colors.titleColor }) },
        o: titleO,
        gap: sp(dense ? 2 : labelAbove ? 3 : 7),
      },
      ...stepBodyItems(st, c, k),
    ];
    let y = loopH + tile;
    const boxes = items.map((item): StepBox => {
      const pw = stepBoxWidth(item, inner, colW);
      const ph = look.need(item.text, pw, item.o);
      y += item.gap;
      const box: StepBox = { text: item.text, o: item.o, y, w: pw, h: ph };
      y += ph;
      return box;
    });
    return {
      cx: (i + 0.5) * colW,
      tileY: loopH,
      tile,
      tileFill: on ? c.teal : c.bg,
      tileBorder: on ? undefined : { color: c.muted, width: 2 * k },
      mark: marks[i],
      markO: { ...markBase, color: on ? c.card : colors.tone },
      boxes,
    };
  });
  const h = placed.reduce((max, step) => {
    const last = step.boxes[step.boxes.length - 1];
    return Math.max(max, last.y + last.h);
  }, 0);
  return { k, colW, tile, loopH, loop, steps: placed, h };
}

/** Draws one measured flow step at `at`: its centred text boxes, tile, and optional tile mark. */
export function drawStep(sheet: Sheet, step: FlowStepLayout, at: Place): void {
  const cx = at.x + step.cx;
  const tileY = at.y + step.tileY;
  for (const box of step.boxes)
    sheet.box(box.text, { x: cx - box.w / 2, y: at.y + box.y, w: box.w, h: box.h }, box.o);
  const tx = cx - step.tile / 2;
  sheet.slide.addShape("roundRect", {
    x: tx,
    y: tileY,
    w: step.tile,
    h: step.tile,
    rectRadius: 10 / 144,
    fill: { color: step.tileFill },
    line: step.tileBorder ?? { type: "none" },
  });
  if (step.mark !== undefined)
    sheet.box(
      { runs: [{ text: step.mark }] },
      { x: tx, y: tileY, w: step.tile, h: step.tile },
      step.markO,
    );
}

/** Draws the grey connector line and arrowhead from a step's tile centre `from` toward the next. */
export function drawConnector(sheet: Sheet, layout: StepsLayout, from: Place): void {
  const { slide: s, c } = sheet;
  const sp = (v: number) => spacing(v, layout.k);
  // The line from this tile to the arrowhead, which stops `--slide-arrow-inset` short of the
  // next tile's centre.
  const head = { w: sp(6), h: sp(7) };
  const end = from.x + layout.colW - 4 * REM * layout.k;
  s.addShape("line", {
    x: from.x + layout.tile / 2,
    y: from.y,
    w: Math.max(0.01, end - head.w - from.x - layout.tile / 2),
    h: 0,
    line: { color: c.muted, width: 2 * layout.k },
  });
  s.addShape("triangle", {
    x: end - head.w / 2 - head.h / 2,
    y: from.y - head.w / 2,
    w: head.h,
    h: head.w,
    rotate: 90,
    fill: { color: c.muted },
    line: { type: "none" },
  });
}

/** Draws the return loop above the flow steps from the last tile back into the first, with its
 *  optional centred label. */
export function drawLoop(sheet: Sheet, layout: StepsLayout, at: Place): void {
  if (layout.loop === undefined) return;
  const { slide: s, c } = sheet;
  const { k, colW, loop, loopH, steps } = layout;
  const sp = (v: number) => spacing(v, k);
  const tileY = at.y + loopH;
  // Out of the last tile, back along the top and down into the first, with its arrowhead.
  const top = at.y + (loop ? sp(6) : sp(2));
  const [x0, x1] = [at.x + 0.5 * colW, at.x + (steps.length - 1 + 0.5) * colW];
  const line = { color: c.muted, width: 2 * k };
  s.addShape("line", { x: x0, y: top, w: x1 - x0, h: 0, line });
  s.addShape("line", { x: x1, y: top, w: 0, h: tileY - sp(2) - top, line });
  s.addShape("line", { x: x0, y: top, w: 0, h: tileY - sp(6) - top, line });
  s.addShape("triangle", {
    x: x0 - sp(3.5),
    y: tileY - sp(6) - sp(2),
    w: sp(7),
    h: sp(6),
    rotate: 180,
    fill: { color: c.muted },
    line: { type: "none" },
  });
  if (loop) {
    const lw = textWidth(loop, { size: PT.h4 * k, bold: true }) + sp(12);
    // At least a line high, so the fit keeps the label at its size.
    const lh = Math.max(sp(7), (PT.h4 * k * 1.4) / 72);
    sheet.box(
      { runs: [{ text: loop }], bold: true },
      { x: (x0 + x1) / 2 - lw / 2, y: top - lh / 2, w: lw, h: lh },
      { size: PT.h4 * k, color: c.ink, align: "center", valign: "middle", fill: c.bg, line: 1.4 },
    );
  }
}

/** Draws a measured flow steps row at `at`: each step, its connector to the next, and any loop. */
export function drawSteps(sheet: Sheet, layout: StepsLayout, at: Place): void {
  const mid = at.y + layout.loopH + layout.tile / 2;
  layout.steps.forEach((step, i) => {
    drawStep(sheet, step, at);
    if (i < layout.steps.length - 1) drawConnector(sheet, layout, { x: at.x + step.cx, y: mid });
  });
  drawLoop(sheet, layout, at);
}
