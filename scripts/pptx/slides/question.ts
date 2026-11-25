import type { Slide } from "../../../types/slide";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, BOTTOM, CW, PT, LEADING, REM } from "../stage";
import { literal, type Para, type BoxOpts } from "../text";

export function drawQuestion(sheet: Sheet, d: Extract<Slide, { type: "question" }>): void {
  // As QuestionSlide in print: the headline as a display heading, under it the options as white
  // cards in a 56 rem column, each its letter, its text and its count, centred above the footer band.
  const { c } = sheet;
  const head: BoxOpts = {
    size: PT.s6,
    mono: true,
    bold: true,
    color: c.ink,
    tracking: -0.04,
    line: LEADING.display,
    align: "center",
  };
  const hp: Para = { ...literal(d.headline), balance: true };
  const hh = sheet.need(hp, CW, head);
  const w = Math.min(CW, 56 * REM);
  const oh = 2.5 * REM + (PT.h4 * 1.4) / 72;
  const total = hh + 3.5 * REM + d.options.length * (oh + REM) - REM;
  const top = Math.max(TOP, (BOTTOM - total) / 2);
  sheet.box(hp, { x: EDGE, y: top, w: CW, h: hh }, head);
  const x = (W - w) / 2;
  d.options.forEach((op, i) => {
    const oy = top + hh + 3.5 * REM + i * (oh + REM);
    sheet.card({ x, y: oy, w, h: oh }, sheet.c.plainCard);
    const mid = { valign: "middle" } as const;
    sheet.box(
      literal(op.label),
      { x: x + 1.5 * REM, y: oy, w: 2 * REM, h: oh },
      {
        size: 14,
        mono: true,
        bold: true,
        color: c.muted,
        ...mid,
      },
    );
    sheet.box(
      op.text,
      { x: x + 4.5 * REM, y: oy, w: w - 10 * REM, h: oh },
      {
        size: 17.5,
        color: c.ink,
        line: 1.4,
        ...mid,
      },
    );
    sheet.box(
      literal("0"),
      { x: x + w - 5.5 * REM, y: oy, w: 4 * REM, h: oh },
      {
        size: PT.h4,
        mono: true,
        bold: true,
        color: c.teal,
        align: "right",
        ...mid,
      },
    );
  });
}
