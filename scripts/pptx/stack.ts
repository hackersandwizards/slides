import type { Look } from "./look";
import type { Sheet } from "./sheet";
import type { Area } from "./stage";
import type { BoxOpts, Para } from "./text";

/** One paragraph in a vertical column of text boxes, preceded by `gap` inches of space. */
export interface StackItem {
  text: Para;
  o: BoxOpts;
  gap: number;
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
