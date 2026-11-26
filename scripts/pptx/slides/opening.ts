import type { TitleSlide } from "../../../types/slide";
import { speakerLine } from "../../../lib/title-slide";
import { linkLabel, qrAlt } from "../../../lib/link-labels";
import { textWidth } from "../fit";
import type { Look } from "../look";
import type { Palette } from "../palette";
import type { Sheet } from "../sheet";
import { fitStack, type StackItem } from "../stack";
import { W, EDGE, TOP, BOTTOM, CW, PT, LEADING, type Area } from "../stage";
import { caps, literal, type Para } from "../text";

export interface OpeningMetaBox {
  text: Para;
  area: Area;
}

export interface OpeningQrLayout {
  src: string;
  href: string;
  alt: string;
  label: string;
  image: Area;
  link: Area;
  colW: number;
}

export interface OpeningRowLayout {
  headEnd: number;
  speakers?: OpeningMetaBox;
  event?: OpeningMetaBox;
  qr?: OpeningQrLayout;
}

/** Builds each line of an opening slide's heading with its options and the gap above it. */
export function openingHeading(d: TitleSlide, c: Palette): StackItem[] {
  // Each line of the heading with its options and the gap above it.
  return [
    ...(d.kicker
      ? [
          {
            text: { runs: [caps(d.kicker)] },
            o: { size: PT.base, mono: true, color: c.teal, tracking: 0.06 },
            gap: 0,
            maxH: 3,
          },
        ]
      : []),
    ...(d.name
      ? [
          {
            text: literal(d.name),
            o: { size: 32, mono: true, bold: true, color: c.teal, tracking: -0.025 },
            gap: 22 / 144,
            maxH: 3,
          },
        ]
      : []),
    {
      text: literal(d.title),
      o: {
        size: PT.s8,
        mono: true,
        bold: true,
        color: c.ink,
        line: LEADING.display,
        floor: 0.5,
        tracking: -0.04,
        balance: true,
      },
      gap: d.name ? 34 / 144 : 22 / 144,
      maxH: 3,
    },
    ...(d.subtitle
      ? [
          {
            text: literal(d.subtitle),
            o: { size: PT.lead, color: c.muted },
            gap: 43 / 144,
            maxH: 3,
          },
        ]
      : []),
  ];
}

/** Computes the right-hand QR column's image and link areas for an opening slide. */
export function openingQr(
  qr: NonNullable<TitleSlide["qr"]>,
  lang: Look["lang"],
  rowY: number,
): OpeningQrLayout {
  const size = 256 / 144;
  const label = `↗ ${linkLabel(qr.href)}`;
  const colW = Math.max(size, textWidth(label, { size: PT.base, mono: true }) + 0.1);
  const colX = W - EDGE - colW;
  return {
    src: qr.src,
    href: qr.href,
    alt: qrAlt(qr.href, lang),
    label,
    image: { x: colX + (colW - size) / 2, y: rowY, w: size, h: size },
    link: { x: colX, y: rowY + size + 12 / 144, w: colW, h: 52 / 144 },
    colW,
  };
}

/** Computes the opening slide's bottom row layout (speakers, event, optional QR column) and the
 *  heading bottom boundary above it. */
export function openingRow(look: Look, d: TitleSlide): OpeningRowLayout {
  const lang = d.lang ?? look.lang;
  let rowH = 119 / 144;
  let textW = CW;
  let qr: OpeningQrLayout | undefined;
  if (d.qr) {
    rowH = 324 / 144;
    qr = openingQr(d.qr, lang, BOTTOM - rowH);
    textW = CW - (qr.colW + 0.5);
  }
  const rowY = BOTTOM - rowH;
  const headEnd = rowY - 43 / 144;
  const hasSpeakers = Boolean(d.speakers?.length);
  const left =
    (hasSpeakers ? 53 / 144 : 0) + (d.event ? (hasSpeakers ? 17 / 144 : 0) + 49 / 144 : 0);
  let ly = rowY + rowH / 2 - left / 2;
  let speakers: OpeningMetaBox | undefined;
  if (hasSpeakers) {
    speakers = {
      text: literal(speakerLine(d, lang)),
      area: { x: EDGE, y: ly, w: textW, h: 53 / 144 },
    };
    ly += 70 / 144;
  }
  const event: OpeningMetaBox | undefined = d.event
    ? { text: literal(d.event), area: { x: EDGE, y: ly, w: textW, h: 49 / 144 } }
    : undefined;
  return { headEnd, speakers, event, qr };
}

/** Draws the opening slide's QR picture and its linked label underneath. */
export function drawOpeningQr(sheet: Sheet, qr: OpeningQrLayout): void {
  sheet.picture(qr.src, qr.image, { alt: qr.alt, href: qr.href });
  sheet.box({ runs: [{ text: qr.label, options: { hyperlink: { url: qr.href } } }] }, qr.link, {
    size: PT.base,
    mono: true,
    color: sheet.c.teal,
    align: "center",
  });
}

/** A talk's opening as TitleSlide draws it, measured off the print route: kicker, name and title on
 *  the left, centred above the bottom row and kept 2rem clear of it, where speakers and event stand
 *  beside the QR code and its link. */
export function opening(sheet: Sheet, d: TitleSlide) {
  const { c } = sheet;
  const row = openingRow(sheet, d);
  // A heading taller than the space above the bottom row shrinks to fit it, as the fit guard does.
  const heading = fitStack(sheet, openingHeading(d, c), {
    x: EDGE,
    y: TOP,
    w: CW,
    h: row.headEnd - TOP,
  });
  for (const box of heading.boxes) sheet.box(box.text, box.area, box.o);
  if (row.speakers)
    sheet.box(row.speakers.text, row.speakers.area, {
      size: PT.h3,
      mono: true,
      bold: true,
      color: c.ink,
    });
  if (row.event) sheet.box(row.event.text, row.event.area, { size: PT.base, color: c.muted });
  if (row.qr) drawOpeningQr(sheet, row.qr);
}
