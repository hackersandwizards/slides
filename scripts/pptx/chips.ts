import { textWidth } from "./fit";
import type { Sheet } from "./sheet";
import type { Area, Place } from "./stage";
import { plain } from "./text";

export interface Chip {
  text: string;
  size: number;
  fill: string;
  color: string;
  mono?: boolean;
}

export interface ChipRow {
  labels: Pick<Chip, "text" | "fill">[];
  size: number;
  color: string;
  gap: number;
}

/** A chip's text width in inches per point of size, in the face a chip sets it in. */
export const chipAdvance = (text: string, mono: boolean) =>
  textWidth(text, { size: 1, mono, bold: mono });

export const chipWidth = ({ text, size, mono = true }: Chip) =>
  chipAdvance(text, mono) * size + 0.3;

/** The type size at which a row of chips in the sans face `gap` apart fits `width`: `size`, or
 *  smaller where the row would run past it, down to half of it, past which it warns. */
function fitChipRow({ labels, size, gap }: ChipRow, width: number) {
  const texts = labels.map((label) => label.text);
  const fixed = texts.length * 0.3 + (texts.length - 1) * gap;
  const advances = texts.map((t) => chipAdvance(t, false));
  const per = advances.reduce((sum, advance) => sum + advance, 0);
  const fit = (width - fixed) / per;
  const warning =
    fit < size / 2 ? `chips ${texts.join(", ")}: wider than the slide holds` : undefined;
  return { advances, size: Math.max(size / 2, Math.min(size, fit)), warning };
}

export function layoutChipRow(row: ChipRow, origin: number, width: number) {
  const { advances, size, warning } = fitChipRow(row, width);
  const { color, gap } = row;
  let x = origin;
  const cells = row.labels.map((label, i) => {
    const chip = { ...label, size, color, mono: false };
    const w = advances[i] * size + 0.3;
    const cell = { chip, x, w };
    x += w + gap;
    return cell;
  });
  return { cells, size, warning };
}

type ChipRowLayout = ReturnType<typeof layoutChipRow>;

export function drawChipRow(
  sheet: Sheet,
  { cells, warning }: ChipRowLayout,
  drawCell: (cell: ChipRowLayout["cells"][number], index: number) => void,
) {
  if (warning) sheet.warn(warning);
  cells.forEach(drawCell);
}

export function chipArea(chip: Chip, { x, y }: Place, w = chipWidth(chip)): Area {
  return { x, y, w, h: (chip.size * 1.9) / 72 };
}

export function drawChip(
  sheet: Sheet,
  { text, size, fill, color, mono = true }: Chip,
  area: Area,
): void {
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
}
