#!/usr/bin/env bun
// The number of a consumer's deck slides using each catalogue entry, which the public engine cannot
// read: `slides-usage [--out <file> [--check]] <deck.json|-> ...` prints it as JSON for the consumer
// to publish, or writes it to the file, or with --check fails where the file differs. A slide drawn
// through a replaced form counts for the entry that replaces it. It lints the decks too: exit 1 on
// a slide no entry draws, a field that changes nothing the slide draws, and a deck that names no
// language; a slide is named by its number from 1, as the page counter shows it.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GUIDANCE } from "../catalog/guidance";
import { DEFAULT_SECTION_STYLE, getSectionStyle } from "../lib/section-styles";
import { anchorSlug, variantOf } from "../lib/catalog-classification";
import { centeredAsStatement, twoColumnAsSplit } from "../lib/content-redraw";
import {
  fourColumnAsCards,
  labeledGridAsCards,
  pipelineAsFlow,
} from "../lib/content-block-aliases";
import { gridAsContent } from "../lib/slide-aliases";
import { mediaAsContent } from "../lib/gallery-media";
import { namedLang, replacedBy } from "../lib/slide-utils";
import { regularAsContent } from "../lib/regular-sections";
import type { ContentBlock, ContentSlide, Presentation, SectionTheme, Slide } from "../types/slide";

type BlockResolver<K extends ContentBlock["type"]> =
  string | null | ((block: Extract<ContentBlock, { type: K }>) => string);

