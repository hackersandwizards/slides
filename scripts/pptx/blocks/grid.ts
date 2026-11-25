export interface GridSlot {
  row: number;
  col: number;
  y: number;
  rowH: number;
}

export interface GridLayout<T> {
  cells: (T & GridSlot)[];
  rowH: number[];
  h: number;
}

/** Places `items` in rows of `cols` columns, each row as tall as its tallest item, separated
 *  vertically by `gapY`. */
export function rowGrid<T extends { h: number }>(
  items: readonly T[],
  cols: number,
  gapY: number,
): GridLayout<T> {
  const rows = Math.ceil(items.length / cols);
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(...items.slice(r * cols, r * cols + cols).map((item) => item.h)),
  );
  let y = 0;
  const cells = items.map((item, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    if (col === 0 && row > 0) y += rowH[row - 1] + gapY;
    return { ...item, row, col, y, rowH: rowH[row] };
  });
  const h = rowH.reduce((sum, rh) => sum + rh, 0) + gapY * (rows - 1);
  return { cells, rowH, h };
}
