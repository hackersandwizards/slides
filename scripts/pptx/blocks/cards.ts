import type { Look } from "../look";
import { mixColor } from "../palette";
import { PT, REM, TITLE, spacing, type Measure } from "../stage";
import { md, type BoxOpts, type Para } from "../text";
import type { Block, BlockKind } from "./kind";

/** A cards block as `Cards` sets it: the grid, the padding and gaps of each size, a short teal
 *  rule over the title or a number tile, every card in a row as tall as the tallest. */
function cardsLayout(look: Look, b: Block<"cards">, { w, k }: Measure) {
  const { c } = look;
  const n = b.items.length;
  const cols = b.columns ?? (n === 4 ? 2 : Math.min(n, 3));
  const wide = cols >= 4;
  const dense = !!b.dense;
  const sp = (v: number) => spacing(v, k);
  const gap = sp(dense ? 5 : 6);
  const [padY, padX] = dense ? (wide ? [5, 5] : [6, 6]) : wide ? [6, 6] : [8, 9];
  const cw = (w - gap * (cols - 1)) / cols;
  const inner = cw - 2 * sp(padX);
  const inGap = sp(dense ? 1 : 5);
  const titleO: BoxOpts = {
    size: (dense ? (wide ? 17.33 : PT.h4) : wide ? PT.lead : PT.h3) * k,
    ...TITLE,
    color: c.ink,
    line: dense ? 1.4 : 1.25,
    tracking: -0.015,
    balance: !dense,
  };
  const textO: BoxOpts = {
    size: PT.base * k,
    color: dense ? c.muted : c.ink,
    line: dense ? 1.5 : 1.375,
  };
  const cells = b.items.map((it, i) => {
    const hi = b.highlight === i;
    const mark = b.numbered || it.icon ? sp(16) : dense ? 0 : sp(1.5);
    const title: Para | undefined = it.title
      ? { runs: md(it.title, c, { color: hi ? c.teal : c.ink }) }
      : undefined;
    const body: Para[] = [
      ...(it.text
        ? [{ runs: md(it.text, c), after: it.items?.length ? sp(dense ? 2 : 3) * 72 : 0 }]
        : []),
      ...(it.items ?? []).map((line) => ({
        runs: md(line, c),
        bullet: true,
        after: sp(dense ? 2 : 3) * 72,
      })),
    ];
    const th = title ? look.need(title, inner, titleO) : 0;
    const bh = body.length ? look.need(body, inner, textO) : 0;
    const parts = [mark, th, bh].filter(Boolean);
    return {
      it,
      hi,
      mark,
      title,
      body,
      th,
      bh,
      h: parts.reduce((x, y) => x + y, 0) + inGap * (parts.length - 1) + 2 * sp(padY),
    };
  });
  const rows = Math.ceil(n / cols);
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(...cells.slice(r * cols, r * cols + cols).map((x) => x.h)),
  );
  const h = rowH.reduce((x, y) => x + y, 0) + gap * (rows - 1);
  return {
    cols,
    cw,
    gap,
    padX: sp(padX),
    padY: sp(padY),
    inner,
    inGap,
    titleO,
    textO,
    cells,
    rowH,
    h,
  };
}

export const cards: BlockKind<"cards"> = {
  height(look, b, m) {
    return cardsLayout(look, b, m).h;
  },
  draw(sheet, b, { area: a, k }) {
    const { c } = sheet;
    const L = cardsLayout(sheet, b, { w: a.w, k });
    let rowY = a.y;
    L.cells.forEach((cell, i) => {
      const [r, col] = [Math.floor(i / L.cols), i % L.cols];
      if (col === 0 && r) rowY += L.rowH[r - 1] + L.gap;
      const x = a.x + col * (L.cw + L.gap);
      sheet.card(
        { x, y: rowY, w: L.cw, h: L.rowH[r] },
        cell.hi ? sheet.c.litCard : sheet.c.plainCard,
      );
      const ix = x + L.padX;
      let y = rowY + L.padY;
      if (b.numbered || cell.it.icon) {
        // `NumberTile` lg: the number white on teal, or an icon's soft tile.
        const solid = b.numbered || cell.hi;
        sheet.rounded(
          { x: ix, y, w: cell.mark, h: cell.mark },
          { fill: solid ? c.teal : mixColor(c.teal, c.card, 0.07) },
          10 / 144,
        );
        if (b.numbered)
          sheet.box(
            { runs: [{ text: String(i + (b.numberFrom ?? 1)) }] },
            { x: ix, y, w: cell.mark, h: cell.mark },
            {
              size: PT.lead * k,
              mono: true,
              bold: true,
              color: c.card,
              align: "center",
              valign: "middle",
              line: 1,
            },
          );
      } else if (cell.mark) sheet.rect({ x: ix, y, w: 4 * REM * k, h: cell.mark }, c.teal);
      if (cell.mark) y += cell.mark + L.inGap;
      if (cell.title) {
        sheet.box(cell.title, { x: ix, y, w: L.inner, h: cell.th }, L.titleO);
        y += cell.th + L.inGap;
      }
      if (cell.body.length) sheet.box(cell.body, { x: ix, y, w: L.inner, h: cell.bh }, L.textO);
    });
  },
};
