import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { drawStack, stackHeight, type StackItem } from "../stack";
import { LEADING, PT, REM, TITLE, type Measure, type Place } from "../stage";
import { caps, md, type BoxOpts } from "../text";
import type { Block, BlockKind } from "./kind";

export interface PositionsLayout {
  w: number;
  xOffset: number;
  cw: number;
  gap: number;
  pad: number;
  inner: number;
  cardH: number;
  resGap: number;
  sides: readonly [StackItem[], StackItem[]];
  resolution: StackItem[];
  h: number;
}

/** Two stances and their resolution as the web's `Positions`: in a 72 rem column, each stance on
 *  a card under its holder's name, its quote under it, then the middle word and the resolution as
 *  a display line, centred. Returns the measured layout and total height `h` at scale `m.k`. */
export function positionsLayout(
  look: Look,
  b: Block<"positions">,
  { w: areaW, k }: Measure,
): PositionsLayout {
  const { c } = look;
  const rem = REM * k;
  const w = Math.min(areaW, 72 * rem);
  const xOffset = (areaW - w) / 2;
  const [gap, pad] = [2 * rem, 2 * rem];
  const cw = (w - gap) / 2;
  const inner = cw - 2 * pad;
  const nameO: BoxOpts = { size: PT.sm * k, mono: true, color: c.muted, tracking: 0.06, line: 1.4 };
  const stanceO: BoxOpts = { size: 32 * k, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const quoteO: BoxOpts = { size: PT.h4 * k, color: c.muted, line: 1.375 };
  const resO: BoxOpts = {
    size: 32 * k,
    mono: true,
    bold: true,
    color: c.ink,
    line: LEADING.display,
    tracking: -0.04,
    align: "center",
  };
  const sideItems = (sd: Block<"positions">["left"]): StackItem[] => [
    { text: { runs: [caps(sd.name)] }, o: nameO, gap: 0 },
    { text: { runs: [{ text: sd.stance }] }, o: stanceO, gap: rem },
    { text: { runs: md(`“${sd.quote}”`, c) }, o: quoteO, gap: 1.5 * rem },
  ];
  const sides: readonly [StackItem[], StackItem[]] = [sideItems(b.left), sideItems(b.right)];
  const cardH = Math.max(...sides.map((items) => stackHeight(look, items, inner))) + 2 * pad;
  const resolution: StackItem[] = [
    ...(b.middle
      ? [{ text: { runs: [caps(b.middle)] }, o: { ...nameO, align: "center" as const }, gap: 0 }]
      : []),
    { text: { runs: md(b.resolution, c), balance: true }, o: resO, gap: b.middle ? rem : 0 },
  ];
  const resGap = 3 * rem;
  const resH = stackHeight(look, resolution, w);
  const h = cardH + resGap + resH;
  return { w, xOffset, cw, gap, pad, inner, cardH, resGap, sides, resolution, h };
}

/** Draws a measured positions block at `at`: the two stance cards with their stacked text, then
 *  the centred resolution stack below them. */
export function drawPositions(sheet: Sheet, layout: PositionsLayout, at: Place): void {
  const { w, xOffset, cw, gap, pad, inner, cardH, resGap, sides, resolution } = layout;
  const x0 = at.x + xOffset;
  sides.forEach((items, i) => {
    const x = x0 + i * (cw + gap);
    sheet.card({ x, y: at.y, w: cw, h: cardH }, sheet.c.plainCard, "small");
    drawStack(sheet, items, { x: x + pad, y: at.y + pad, w: inner });
  });
  drawStack(sheet, resolution, { x: x0, y: at.y + cardH + resGap, w });
}

export const positionsKind: BlockKind<"positions"> = {
  height(look, b, m) {
    return positionsLayout(look, b, m).h;
  },
  draw(sheet, b, { area, k }) {
    drawPositions(sheet, positionsLayout(sheet, b, { w: area.w, k }), area);
  },
};
