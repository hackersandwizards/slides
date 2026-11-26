import type { QuestionSlide, Slide } from "../../../types/slide";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, BOTTOM, CW, PT, LEADING, REM } from "../stage";
import { literal, type Para, type BoxOpts } from "../text";

/** Measures the display heading and the complete column of answer cards. */
export function questionLayout(look: Look, d: QuestionSlide) {
  // As QuestionSlide in print: the headline as a display heading, under it the options as white
  // cards in a 56 rem column, each its letter, its text and its count, centred above the footer band.
  const { c } = look;
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
  const hh = look.need(hp, CW, head);
  const w = Math.min(CW, 56 * REM);
  const oh = 2.5 * REM + (PT.h4 * 1.4) / 72;
  const total = hh + 3.5 * REM + d.options.length * (oh + REM) - REM;
  const top = Math.max(TOP, (BOTTOM - total) / 2);
  const x = (W - w) / 2;
  const rows = d.options.map((option, i) => {
    const y = top + hh + 3.5 * REM + i * (oh + REM);
    return {
      option,
      card: { x, y, w, h: oh },
      letter: { x: x + 1.5 * REM, y, w: 2 * REM, h: oh },
      answer: { x: x + 4.5 * REM, y, w: w - 10 * REM, h: oh },
      count: { x: x + w - 5.5 * REM, y, w: 4 * REM, h: oh },
    };
  });
  return { heading: { text: hp, area: { x: EDGE, y: top, w: CW, h: hh }, options: head }, rows };
}

type AnswerRow = ReturnType<typeof questionLayout>["rows"][number];

/** Draws a question option with a letter, answer and zero-vote count. */
export function questionRow(sheet: Sheet, row: AnswerRow): void {
  const { c } = sheet;
  sheet.card(row.card, c.plainCard);
  const mid = { valign: "middle" } as const;
  sheet.box(literal(row.option.label), row.letter, {
    size: 14,
    mono: true,
    bold: true,
    color: c.muted,
    ...mid,
  });
  sheet.box(row.option.text, row.answer, {
    size: 17.5,
    color: c.ink,
    line: 1.4,
    ...mid,
  });
  sheet.box(literal("0"), row.count, {
    size: PT.h4,
    mono: true,
    bold: true,
    color: c.teal,
    align: "right",
    ...mid,
  });
}

export function drawQuestion(sheet: Sheet, d: Extract<Slide, { type: "question" }>): void {
  const { heading, rows } = questionLayout(sheet, d);
  sheet.box(heading.text, heading.area, heading.options);
  for (const row of rows) questionRow(sheet, row);
}
