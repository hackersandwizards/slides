import type { Slide } from "../../../types/slide";
import { isOpening } from "../../../lib/title-slide";
import type { Sheet } from "../sheet";
import { H, EDGE, CW, PT, LEADING } from "../stage";
import { literal, type BoxOpts } from "../text";
import { opening } from "./opening";

export function drawTitle(sheet: Sheet, d: Extract<Slide, { type: "title" }>): void {
  if (isOpening(d)) return opening(sheet, d);
  const { c } = sheet;
  const o: BoxOpts = {
    size: PT.display,
    mono: true,
    bold: true,
    color: c.ink,
    align: "center",
    line: LEADING.display,
    floor: 0.5,
    tracking: -0.03,
    balance: true,
  };
  const title = literal(d.title);
  const subtitle = d.subtitle ? literal(d.subtitle) : undefined;
  const th = Math.min(3, sheet.need(title, CW - 1, o));
  const sh = subtitle
    ? Math.min(1.2, sheet.need(subtitle, CW - 2, { size: PT.lead, color: c.ink }))
    : 0;
  const y = (H - th - sh - 0.5) / 2;
  sheet.box(title, { x: EDGE + 0.5, y, w: CW - 1, h: th }, o);
  if (subtitle)
    sheet.box(
      subtitle,
      { x: EDGE + 1, y: y + th + 0.5, w: CW - 2, h: sh },
      {
        size: PT.lead,
        color: c.ink,
        align: "center",
      },
    );
}
