import { labeledGridAsCards, pipelineAsFlow } from "../../lib/content-block-aliases";
import type { ContentBlock } from "../../types/slide";
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

export function kindOf(block: ContentBlock) {
  const type = block.type;
  if (typeof type !== "string") return undefined;
  const redraw = Object.hasOwn(BLOCK_REDRAWN, type)
    ? (BLOCK_REDRAWN[type as keyof typeof BLOCK_REDRAWN] as (b: ContentBlock) => ContentBlock)
    : undefined;
  const drawn = redraw ? redraw(block) : block;
  const kind = registeredKind(drawn.type);
  return kind ? { block: drawn, kind } : undefined;
}

function registeredKind(type: BlockType): BlockKind<BlockType> | undefined {
  if (typeof type !== "string" || !Object.hasOwn(BLOCK_KINDS, type)) return undefined;
  // The table pairs each kind with the discriminant of the block it accepts.
  return BLOCK_KINDS[type as keyof typeof BLOCK_KINDS] as BlockKind<BlockType>;
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

/** Stacks blocks in the area, shrinking them together until they fit, and returns where they end.
 *  Image blocks take the space the others leave. Blocks that leave space stand as the web's body
 *  does, two spacers sharing it 1 to 1.25, so a little above the middle; `tail` is the height of
 *  what follows them in that body, a footer. */
export function blocks(
  sheet: Sheet,
  list: ContentBlock[],
  a: Area,
  centered = false,
  tail = 0,
): number {
  const gap = 0.25;
  let k = 1;
  const fixed = (kk: number) =>
    list
      .filter((block) => !usesRemainingRoom(block))
      .reduce((sum, block) => sum + measuredHeight(sheet, block, { w: a.w, k: kk }), 0);
  const grows = list.filter(usesRemainingRoom).length;
  const room = a.h - tail - gap * (list.length - 1) - grows * 1.5;
  while (k > 0.62 && fixed(k) > room) k -= 0.04;
  if (fixed(k) > room)
    sheet.warn(
      `blocks ${list.map((b) => b.type).join(", ")}: ${(fixed(k) - room).toFixed(2)} in taller than the slide holds`,
    );
  const extra = grows ? (a.h - tail - gap * (list.length - 1) - fixed(k)) / grows : 0;
  const total = fixed(k) + grows * extra + gap * (list.length - 1);
  const free = Math.max(0, a.h - total - tail);
  let y = a.y + (centered ? free / 2 : free / 2.25);
  for (const b of list) {
    const h = usesRemainingRoom(b)
      ? Math.max(1, extra)
      : Math.max(0, Math.min(measuredHeight(sheet, b, { w: a.w, k }), a.y + a.h - tail - y));
    const slot: Slot = { area: { x: a.x, y, w: a.w, h }, k, centered };
    const match = kindOf(b);
    match?.kind.draw(sheet, match.block, slot);
    y += h + gap;
  }
  return y - gap;
}
