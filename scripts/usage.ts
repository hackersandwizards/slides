#!/usr/bin/env bun
// The number of a consumer's deck slides using each catalogue entry, which the public engine cannot
// read: `slides-usage <deck.json|-> ...` prints it as JSON for the consumer to publish. A slide drawn
// through a replaced form counts for the entry that replaces it. Exit 1 on a slide no entry draws.
import { readFileSync } from "node:fs";
import { GUIDANCE } from "../catalog/guidance";
import { replacedBy, variantOf } from "../lib/slide-utils";
import type { ContentBlock, Presentation, Slide } from "../types/slide";

/** A block's entry where its anchor is not its type's name; a replaced block counts for its heir. */
const BLOCK_ENTRY: Record<string, string> = {
  annotated: "annotated-image",
  "annotated-code": "code",
  "code-and-text": "code",
  terminal: "terminal-and-hooks",
  hooks: "terminal-and-hooks",
  pipeline: "flow",
  "four-column": "cards",
  "labeled-grid": "cards",
};

/** A block's variant entry, for the blocks the catalogue shows in more than one form. */
function blockVariant(block: ContentBlock): string | undefined {
  switch (block.type) {
    case "cards":
      return block.dense ? "cards-dense" : block.columns === 4 ? "cards-four-columns" : undefined;
    case "numbers":
      if (block.items.length === 1) return "numbers-one-figure";
      return block.items.length > 4 ? "numbers-six-figures" : undefined;
    case "bars":
      return block.bars.some((bar) => bar.from != null) ? "bars-as-ranges" : undefined;
    case "flow":
      return block.frame ? "flow-framed" : undefined;
    case "image-and-grid":
      return block.image.sketch ? "image-and-grid-sketch" : undefined;
  }
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const known = (id: string) => Object.hasOwn(GUIDANCE, id);

/** The catalogue entries a slide uses: its type's or variant's, then one per kind of block. */
export function entriesOf(slide: Slide): string[] {
  const to = replacedBy(slide)?.to ?? slide.type;
  const form = slug(to);
  const variant = form === slide.type && variantOf(slide);
  const entry = [variant && `${form}-${slug(variant)}`, form, to.split(" ")[0], `block-${form}`]
    .filter((id) => id !== false && id !== "")
    .find((id) => known(id as string)) as string | undefined;
  const content = slide.type === "content" ? slide.content : [];
  const blocks = content
    .map((b) => `block-${blockVariant(b) ?? BLOCK_ENTRY[b.type] ?? b.type}`)
    .filter(known);
  if (content.filter((b) => b.type === "image").length > 1) blocks.push("block-two-images");
  return entry ? [...new Set([entry, ...blocks])] : [];
}

if (import.meta.main) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("usage: slides-usage <deck.json|-> ...");
    process.exit(2);
  }
  const counts = new Map<string, number>();
  const unknown: string[] = [];
  let slides = 0;
  for (const path of paths) {
    const deck = JSON.parse(readFileSync(path === "-" ? 0 : path, "utf8")) as Presentation;
    if (!Array.isArray(deck.slides)) {
      console.error(`slides-usage: ${path} is no deck: it has no slides list`);
      process.exit(1);
    }
    deck.slides.forEach((slide, i) => {
      slides++;
      const ids = entriesOf(slide);
      if (!ids.length) unknown.push(`${path} slide ${i + 1}: type ${slide.type}`);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
  }
  const entries = Object.fromEntries([...counts].sort(([, a], [, b]) => b - a));
  const unused = Object.keys(GUIDANCE).filter((id) => !counts.has(id));
  console.log(JSON.stringify({ decks: paths.length, slides, entries, unused }, null, 2));
  for (const line of unknown) console.error(`slides-usage: no catalogue entry for ${line}`);
  process.exit(unknown.length ? 1 : 0);
}
