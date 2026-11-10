#!/usr/bin/env bun
// The number of a consumer's deck slides using each catalogue entry, which the public engine cannot
// read: `slides-usage <deck.json|-> ...` prints it as JSON for the consumer to publish. A slide drawn
// through a replaced form counts for the entry that replaces it. Exit 1 on a slide no entry draws,
// named by its number from 1, as the page counter shows it.
import { readFileSync } from "node:fs";
import { GUIDANCE } from "../catalog/guidance";
import {
  anchorSlug,
  centeredAsStatement,
  fourColumnAsCards,
  gridAsContent,
  labeledGridAsCards,
  mediaAsContent,
  pipelineAsFlow,
  regularAsContent,
  replacedBy,
  twoColumnAsSplit,
  variantOf,
} from "../lib/slide-utils";
import type { ContentBlock, Presentation, Slide } from "../types/slide";

/** A block's entry where it is not `block-<type>`. */
const BLOCK_ENTRY: Record<string, string> = {
  annotated: "block-annotated-image",
  "annotated-code": "block-code",
  "code-and-text": "block-code",
  terminal: "block-terminal-and-hooks",
  hooks: "block-terminal-and-hooks",
  positions: "comparison-positions",
  transform: "comparison-before-after",
};

/** A deck as the command reads it: `slug`, where a consumer sets one, names it in errors. */
type Deck = Presentation & { slug?: string };

const known = (id: string) => Object.hasOwn(GUIDANCE, id);
/** Blocks every content slide may hold, which no entry of their own counts. */
const PLAIN = new Set(["block-paragraph", "block-bullets"]);

/** The block a deprecated block draws as, so it counts in the shape on screen. */
function drawnBlock(block: ContentBlock): ContentBlock {
  if (block.type === "pipeline") return pipelineAsFlow(block);
  if (block.type === "four-column") return fourColumnAsCards(block);
  if (block.type === "labeled-grid") return labeledGridAsCards(block);
  return block;
}

/** A block's entry, for the blocks the catalogue shows in more than one form. */
function blockEntry(block: ContentBlock): string {
  switch (block.type) {
    case "cards":
      if (block.dense) return "block-cards-dense";
      return block.columns === 4 ? "block-cards-four-columns" : "block-cards";
    case "numbers":
      if (block.items.length === 1) return "block-numbers-one-figure";
      return block.items.length > 4 ? "block-numbers-six-figures" : "block-numbers";
    case "bars":
      return block.bars.some((bar) => bar.from != null) ? "block-bars-as-ranges" : "block-bars";
    case "flow":
      return block.frame ? "block-flow-framed" : "block-flow";
    case "image-and-grid":
      return block.image.sketch ? "block-image-and-grid-sketch" : "block-image-and-grid";
    default:
      return BLOCK_ENTRY[block.type] ?? `block-${block.type}`;
  }
}

/** The catalogue entries a slide uses, read off what it draws: a replaced form counts as its heir. */
export function entriesOf(slide: Slide): string[] {
  if (slide.type === "media") return entriesOf(mediaAsContent(slide));
  if (slide.type === "grid" && slide.variant !== "quotes") return entriesOf(gridAsContent(slide));
  if (slide.type === "regular") {
    const drawn = regularAsContent(slide);
    if (drawn) return entriesOf(drawn);
  }
  if (slide.type === "content") {
    // A slide of one or two short bullets still draws as bullets: the print page marks it, and
    // it counts as what it draws.
    if (centeredAsStatement(slide)) return ["statement"];
    if (twoColumnAsSplit(slide)) return ["comparison-split"];
    const blocks = slide.content.map((b) => blockEntry(drawnBlock(b)));
    const strays = blocks.filter((b) => !known(b) && !PLAIN.has(b));
    if (strays.length) throw new Error(`no catalogue entry for ${strays.join(", ")}`);
    const form = slide.layout === "centered" ? "content-centered" : "content";
    const entries = new Set([form, ...blocks.filter(known)]);
    if (blocks.filter((b) => b === "block-image").length > 1) {
      entries.delete("block-image");
      entries.add("block-two-images");
    }
    return [...entries];
  }
  const to = replacedBy(slide)?.to ?? slide.type;
  const form = anchorSlug(to);
  const variant = form === slide.type ? variantOf(slide) : "";
  const entry = [variant ? `${form}-${anchorSlug(variant)}` : form, form, to.split(" ")[0]].find(
    known,
  );
  return entry ? [entry] : [];
}

if (import.meta.main) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("usage: slides-usage <deck.json|-> ...   (each a deck or an array of decks)");
    process.exit(2);
  }
  // A file, or `-` for standard input, holds one deck or an array of decks, so a consumer whose
  // decks are code pipes them all in one call.
  const decks = paths.flatMap((path) => {
    const read = JSON.parse(readFileSync(path === "-" ? 0 : path, "utf8")) as Deck | Deck[];
    if (!Array.isArray(read)) return [{ deck: read, name: path }];
    return read.map((deck, i) => {
      const label = [deck?.slug, deck?.name].find((n) => typeof n === "string" && n);
      return { deck, name: label ? `${label} (${path}[${i}])` : `${path}[${i}]` };
    });
  });
  if (!decks.length) {
    console.error("slides-usage: no deck to count");
    process.exit(1);
  }
  const counts = new Map<string, number>();
  const unknown: string[] = [];
  let slides = 0;
  for (const { deck, name } of decks) {
    if (!Array.isArray(deck?.slides)) {
      console.error(`slides-usage: ${name} is no deck: it has no slides list`);
      process.exit(1);
    }
    deck.slides.forEach((slide, i) => {
      slides++;
      try {
        const ids = entriesOf(slide);
        if (!ids.length) unknown.push(`${name} slide ${i + 1}: type ${slide.type}`);
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      } catch (e) {
        unknown.push(`${name} slide ${i + 1}: malformed, ${(e as Error).message}`);
      }
    });
  }
  const entries = Object.fromEntries([...counts].sort(([, a], [, b]) => b - a));
  // A "-2" anchor is a second tile of one entry in the specimen deck; no slide can reach it.
  const unused = Object.keys(GUIDANCE).filter((id) => !counts.has(id) && !/-\d+$/.test(id));
  console.log(JSON.stringify({ decks: decks.length, slides, entries, unused }, null, 2));
  for (const line of unknown) console.error(`slides-usage: no catalogue entry for ${line}`);
  process.exit(unknown.length ? 1 : 0);
}
