import type { Sheet } from "./sheet";
import type { Area } from "./stage";

export interface RowBand {
  what: string;
  n: number;
  cap: number;
  floor: number;
}

export function cellAreas(n: number, a: Area, gap: number): Area[] {
  const w = (a.w - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: a.x + i * (w + gap), y: a.y, w, h: a.h }));
}

/** Each of `n` rows' share of `room`, at most `cap`; below `floor` the rows run past the slide,
 *  which warns. */
export function rowShare(sheet: Sheet, { what, n, cap, floor }: RowBand, room: number): number {
  const share = Math.min(cap, room / n);
  if (share < floor) sheet.warn(`${what}: ${n} rows taller than the slide holds`);
  return Math.max(floor, share);
}
