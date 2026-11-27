import type { Look } from "../look";
import { mixColor, type Palette, type Surface } from "../palette";
import type { Sheet } from "../sheet";
import { PT, REM, TITLE, spacing, type Area, type Measure, type Place } from "../stage";
import { md, type BoxOpts, type Para } from "../text";
import { rowGrid, type GridSlot } from "./grid";
import type { Block, BlockKind } from "./kind";

export type CardScale = "denseWide" | "dense" | "wide" | "normal";

interface CardStyleSpec {
  gap: number;
  padY: number;
  padX: number;
  inGap: number;
  titleSize: number;
  titleLine: number;
  balanceTitle: boolean;
  textTone: "muted" | "ink";
  textLine: number;
  itemAfter: number;
}

const CARD_STYLES: Record<CardScale, CardStyleSpec> = {
  denseWide: {
    gap: 5,
    padY: 5,
    padX: 5,
    inGap: 1,
    titleSize: 17.33,
    titleLine: 1.4,
    balanceTitle: false,
    textTone: "muted",
    textLine: 1.5,
    itemAfter: 2,
  },
  dense: {
    gap: 5,
    padY: 6,
    padX: 6,
    inGap: 1,
    titleSize: PT.h4,
    titleLine: 1.4,
    balanceTitle: false,
    textTone: "muted",
    textLine: 1.5,
    itemAfter: 2,
  },
  wide: {
    gap: 6,
    padY: 6,
    padX: 6,
    inGap: 5,
    titleSize: PT.lead,
    titleLine: 1.25,
    balanceTitle: true,
    textTone: "ink",
    textLine: 1.375,
    itemAfter: 3,
  },
  normal: {
    gap: 6,
    padY: 8,
    padX: 9,
    inGap: 5,
    titleSize: PT.h3,
    titleLine: 1.25,
    balanceTitle: true,
    textTone: "ink",
    textLine: 1.375,
    itemAfter: 3,
  },
};

export type CardMark =
  { kind: "number"; label: string } | { kind: "tile"; fill: string } | { kind: "rule" };

const MARK_SPACING: Record<CardMark["kind"], number> = {
  number: 16,
  tile: 16,
  rule: 1.5,
};

export interface CardCellLayout {
  surface: Surface;
  mark?: CardMark;
  markH: number;
  title?: Para;
  body: Para[];
  th: number;
  bh: number;
  h: number;
}

export interface CardsLayout {
  cols: number;
  cw: number;
  gap: number;
  padX: number;
  padY: number;
  inner: number;
  inGap: number;
  tileSize: number;
  ruleW: number;
  ruleH: number;
  titleO: BoxOpts;
  textO: BoxOpts;
  numO: BoxOpts;
  cells: (CardCellLayout & GridSlot)[];
  rowH: number[];
  h: number;
}

/** Picks the card sizing preset from its density and column count. */
export function cardScale(dense: boolean, wide: boolean): CardScale {
  if (dense) return wide ? "denseWide" : "dense";
  return wide ? "wide" : "normal";
}

/** Builds the title, body, and number-tile box styles for a card scale preset at scale `k`. */
export function cardTypography(c: Palette, scale: CardScale, k: number) {
  const style = CARD_STYLES[scale];
  const titleO: BoxOpts = {
    size: style.titleSize * k,
    ...TITLE,
    color: c.ink,
    line: style.titleLine,
    tracking: -0.015,
    balance: style.balanceTitle,
  };
  const textO: BoxOpts = {
    size: PT.base * k,
    color: c[style.textTone],
    line: style.textLine,
  };
  const numO: BoxOpts = {
    size: PT.lead * k,
    mono: true,
    bold: true,
    color: c.card,
    align: "center",
    valign: "middle",
    line: 1,
  };
  return { titleO, textO, numO };
}

export function cardBody(
  item: Block<"cards">["items"][number],
  c: Palette,
  afterPt: number,
): Para[] {
  return [
    ...(item.text ? [{ runs: md(item.text, c), after: item.items?.length ? afterPt : 0 }] : []),
    ...(item.items ?? []).map((line) => ({ runs: md(line, c), bullet: true, after: afterPt })),
  ];
}

/** Decides a card's top mark from the block, item index and palette: a numbered tile, an icon's
 *  tile, a short teal rule on non-dense plain cards, or undefined when none is drawn. */
