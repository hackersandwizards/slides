import type { ContentBlock } from "../../../types/slide";
import type { Look } from "../look";
import type { Palette } from "../palette";
import type { Sheet } from "../sheet";
import { PT, type Area, type Measure } from "../stage";
import type { BoxOpts } from "../text";

export type Block<K extends ContentBlock["type"]> = Extract<ContentBlock, { type: K }>;

export interface Slot {
  area: Area;
  k: number;
  centered: boolean;
}

export interface BlockKind<K extends ContentBlock["type"]> {
  height?(look: Look, b: Block<K>, m: Measure): number;
  draw(sheet: Sheet, b: Block<K>, slot: Slot): void;
}

export const bodyO = (c: Palette, k: number, extra: Partial<BoxOpts> = {}): BoxOpts => ({
  size: PT.base * k,
  color: c.ink,
  ...extra,
});