const BLOCK_ENTRY: { [K in ContentBlock["type"]]: BlockResolver<K> } = {
  cards: (block) =>
    block.dense
      ? "block-cards-dense"
      : block.columns === 4
        ? "block-cards-four-columns"
        : "block-cards",
  numbers: (block) =>
    block.items.length === 1
      ? "block-numbers-one-figure"
      : block.items.length > 4
        ? "block-numbers-six-figures"
        : "block-numbers",
  bars: (block) =>
    block.bars.some((bar) => bar.from != null) ? "block-bars-as-ranges" : "block-bars",
  flow: (block) => (block.frame ? "block-flow-framed" : "block-flow"),
  "image-and-grid": (block) =>
    block.image.sketch ? "block-image-and-grid-sketch" : "block-image-and-grid",
  annotated: "block-annotated-image",
  "annotated-code": "block-code",
  "code-and-text": "block-code",
  terminal: "block-terminal-and-hooks",
  hooks: "block-terminal-and-hooks",
  positions: "comparison-positions",
  transform: "comparison-before-after",
  bullets: null,
  callout: null,
  code: null,
  "four-column": null,
  gallery: null,
  image: null,
  "image-steps": null,
  "labeled-grid": null,
  layers: null,
  "linked-image": null,
  paragraph: null,
  pipeline: null,
  "profile-links": null,
  quote: null,
  table: null,
  timeline: null,
  "two-column": null,
  video: null,
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

function blockEntry(block: ContentBlock): string {
  const key = String(block.type);
  const entry = Object.hasOwn(BLOCK_ENTRY, key) ? BLOCK_ENTRY[key as ContentBlock["type"]] : null;
  if (typeof entry === "string") return entry;
  // The old switch matched variants strictly; only the alias lookup coerced the key.
  if (typeof entry === "function" && block.type === key)
    return (entry as (block: ContentBlock) => string)(block);
  return `block-${key}`;
}

/** The slide a slide draws as, where it draws as another: a replaced form as its heir. */
function drawnAs(slide: Slide): Slide | undefined {
  if (slide.type === "media") return mediaAsContent(slide);
  if (slide.type === "grid" && slide.variant !== "quotes") return gridAsContent(slide);
  if (slide.type === "regular") return regularAsContent(slide);
}

class MissingBlockEntry extends Error {}

function contentEntries(slide: ContentSlide): string[] {
  // A slide of one or two short bullets still draws as bullets: the print page marks it, and
  // it counts as what it draws.
  if (centeredAsStatement(slide)) return ["statement"];
  if (twoColumnAsSplit(slide)) return ["comparison-split"];
  const blocks = slide.content.map((b) => blockEntry(drawnBlock(b)));
  const strays = blocks.filter((b) => !known(b) && !PLAIN.has(b));
  if (strays.length)
    throw new MissingBlockEntry(
      `No catalogue entry for ${strays.join(", ")}, so the blocks cannot be counted. Set each affected content block's type to a supported ContentBlock type from types/slide.`,
    );
  const form = slide.layout === "centered" ? "content-centered" : "content";
  const entries = new Set([form, ...blocks.filter(known)]);
  if (blocks.filter((b) => b === "block-image").length > 1) {
    entries.delete("block-image");
    entries.add("block-two-images");
  }
  return [...entries];
}

/** The catalogue entries a slide uses, read off what it draws: a replaced form counts as its heir. */
export function entriesOf(slide: Slide): string[] {
  const drawn = drawnAs(slide);
  if (drawn) return entriesOf(drawn);
  if (slide.type === "content") return contentEntries(slide);
  const to = replacedBy(slide)?.to ?? slide.type;
  const form = anchorSlug(to);
  const variant = form === slide.type ? variantOf(slide) : "";
  const entry = [variant ? `${form}-${anchorSlug(variant)}` : form, form, to.split(" ")[0]].find(
    known,
  );
  return entry ? [entry] : [];
}

function contentOf(slide: Slide): ContentSlide | undefined {
  const drawn = drawnAs(slide) ?? slide;
  return drawn.type === "content" ? drawn : undefined;
}

function ignoredNumberFrom(slide: Slide): string[] {
  const content = contentOf(slide);
  if (!content) return [];
  const reason =
    slide.type === "grid"
      ? "numberFrom: a grid numbers its pillars only where no card names an icon"
      : "numberFrom: the cards block is not numbered";
  return (content.content ?? [])
    .filter((b) => b.type === "cards" && b.numberFrom != null && !b.numbered)
    .map(() => reason);
}

// On a content slide the section's style draws the footer's and a centred paragraph's rule and
// the principle's pill, where it differs from the default, and any section keeps one neutral
// two-column block from becoming a comparison. A centred slide draws none of them.
function sectionThemeDraws(slide: ContentSlide, theme: SectionTheme): boolean {
  if (slide.layout === "centered") return false;
  const style = getSectionStyle(theme);
  const ruled = !!slide.footer || slide.content.some((b) => b.type === "paragraph" && b.centered);
  if (ruled && style.border !== DEFAULT_SECTION_STYLE.border) return true;
  if (slide.principle && style.pill !== DEFAULT_SECTION_STYLE.pill) return true;
  return !!twoColumnAsSplit({ ...slide, sectionTheme: undefined });
}

function ignoredSectionTheme(slide: Slide): string[] {
  if (!("sectionTheme" in slide) || !slide.sectionTheme || slide.sectionTheme === "deepdive")
    return [];
  const content = contentOf(slide);
  if (content && sectionThemeDraws(content, slide.sectionTheme)) return [];
  return [`sectionTheme: ${slide.sectionTheme} changes no rule, pill or slide type here`];
}

const FIELD_CHECKS = [ignoredNumberFrom, ignoredSectionTheme];

/** The fields a slide sets that change nothing it draws, each with the reason: removing one leaves
 *  the slide as it was. A field no slide draws leaves the types instead; these draw on some slides.
 *  `sectionTheme: "deepdive"` always counts, since it sets the slide at night. */
export function ignoredFields(slide: Slide): string[] {
  return FIELD_CHECKS.flatMap((check) => check(slide));
}

/** The command that writes `out` again: the consumer's package script where its text calls
 *  slides-usage without --check (bun appends a caller's --check to the arguments, never to the
 *  text), else these arguments, which a pipe's decks (`-`) cannot repeat. */
function rerun(out: string, paths: string[]) {
  const { npm_lifecycle_event: script, npm_lifecycle_script: text } = process.env;
  if (script && text && /slides-usage/.test(text) && !/slides-usage[^|&;]*--check/.test(text))
    return `"bun run ${script}"`;
  if (paths.includes("-")) return "the command that wrote it again, without --check,";
  return `"slides-usage --out ${out} ${paths.join(" ")}"`;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const usage = [
    "usage: slides-usage [--out <file> [--check]] <deck.json|-> ...   (each a deck or an array of decks)",
    "  -             read the decks from standard input",
    "  --out <file>  write the JSON to the file instead of printing it",
    "  --check       fail where the file differs, naming the command to run instead",
  ].join("\n");
  if (args.includes("--help")) {
    console.log(usage);
    process.exit(0);
  }
  const at = args.indexOf("--out");
  const out = at < 0 ? undefined : args.splice(at, 2)[1];
  const check = args.includes("--check");
  const paths = args.filter((arg) => arg !== "--check");
  if (!paths.length || ((at >= 0 || check) && !out)) {
    console.error(
      "slides-usage: The check needs deck JSON to count and --check needs a file to compare. Pass a deck JSON path or - for standard input, and supply a file path after --out when using --out or --check.",
    );
    console.error(usage);
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
    console.error(
      "slides-usage: The input contains no deck, so there is nothing to count. Pass a deck JSON file or pipe a deck or nonempty array of decks to -.",
    );
    process.exit(1);
  }
  const counts = new Map<string, number>();
  const findings: string[] = [];
  let slides = 0;
  for (const { deck, name } of decks) {
    if (!Array.isArray(deck?.slides)) {
      console.error(
        `slides-usage: ${name} has no slides array, so the check cannot count it as a deck. Supply a Presentation with a slides array as defined in types/slide.`,
      );
      process.exit(1);
    }
    if (!namedLang(deck))
      findings.push(
        `${name} names no supported lang on the deck or a title slide, so the deck defaults to English. Set the deck's lang to en or de.`,
      );
    deck.slides.forEach((slide, i) => {
      slides++;
      try {
        const ids = entriesOf(slide);
        if (!ids.length)
          findings.push(
            `no catalogue entry for ${name} slide ${i + 1}: type ${slide.type} cannot be counted. Set the slide's type to a supported Slide type from types/slide.`,
          );
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
        for (const field of ignoredFields(slide))
          findings.push(`${name} slide ${i + 1}: draws nothing, ${field}: remove it`);
      } catch (e) {
        const at = `${name} slide ${i + 1}:`;
        findings.push(
          e instanceof MissingBlockEntry
            ? `${at} ${e.message}`
            : `${at} malformed slide data (${(e as Error).message}) cannot be counted. Fix the slide or block fields to match their types in types/slide.`,
        );
      }
    });
  }
  const entries = Object.fromEntries([...counts].sort(([, a], [, b]) => b - a));
  // A "-2" anchor is a second tile of one entry in the specimen deck; no slide can reach it.
  const unused = Object.keys(GUIDANCE).filter((id) => !counts.has(id) && !/-\d+$/.test(id));
  const json = `${JSON.stringify({ decks: decks.length, slides, entries, unused }, null, 2)}\n`;
  if (!out) process.stdout.write(json);
  else if (!check) writeFileSync(out, json);
  else if (!existsSync(out) || readFileSync(out, "utf8") !== json)
    findings.push(`${out} is stale: run ${rerun(out, paths)} and commit it`);
  for (const line of findings) console.error(`slides-usage: ${line}`);
  process.exit(findings.length ? 1 : 0);
}
