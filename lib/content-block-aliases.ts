import type { ContentBlock } from "../types/slide";

type Block<T extends ContentBlock["type"]> = Extract<ContentBlock, { type: T }>;

/** A search returns -1 for no match. Content blocks use absence for an unlit item. */
export const highlightIndex = (index: number) => (index < 0 ? undefined : index);

/** A `labeled-grid` block as the `cards` block that replaces it. */
export function labeledGridAsCards(block: Block<"labeled-grid">): Block<"cards"> {
  return {
    type: "cards",
    items: block.items.map((item) => ({ title: item.title, text: item.subtitle })),
    highlight: highlightIndex(block.items.findIndex((item) => item.highlighted)),
    columns: (block.columns ?? (block.items.length % 3 === 0 ? 3 : 2)) as 1 | 2 | 3 | 4,
    reveal: block.reveal,
    dense: true,
  };
}

/** A `four-column` block as the `cards` block that replaces it, a list per card. */
export function fourColumnAsCards(block: Block<"four-column">): Block<"cards"> {
  return {
    type: "cards",
    items: block.columns.map((c) => ({ title: c.title, text: c.subtitle, items: c.items })),
    columns: Math.min(Math.max(block.columns.length, 1), 4) as 1 | 2 | 3 | 4,
    dense: true,
  };
}

/** A `pipeline` block as the `flow` block that replaces it, lit at its first `new` stage (the one
 *  in focus; `active` marked those covered before it), else its first `active` one. Its inner
 *  loops (`showLoops`) and stage logos are not drawn. */
export function pipelineAsFlow(block: Block<"pipeline">): Block<"flow"> {
  const fresh = block.stages.findIndex((s) => s.state === "new");
  const lit = fresh < 0 ? block.stages.findIndex((s) => s.state === "active") : fresh;
  const framed =
    block.containerLabel ||
    block.containerLogos?.length ||
    block.containerSideNotes?.length ||
    block.containerFooter;
  return {
    type: "flow",
    steps: block.stages.map((s) => ({ title: s.title })),
    highlight: highlightIndex(lit),
    frame: framed
      ? {
          label: block.containerLabel,
          logos: block.containerLogos,
          notes: block.containerSideNotes,
          footer: block.containerFooter,
        }
      : undefined,
    dense: true,
  };
}
