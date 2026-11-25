import type { ContentBlock } from "../../types/slide";
import { transform } from "./blocks/before-after";
import { code, codeAndText, terminal } from "./blocks/code";
import { fourColumn, twoColumn } from "./blocks/columns";
import type { BlockKind } from "./blocks/kind";
import { positionsKind } from "./blocks/positions";
import { hooks, layers } from "./blocks/rows";
import { table } from "./blocks/table";
import { bullets, callout, paragraph, quote } from "./blocks/text";

type BlockType = ContentBlock["type"];
type Kinds = { [K in BlockType]: BlockKind<K> };

export const BLOCK_KINDS = {
  paragraph: paragraph,
  bullets: bullets,
  quote: quote,
  callout: callout,
  table: table,
  code: code,
  "annotated-code": code,
  terminal: terminal,
  "code-and-text": codeAndText,
  "two-column": twoColumn,
  "four-column": fourColumn,
  hooks: hooks,
  layers: layers,
  transform: transform,
  positions: positionsKind,
} satisfies Partial<Kinds>;

export function kindOf(block: ContentBlock) {
  if (typeof block.type !== "string" || !Object.hasOwn(BLOCK_KINDS, block.type)) return undefined;
  // The table pairs each kind with the discriminant of the block it accepts.
  const kind = BLOCK_KINDS[block.type as keyof typeof BLOCK_KINDS] as BlockKind<BlockType>;
  return { block, kind };
}
