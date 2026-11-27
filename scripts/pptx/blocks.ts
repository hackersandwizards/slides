import { labeledGridAsCards, pipelineAsFlow } from "../../lib/content-block-aliases";
import type { ContentBlock, ContentSlide } from "../../types/slide";
import { annotated } from "./blocks/annotated";
import { bars } from "./blocks/bars";
import { transform } from "./blocks/before-after";
import { cards } from "./blocks/cards";
import { code, codeAndText, terminal } from "./blocks/code";
import { fourColumn, twoColumn } from "./blocks/columns";
import { flow } from "./blocks/flow";
import type { Block, BlockKind, Slot } from "./blocks/kind";
import { gallery, image, imageAndGrid, imageSteps, linkedImage, video } from "./blocks/media";
import { numbers } from "./blocks/numbers";
import { positionsKind } from "./blocks/positions";
import { hooks, layers } from "./blocks/rows";
import { table } from "./blocks/table";
import { bullets, callout, paragraph, quote } from "./blocks/text";
import { timeline } from "./blocks/timeline";
import { footerOf, type Footer } from "./chrome";
import type { Look } from "./look";
import type { Sheet } from "./sheet";
import type { Area, Measure } from "./stage";

type BlockType = ContentBlock["type"];
type Kinds = { [K in BlockType]: BlockKind<K> };

const BLOCK_REDRAWN = {
  "labeled-grid": labeledGridAsCards,
  pipeline: pipelineAsFlow,
} satisfies { [K in BlockType]?: (block: Block<K>) => ContentBlock };

export const BLOCK_KINDS = {
  paragraph,
  bullets,
  quote,
  callout,
  table,
  code,
  "annotated-code": code,
  terminal,
  "code-and-text": codeAndText,
  "two-column": twoColumn,
  "four-column": fourColumn,
  hooks,
  layers,
  transform,
  positions: positionsKind,
  cards,
  flow,
  timeline,
  bars,
  numbers,
  image,
  "image-steps": imageSteps,
  gallery,
  "linked-image": linkedImage,
  video,
  "image-and-grid": imageAndGrid,
  annotated,
} satisfies Omit<Kinds, keyof typeof BLOCK_REDRAWN>;

/** Looks up an own string key in `table`, returning `undefined` for non-strings and prototype keys. */
export function tableLookup<T>(table: Record<string, T>, key: unknown): T | undefined {
  return typeof key === "string" && Object.hasOwn(table, key) ? table[key] : undefined;
}

export function kindOf(block: ContentBlock) {
  const redraw = tableLookup(
    BLOCK_REDRAWN as Record<string, (b: ContentBlock) => ContentBlock>,
    block.type,
  );
  const drawn = redraw ? redraw(block) : block;
  const kind = registeredKind(drawn.type);
  return kind ? { block: drawn, kind } : undefined;
}

function registeredKind(type: BlockType): BlockKind<BlockType> | undefined {
  return tableLookup(BLOCK_KINDS as Record<string, BlockKind<BlockType>>, type);
}

function usesRemainingRoom(block: ContentBlock): boolean {
  const kind = registeredKind(block.type);
  return kind !== undefined && kind.height === undefined;
}

// An unknown block has no measured height. The resulting NaN preserves the old stack placement.
function measuredHeight(look: Look, block: ContentBlock, measure: Measure): number {
  const match = kindOf(block);
  return match?.kind.height?.(look, match.block, measure) ?? NaN;
}

export interface BlocksLayout {
  k: number;
  slots: Slot[];
  end: number;
  short: number;
  foot: Footer;
  centered: boolean;
}

/** Measures a content slide's block stack inside `a`, shrinking them together until they fit,
 *  and computes each block's drawing slot, the stack's end `y`, any height shortfall, and its
 *  measured footer. Image blocks take the space the others leave. Blocks that leave space stand as
 *  the web's body does, two spacers sharing it 1 to 1.25, so a little above the middle; `tail` is
 *  the height of what follows them in that body, a footer. */
export function blocksLayout(look: Look, d: ContentSlide, a: Area): BlocksLayout {
  const list = d.content;
  const centered = d.layout === "centered";
  const foot = footerOf(look, d.footer);
  const tail = foot.h && foot.h + 0.1;
  const gap = 0.25;
  let k = 1;
  const fixed = (kk: number) =>
    list
      .filter((block) => !usesRemainingRoom(block))
      .reduce((sum, block) => sum + measuredHeight(look, block, { w: a.w, k: kk }), 0);
  const grows = list.filter(usesRemainingRoom).length;
  const available = a.h - tail - gap * (list.length - 1) - grows * 1.5;
  while (k > 0.62 && fixed(k) > available) k -= 0.04;
  const fixedH = fixed(k);
  const short = fixedH > available ? fixedH - available : 0;
  const extra = grows ? (a.h - tail - gap * (list.length - 1) - fixedH) / grows : 0;
  const total = fixedH + grows * extra + gap * (list.length - 1);
  const free = Math.max(0, a.h - total - tail);
  let y = a.y + (centered ? free / 2 : free / 2.25);
  const slots = list.map((b): Slot => {
    const h = usesRemainingRoom(b)
      ? Math.max(1, extra)
      : Math.max(0, Math.min(measuredHeight(look, b, { w: a.w, k }), a.y + a.h - tail - y));
    const slot: Slot = { area: { x: a.x, y, w: a.w, h }, k, centered };
    y += h + gap;
    return slot;
  });
  return { k, slots, end: y - gap, short, foot, centered };
}

/** Draws a measured stack of blocks into their computed slots and warns when the stack ran taller
 *  than its room. */
export function drawBlocks(sheet: Sheet, list: ContentBlock[], layout: BlocksLayout): void {
  if (layout.short > 0)
    sheet.warn(
      `blocks ${list.map((b) => b.type).join(", ")}: ${layout.short.toFixed(2)} in taller than the slide holds`,
    );
  list.forEach((b, i) => {
    const match = kindOf(b);
    if (match) match.kind.draw(sheet, match.block, layout.slots[i]);
  });
}