export function cardMark(b: Block<"cards">, index: number, c: Palette): CardMark | undefined {
  if (b.numbered) return { kind: "number", label: String(index + (b.numberFrom ?? 1)) };
  const item = b.items[index];
  if (item.icon) {
    const fill = b.highlight === index ? c.teal : mixColor(c.teal, c.card, 0.07);
    return { kind: "tile", fill };
  }
  return b.dense ? undefined : { kind: "rule" };
}

/** A cards block as `Cards` sets it: the grid, the padding and gaps of each size, a short teal
 *  rule over the title or a number tile, every card in a row as tall as the tallest. */
export function cardsLayout(look: Look, b: Block<"cards">, { w, k }: Measure): CardsLayout {
  const { c } = look;
  const n = b.items.length;
  const cols = b.columns ?? (n === 4 ? 2 : Math.min(n, 3));
  const scale = cardScale(!!b.dense, cols >= 4);
  const style = CARD_STYLES[scale];
  const sp = (v: number) => spacing(v, k);
  const gap = sp(style.gap);
  const padX = sp(style.padX);
  const padY = sp(style.padY);
  const inGap = sp(style.inGap);
  const cw = (w - gap * (cols - 1)) / cols;
  const inner = cw - 2 * padX;
  const afterPt = sp(style.itemAfter) * 72;
  const { titleO, textO, numO } = cardTypography(c, scale, k);
  const measured = b.items.map((it, i): CardCellLayout => {
    const hi = b.highlight === i;
    const mark = cardMark(b, i, c);
    const markH = mark ? sp(MARK_SPACING[mark.kind]) : 0;
    const title: Para | undefined = it.title
      ? { runs: md(it.title, c, { color: hi ? c.teal : c.ink }) }
      : undefined;
    const body = cardBody(it, c, afterPt);
    const th = title ? look.need(title, inner, titleO) : 0;
    const bh = body.length ? look.need(body, inner, textO) : 0;
    const parts = [markH, th, bh].filter(Boolean);
    const h = parts.reduce((x, y) => x + y, 0) + inGap * (parts.length - 1) + 2 * padY;
    return { surface: hi ? c.litCard : c.plainCard, mark, markH, title, body, th, bh, h };
  });
  const grid = rowGrid(measured, cols, gap);
  return {
    cols,
    cw,
    gap,
    padX,
    padY,
    inner,
    inGap,
    tileSize: sp(16),
    ruleW: 4 * REM * k,
    ruleH: sp(1.5),
    titleO,
    textO,
    numO,
    cells: grid.cells,
    rowH: grid.rowH,
    h: grid.h,
  };
}

/** Draws a measured cards grid at `at`: each card surface, optional top mark, title and body. */
export function drawCards(sheet: Sheet, layout: CardsLayout, at: Place): void {
  const { c } = sheet;
  const drawMark = (mark: CardMark, x: number, y: number) => {
    if (mark.kind === "rule") {
      sheet.rect({ x, y, w: layout.ruleW, h: layout.ruleH }, c.teal);
      return;
    }
    // `NumberTile` lg: the number white on teal, or an icon's soft tile.
    const tile: Area = { x, y, w: layout.tileSize, h: layout.tileSize };
    sheet.rounded(tile, { fill: mark.kind === "number" ? c.teal : mark.fill }, 10 / 144);
    if (mark.kind === "number") sheet.box({ runs: [{ text: mark.label }] }, tile, layout.numO);
  };
  let rowY = at.y;
  for (const cell of layout.cells) {
    if (cell.col === 0 && cell.row > 0) rowY += layout.rowH[cell.row - 1] + layout.gap;
    const x = at.x + cell.col * (layout.cw + layout.gap);
    sheet.card({ x, y: rowY, w: layout.cw, h: cell.rowH }, cell.surface);
    const ix = x + layout.padX;
    let y = rowY + layout.padY;
    if (cell.mark) {
      drawMark(cell.mark, ix, y);
      y += cell.markH + layout.inGap;
    }
    if (cell.title) {
      sheet.box(cell.title, { x: ix, y, w: layout.inner, h: cell.th }, layout.titleO);
      y += cell.th + layout.inGap;
    }
    if (cell.body.length)
      sheet.box(cell.body, { x: ix, y, w: layout.inner, h: cell.bh }, layout.textO);
  }
}

export const cards: BlockKind<"cards"> = {
  height(look, b, m) {
    return cardsLayout(look, b, m).h;
  },
  draw(sheet, b, { area, k }) {
    drawCards(sheet, cardsLayout(sheet, b, { w: area.w, k }), area);
  },
};
