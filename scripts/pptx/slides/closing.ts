import type { ClosingSlide } from "../../../types/slide";
import { header } from "../chrome";
import type { Sheet } from "../sheet";
import { PT, REM, BODY } from "../stage";
import { literal, type BoxOpts } from "../text";
import { drawContact } from "./closing-contact";

/** Discussion questions each have their own card and keep their order. */
export function drawDiscussion(sheet: Sheet, d: ClosingSlide): void {
  const { c } = sheet;
  const y = header(sheet, { headline: d.headline ?? d.line1 ?? sheet.words.discussion });
  // Each seed question on its own card, as the web's: 1.25 rem over and under it, 2 rem
  // beside, 1.5 rem between the cards, the question muted.
  const a = BODY(y);
  const [padY, padX, gap] = [1.25 * REM, 2 * REM, 1.5 * REM];
  const o: BoxOpts = { size: PT.h4, color: c.muted, line: 1.35 };
  const qs = d.seedQuestions ?? [];
  const hs = qs.map((q) => sheet.need(literal(q), a.w - 2 * padX, o));
  const total = hs.reduce((sum, h) => sum + h + 2 * padY, 0) + Math.max(0, qs.length - 1) * gap;
  let qy = a.y + Math.max(0, a.h - total) / 2.25;
  qs.forEach((q, i) => {
    sheet.card({ x: a.x, y: qy, w: a.w, h: hs[i] + 2 * padY }, sheet.c.plainCard);
    sheet.box(literal(q), { x: a.x + padX, y: qy + padY, w: a.w - 2 * padX, h: hs[i] }, o);
    qy += hs[i] + 2 * padY + gap;
  });
}

const CLOSINGS = new Map<ClosingSlide["variant"], typeof drawContact>([
  ["discussion", drawDiscussion],
  ["contact", drawContact],
]);

export function drawClosing(sheet: Sheet, d: ClosingSlide): void {
  const draw = CLOSINGS.get(d.variant) ?? drawContact;
  draw(sheet, d);
}
