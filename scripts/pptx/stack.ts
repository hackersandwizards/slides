import type { Look } from "./look";
import type { Sheet } from "./sheet";
import type { Area } from "./stage";
import type { BoxOpts, Para } from "./text";

/** One paragraph in a vertical column of text boxes, preceded by `gap` inches of space. */
export interface StackItem {
  text: Para;
  o: BoxOpts;
  gap: number;
  maxH?: number;
}

export interface FittedStackBox {
  text: Para;
  o: BoxOpts;
  area: Area;
}

export interface FittedStack {
  k: number;
  boxes: FittedStackBox[];
}

/** Measures `items` inside `area`, shrinks heights and gaps together by one factor `k <= 1` when
 *  they exceed `area.h`, and centres the resulting boxes vertically inside `area`. */
export function fitStack(look: Look, items: readonly StackItem[], area: Area): FittedStack {
  const full = items.map(({ text, o, maxH }) => {
    const h = look.need(text, area.w, o);
    return maxH === undefined ? h : Math.min(maxH, h);
  });
  const firstGap = items.length ? items[0].gap : 0;
  const total = items.reduce((sum, item, i) => sum + item.gap + full[i], 0) - firstGap;
  const k = Math.min(1, area.h / total);
  const heights = full.map((h) => h * k);
  let y = area.y + (area.h - total * k) / 2;
  const boxes = items.map((item, i): FittedStackBox => {
    if (i) y += item.gap * k;
    const box: FittedStackBox = {
      text: item.text,
      o: item.o,
      area: { x: area.x, y, w: area.w, h: heights[i] },
    };
    y += heights[i];
    return box;
  });
  return { k, boxes };
}

/** Measures the total height of a vertical column of `items` set in width `w`. */
export function stackHeight(look: Look, items: readonly StackItem[], w: number): number {
  return items.reduce((h, { text, o, gap }) => h + gap + look.need(text, w, o), 0);
}

/** Draws a vertical column of `items` inside `area`'s x, y and width, returning the total height. */
export function drawStack(
  sheet: Sheet,
  items: readonly StackItem[],
  area: Pick<Area, "x" | "y" | "w">,
): number {
  const { x, y, w } = area;
  return items.reduce((h, { text, o, gap }) => {
    const ph = sheet.need(text, w, o);
    sheet.box(text, { x, y: y + h + gap, w, h: ph }, o);
    return h + gap + ph;
  }, 0);
}
