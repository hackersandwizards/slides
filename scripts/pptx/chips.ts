import { textWidth } from "./fit";
import type { Sheet } from "./sheet";
import type { Place } from "./stage";
import { plain } from "./text";

export interface Chip {
  text: string;
  size: number;
  fill: string;
  color: string;
  mono?: boolean;
}

export interface ChipRow {
  texts: string[];
  size: number;
  gap: number;
}

/** A chip's text width in inches per point of size, in the face a chip sets it in. */
export const chipAdvance = (text: string, mono: boolean) =>
  textWidth(text, { size: 1, mono, bold: mono });

export const chipWidth = (text: string, size: number, mono: boolean) =>
  chipAdvance(text, mono) * size + 0.3;

/** The type size at which a row of chips in the sans face `gap` apart fits `width`: `size`, or
 *  smaller where the row would run past it, down to half of it, past which it warns. */
export function rowSize(sheet: Sheet, { texts, size, gap }: ChipRow, width: number): number {
  const fixed = texts.length * 0.3 + (texts.length - 1) * gap;
  const per = texts.reduce((sum, t) => sum + chipAdvance(t, false), 0);
  const fit = (width - fixed) / per;
  if (fit < size / 2) sheet.warn(`chips ${texts.join(", ")}: wider than the slide holds`);
  return Math.max(size / 2, Math.min(size, fit));
}

export function chip(
  sheet: Sheet,
  { text, size, fill, color, mono = true }: Chip,
  { x, y }: Place,
): number {
  const w = chipWidth(text, size, mono);
  const area = { x, y, w, h: (size * 1.9) / 72 };
  sheet.rounded(area, { fill }, (size * 1.9) / 144);
  sheet.box({ runs: [{ text: plain(text) }] }, area, {
    size,
    mono,
    bold: mono,
    color,
    align: "center",
    valign: "middle",
    floor: 0.8,
  });
  return w;
}
