import type { Area } from "./stage";

export function cellAreas(n: number, a: Area, gap: number): Area[] {
  const w = (a.w - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: a.x + i * (w + gap), y: a.y, w, h: a.h }));
}
