import { BULLET_INDENT, textWidth } from "../fit";
import { drawSteps, stepsLayout } from "../flow-steps";
import { mixColor } from "../palette";
import { drySheet, type Sheet } from "../sheet";
import { CORNER, spacing } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import type { Block, BlockKind } from "./kind";

/** A flow block as `Flow` draws it: its steps, framed as `Framed` frames them where it names a
 *  frame: the teal dashed frame, its label over the steps, its notes beside them under a rule, its
 *  footer under a line. Draws where `s` is given; returns the height. */
function flowBlock(
  sheet: Sheet,
  b: Block<"flow">,
  a: { x: number; y: number; w: number },
  k: number,
): number {
  const { slide: s, c } = sheet;
  if (!b.frame) {
    const stepsL = stepsLayout(sheet, b, { w: a.w, k });
    if (!sheet.dry) drawSteps(sheet, stepsL, a);
    return stepsL.h;
  }
  const sp = (v: number) => spacing(v, k);
  const { label, notes = [], footer } = b.frame;
  const pad = sp(6);
  const labelH = label ? (13.33 * 1.4 * k) / 72 : 0;
  const noteO: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const noteParas: Para[] = notes.map((t) => ({
    runs: md(t, c),
    bullet: true,
    after: sp(1.5) * 72,
  }));
  // As wide as the longest note, and never more than a third of the frame, so long notes wrap.
  const notesW = notes.length
    ? Math.min(
        a.w / 3,
        Math.max(...notes.map((t) => textWidth(t, noteO))) + BULLET_INDENT / 72 + 0.05,
      )
    : 0;
  const stepsW = a.w - 2 * pad - (notes.length ? notesW + 2 * sp(6) : 0);
  const stepsL = stepsLayout(sheet, b, { w: stepsW, k });
  const stepsH = stepsL.h;
  const notesH = notes.length ? sheet.need(noteParas, notesW, noteO) : 0;
  const rowH = Math.max(stepsH, notesH, notes.length ? sp(16) : 0);
  const footO: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const footH = footer ? sheet.need(footer, a.w - 2 * pad, footO) : 0;
  const h = pad + (label ? labelH + sp(4) : 0) + rowH + (footer ? sp(4) + sp(3) + footH : 0) + pad;
  if (sheet.dry) return h;
  const tint = mixColor(c.teal, c.bg, 0.25);
  s.addShape("round2DiagRect", {
    x: a.x,
    y: a.y,
    w: a.w,
    h,
    rectRadius: Math.min(CORNER, h / 2),
    fill: { color: label ? mixColor(c.teal, c.bg, 0.07) : c.card },
    line: { color: label ? c.teal : tint, width: 1, dashType: "dash" },
  });
  let y = a.y + pad;
  if (label) {
    const m = 10 / 144;
    sheet.rect({ x: a.x + pad, y: y + (labelH - m) / 2, w: m, h: m }, c.teal);
    sheet.box(
      { runs: [caps(label)] },
      { x: a.x + pad + m + sp(2), y, w: a.w - 2 * pad, h: labelH },
      {
        size: 13.33 * k,
        mono: true,
        color: c.teal,
        tracking: 0.06,
        line: 1.4,
        valign: "middle",
      },
    );
    y += labelH + sp(4);
  }
  drawSteps(sheet, stepsL, { x: a.x + pad, y: y + (rowH - stepsH) / 2 });
  if (notes.length) {
    const rx = a.x + pad + stepsW + sp(6);
    s.addShape("line", {
      x: rx,
      y: y + (rowH - sp(16)) / 2,
      w: 0,
      h: sp(16),
      line: { color: tint, width: 0.75 },
    });
    sheet.box(
      noteParas,
      { x: rx + sp(6), y: y + (rowH - notesH) / 2, w: notesW, h: notesH },
      noteO,
    );
  }
  y += rowH;
  if (footer) {
    y += sp(4);
    s.addShape("line", {
      x: a.x + pad,
      y,
      w: a.w - 2 * pad,
      h: 0,
      line: { color: tint, width: 0.75 },
    });
    y += sp(3);
    sheet.box(footer, { x: a.x + pad, y, w: a.w - 2 * pad, h: footH }, footO);
  }
  return h;
}

export const flow: BlockKind<"flow"> = {
  height(look, b, { w, k }) {
    return flowBlock(drySheet(look), b, { x: 0, y: 0, w }, k);
  },
  draw(sheet, b, { area: a, k }) {
    flowBlock(sheet, b, a, k);
  },
};
