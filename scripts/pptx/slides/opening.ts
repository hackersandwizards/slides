import type { TitleSlide } from "../../../types/slide";
import { speakerLine } from "../../../lib/title-slide";
import { linkLabel, qrAlt } from "../../../lib/link-labels";
import { textWidth } from "../fit";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, BOTTOM, CW, PT, LEADING } from "../stage";
import { caps, literal, type Para, type BoxOpts } from "../text";

/** A talk's opening as TitleSlide draws it, measured off the print route: kicker, name and title on
 *  the left, centred above the bottom row and kept 2rem clear of it, where speakers and event stand
 *  beside the QR code and its link. */
export function opening(sheet: Sheet, d: TitleSlide) {
  const lang = d.lang ?? sheet.lang;
  const { c } = sheet;
  const qr = 256 / 144;
  const rowH = d.qr ? 324 / 144 : 119 / 144;
  const rowY = BOTTOM - rowH;
  const headEnd = rowY - 43 / 144;
  // Each line of the heading with its options and the gap above it.
  const lines: [Para, BoxOpts, number][] = [
    ...(d.kicker
      ? [
          [
            { runs: [caps(d.kicker)] },
            { size: PT.base, mono: true, color: c.teal, tracking: 0.06 },
            0,
          ],
        ]
      : []),
    ...(d.name
      ? [
          [
            literal(d.name),
            { size: 32, mono: true, bold: true, color: c.teal, tracking: -0.025 },
            22 / 144,
          ],
        ]
      : []),
    [
      literal(d.title),
      {
        size: PT.s8,
        mono: true,
        bold: true,
        color: c.ink,
        line: LEADING.display,
        floor: 0.5,
        tracking: -0.04,
        balance: true,
      },
      d.name ? 34 / 144 : 22 / 144,
    ],
    ...(d.subtitle ? [[literal(d.subtitle), { size: PT.lead, color: c.muted }, 43 / 144]] : []),
  ] as [Para, BoxOpts, number][];
  // A heading taller than the space above the bottom row shrinks to fit it, as the fit guard does.
  const full = lines.map(([text, o]) => Math.min(3, sheet.need(text, CW, o)));
  const total = lines.reduce((sum, [, , gap], i) => sum + gap + full[i], 0) - lines[0][2];
  const k = Math.min(1, (headEnd - TOP) / total);
  const heights = full.map((h) => h * k);
  let y = TOP + (headEnd - TOP - total * k) / 2;
  lines.forEach(([text, o, gap], i) => {
    if (i) y += gap * k;
    sheet.box(text, { x: EDGE, y, w: CW, h: heights[i] }, o);
    y += heights[i];
  });
  const mid = rowY + rowH / 2;
  const label = d.qr && `↗ ${linkLabel(d.qr.href)}`;
  const colW = label ? Math.max(qr, textWidth(label, { size: PT.base, mono: true }) + 0.1) : 0;
  const textW = CW - (colW && colW + 0.5);
  const speakers = d.speakers?.length ? literal(speakerLine(d, lang)) : undefined;
  const left = (speakers ? 53 / 144 : 0) + (d.event ? (speakers ? 17 / 144 : 0) + 49 / 144 : 0);
  let ly = mid - left / 2;
  if (speakers) {
    sheet.box(
      speakers,
      { x: EDGE, y: ly, w: textW, h: 53 / 144 },
      {
        size: PT.h3,
        mono: true,
        bold: true,
        color: c.ink,
      },
    );
    ly += 70 / 144;
  }
  if (d.event)
    sheet.box(
      literal(d.event),
      { x: EDGE, y: ly, w: textW, h: 49 / 144 },
      { size: PT.base, color: c.muted },
    );
  if (d.qr && label) {
    const colX = W - EDGE - colW;
    sheet.picture(
      d.qr.src,
      { x: colX + (colW - qr) / 2, y: rowY, w: qr, h: qr },
      {
        alt: qrAlt(d.qr.href, lang),
        href: d.qr.href,
      },
    );
    sheet.box(
      { runs: [{ text: label, options: { hyperlink: { url: d.qr.href } } }] },
      { x: colX, y: rowY + qr + 12 / 144, w: colW, h: 52 / 144 },
      { size: PT.base, mono: true, color: c.teal, align: "center" },
    );
  }
}
