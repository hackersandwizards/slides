import type { Area } from "./stage";

export interface RowHeight {
  what: string;
  cap: number;
  floor: number;
}

export function cellAreas(n: number, a: Area, gap: number): Area[] {
  const w = (a.w - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: a.x + i * (w + gap), y: a.y, w, h: a.h }));
}

/** Each of `n` rows' share of `room`, at most `cap`; below `floor` the rows run past the slide,
 *  which warns. */
export function rowShare({ what, cap, floor }: RowHeight, room: number, n: number) {
  const share = Math.min(cap, room / n);
  const warning = share < floor ? `${what}: ${n} rows taller than the slide holds` : undefined;
  return { height: Math.max(floor, share), warning };
}
