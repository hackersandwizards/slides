export function wheelSegmentAngle(count: number, index: number): number {
  return -90 + (360 * (index + 0.5)) / count;
}

/** Labels follow the side of their segment, top to bottom, with ties on the shorter side. */
export function wheelLabelColumns(centres: number[]) {
  const cos = centres.map((angle) => Math.cos((angle * Math.PI) / 180));
  const right = cos.flatMap((value, index) => (value > 1e-6 ? [index] : []));
  const left = cos.flatMap((value, index) => (value < -1e-6 ? [index] : []));
  cos.forEach((value, index) => {
    if (Math.abs(value) <= 1e-6) (right.length <= left.length ? right : left).push(index);
  });
  const bySin = (a: number, b: number) =>
    Math.sin((centres[a] * Math.PI) / 180) - Math.sin((centres[b] * Math.PI) / 180);
  return { left: left.sort(bySin), right: right.sort(bySin) };
}
