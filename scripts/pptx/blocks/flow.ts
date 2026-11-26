import { BULLET_INDENT, textWidth } from "../fit";
import { drawSteps, stepsLayout, type StepsLayout } from "../flow-steps";
import type { Look } from "../look";
import { mixColor, type Surface } from "../palette";
import type { Sheet } from "../sheet";
import { CORNER, spacing, type Measure, type Place } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import type { Block, BlockKind } from "./kind";

export type FramedFlow = Block<"flow"> & { frame: NonNullable<Block<"flow">["frame"]> };

export interface FlowNotesLayout {
  paras: Para[];
  o: BoxOpts;
  w: number;
  h: number;
}

export interface FlowFrameLayout {
  k: number;
  w: number;
  pad: number;
  tint: string;
  surface: Surface;
  label?: string;
  labelH: number;
  labelO: BoxOpts;
  steps: StepsLayout;
  stepsW: number;
  notes: FlowNotesLayout;
  rowH: number;
  footer?: string;
  footH: number;
  footO: BoxOpts;
  h: number;
}

/** Measures the optional side notes column of a framed flow: as wide as the longest note,
 *  capped at a third of the frame width so long notes wrap. */
export function flowNotes(
  look: Look,
  notes: readonly string[],
  { w, k }: Measure,
): FlowNotesLayout {
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  const o: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const paras: Para[] = notes.map((t) => ({ runs: md(t, c), bullet: true, after: sp(1.5) * 72 }));
  if (!notes.length) return { paras, o, w: 0, h: 0 };
  // As wide as the longest note, and never more than a third of the frame, so long notes wrap.
  const nw = Math.min(
    w / 3,
    Math.max(...notes.map((t) => textWidth(t, o))) + BULLET_INDENT / 72 + 0.05,
  );
  return { paras, o, w: nw, h: look.need(paras, nw, o) };
}

/** Measures a framed flow block as `Framed` frames it: the teal dashed frame, its label over the
 *  steps, its notes beside them under a rule, and its footer under a line. */
export function flowFrameLayout(look: Look, b: FramedFlow, { w, k }: Measure): FlowFrameLayout {
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  const { label, notes: rawNotes = [], footer } = b.frame;
  const pad = sp(6);
  const tint = mixColor(c.teal, c.bg, 0.25);
  const header = label
    ? { h: (13.33 * 1.4 * k) / 72, surface: { fill: mixColor(c.teal, c.bg, 0.07), line: c.teal } }
    : { h: 0, surface: { fill: c.card, line: tint } };
  const labelO: BoxOpts = {
    size: 13.33 * k,
    mono: true,
    color: c.teal,
    tracking: 0.06,
    line: 1.4,
    valign: "middle",
  };
  const notes = flowNotes(look, rawNotes, { w, k });
  const hasNotes = notes.paras.length > 0;
  const stepsW = w - 2 * pad - (hasNotes ? notes.w + 2 * sp(6) : 0);
  const steps = stepsLayout(look, b, { w: stepsW, k });
  const rowH = Math.max(steps.h, notes.h, hasNotes ? sp(16) : 0);
  const footO: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const footH = footer ? look.need(footer, w - 2 * pad, footO) : 0;
  const h =
    pad + (label ? header.h + sp(4) : 0) + rowH + (footer ? sp(4) + sp(3) + footH : 0) + pad;
  return {
    k,
    w,
    pad,
    tint,
    surface: header.surface,
    label,
    labelH: header.h,
    labelO,
    steps,
    stepsW,
    notes,
    rowH,
    footer,
    footH,
    footO,
    h,
  };
}

/** Draws a framed flow's side divider rule and notes column starting at `at`. */
export function drawFlowNotes(sheet: Sheet, layout: FlowFrameLayout, at: Place): void {
  const { k, tint, notes, rowH } = layout;
  if (!notes.paras.length) return;
  const sp = (v: number) => spacing(v, k);
  const rx = at.x + sp(6);
  sheet.slide.addShape("line", {
    x: rx,
    y: at.y + (rowH - sp(16)) / 2,
    w: 0,
    h: sp(16),
    line: { color: tint, width: 0.75 },
  });
  sheet.box(
    notes.paras,
    { x: rx + sp(6), y: at.y + (rowH - notes.h) / 2, w: notes.w, h: notes.h },
    notes.o,
  );
}

/** Draws a framed flow's horizontal rule and footer text below the steps row at `at`. */
export function drawFlowFooter(sheet: Sheet, layout: FlowFrameLayout, at: Place): void {
  const { k, w, pad, tint, footer, footH, footO } = layout;
  if (!footer) return;
  const sp = (v: number) => spacing(v, k);
  const lineY = at.y + sp(4);
  sheet.slide.addShape("line", {
    x: at.x,
    y: lineY,
    w: w - 2 * pad,
    h: 0,
    line: { color: tint, width: 0.75 },
  });
  sheet.box(footer, { x: at.x, y: lineY + sp(3), w: w - 2 * pad, h: footH }, footO);
}

/** Draws a measured framed flow block at `at`: the dashed frame, optional label, steps, optional
 *  side notes with divider rule, and optional footer under a rule. */
export function drawFlowFrame(sheet: Sheet, layout: FlowFrameLayout, at: Place): void {
  const { k, w, pad, surface, label, labelH, labelO, steps, stepsW, rowH, h } = layout;
  const sp = (v: number) => spacing(v, k);
  sheet.slide.addShape("round2DiagRect", {
    x: at.x,
    y: at.y,
    w,
    h,
    rectRadius: Math.min(CORNER, h / 2),
    fill: { color: surface.fill },
    line: { color: surface.line, width: 1, dashType: "dash" },
  });
  let y = at.y + pad;
  if (label) {
    const m = 10 / 144;
    sheet.rect({ x: at.x + pad, y: y + (labelH - m) / 2, w: m, h: m }, sheet.c.teal);
    sheet.box(
      { runs: [caps(label)] },
      { x: at.x + pad + m + sp(2), y, w: w - 2 * pad, h: labelH },
      labelO,
    );
    y += labelH + sp(4);
  }
  drawSteps(sheet, steps, { x: at.x + pad, y: y + (rowH - steps.h) / 2 });
  drawFlowNotes(sheet, layout, { x: at.x + pad + stepsW, y });
  drawFlowFooter(sheet, layout, { x: at.x + pad, y: y + rowH });
}

/** A flow block as `Flow` draws it: its steps, framed as `Framed` frames them where it names a
 *  frame. */
export const flow: BlockKind<"flow"> = {
  height(look, b, m) {
    if (!b.frame) return stepsLayout(look, b, m).h;
    return flowFrameLayout(look, { ...b, frame: b.frame }, m).h;
  },
  draw(sheet, b, { area, k }) {
    if (!b.frame) {
      drawSteps(sheet, stepsLayout(sheet, b, { w: area.w, k }), area);
      return;
    }
    drawFlowFrame(sheet, flowFrameLayout(sheet, { ...b, frame: b.frame }, { w: area.w, k }), area);
  },
};
