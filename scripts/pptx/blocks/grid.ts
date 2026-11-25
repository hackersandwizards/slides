export interface GridSpec {
  cols: number;
  cw: number;
  gapX: number;
  gapY: number;
}

export interface GridCell {
  x: number;
  y: number;
  rowH: number;
}

export interface GridLayout<T> {
  cells: (T & GridCell)[];
  rowH: number[];
  h: number;
}

/** Places `items` left-to-right in `spec.cols` columns where every row is as tall as its tallest
 *  item, returning each item with relative `x`, `y`, and `rowH`, the per-row heights, and total
 *  grid height `h`. */
export function rowGrid<T extends { h: number }>(
  items: readonly T[],
  spec: GridSpec,
): GridLayout<T> {
  const { cols, cw, gapX, gapY } = spec;
  const rows = Math.ceil(items.length / cols);
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(...items.slice(r * cols, r * cols + cols).map((item) => item.h)),
  );
  let y = 0;
  const cells = items.map((item, i) => {
    const r = Math.floor(i / cols);
    const col = i % cols;
    if (col === 0 && r > 0) y += rowH[r - 1] + gapY;
    return { ...item, x: col * (cw + gapX), y, rowH: rowH[r] };
  });
  const h = rows ? rowH.reduce((sum, rh) => sum + rh, 0) + gapY * (rows - 1) : 0;
  return { cells, rowH, h };
}
