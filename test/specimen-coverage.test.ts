import { readdirSync } from "node:fs";
import { join } from "node:path";
import { assert, describe, expect, it } from "vitest";
import { slideCatalog, slideCatalogBrandDark, specimenImages } from "../specimen/slide-catalog";
import { aliasTypes, slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import { replacedBy } from "../lib/slide-utils";
import { DEFAULT_SECTION_STYLE, getSectionStyle } from "../lib/section-styles";
import { ignoredFields } from "../scripts/usage";
import type {
  ChartSlide,
  ClosingSlide,
  ComparisonSlide,
  ContentBlock,
  GridSlide,
  SectionTheme,
  Slide,
} from "../types/slide";

// Each `Record` below is typed against the union it names, so a new block type or variant fails
// typecheck here until it is listed.
const BLOCKS: Record<ContentBlock["type"], true> = {
  paragraph: true,
  bullets: true,
  table: true,
  "two-column": true,
  code: true,
  "code-and-text": true,
  hooks: true,
  pipeline: true,
  image: true,
  "image-steps": true,
  gallery: true,
  video: true,
  "four-column": true,
  callout: true,
  quote: true,
  "labeled-grid": true,
  terminal: true,
  "linked-image": true,
  "image-and-grid": true,
  positions: true,
  flow: true,
  layers: true,
  timeline: true,
  transform: true,
  bars: true,
  numbers: true,
  annotated: true,
  "annotated-code": true,
  cards: true,
};
const TWO_COLUMN: Record<
  NonNullable<Extract<ContentBlock, { type: "two-column" }>["variant"]>,
  true
> = {
  "success-error": true,
  "error-success": true,
  error: true,
  "error-neutral": true,
  success: true,
  neutral: true,
};
const CONTINUES: Record<
  NonNullable<Extract<ContentBlock, { type: "timeline" }>["continues"]>,
  true
> = { in: true, out: true, both: true };
const CALLOUT: Record<NonNullable<Extract<ContentBlock, { type: "callout" }>["variant"]>, true> = {
  info: true,
  warning: true,
  success: true,
};
type GalleryLayout = Extract<ContentBlock, { type: "gallery" }>["layout"];
const GALLERY: Record<NonNullable<GalleryLayout>, GalleryLayout[]> = {
  grid: ["grid", undefined],
  row: ["row"],
};
const VARIANTS = {
  grid: { pillars: true, stats: true, quotes: true } satisfies Record<
    NonNullable<GridSlide["variant"]>,
    true
  >,
  comparison: {
    vs: true,
    "before-after": true,
    split: true,
    guidance: true,
    positions: true,
  } satisfies Record<NonNullable<ComparisonSlide["variant"]>, true>,
  chart: { cycle: true, graph: true, trend: true, bar: true } satisfies Record<
    ChartSlide["variant"],
    true
  >,
  closing: { contact: true, discussion: true } satisfies Record<
    NonNullable<ClosingSlide["variant"]>,
    true
  >,
} satisfies Partial<Record<Extract<Slide, { variant?: string }>["type"], Record<string, true>>>;
const THEMES: Record<SectionTheme, true> = {
  primary: true,
  secondary: true,
  accent: true,
  warning: true,
  success: true,
  deepdive: true,
};

// The catalogue shows an alias's target type in its place.
const ALIASES = new Set(Object.keys(aliasTypes));

const slides = slideCatalog.slides;
const contentSlides = slides.filter((slide) => slide.type === "content");
const blocks = contentSlides.flatMap((slide) => slide.content);
const missing = (wanted: object, seen: Iterable<unknown>) => {
  const have = new Set(seen);
  return Object.keys(wanted).filter((key) => !have.has(key));
};

describe("slide catalogue coverage", () => {
  it("shows every registered slide type", () => {
    expect(
      missing(
        slideComponents,
        slides.map((s) => s.type),
      ).filter((type) => !ALIASES.has(type)),
    ).toEqual([]);
  });

  it("shows every content block", () => {
    expect(
      missing(
        BLOCKS,
        blocks.map((b) => b.type),
      ),
    ).toEqual([]);
  });

  it.each([
    {
      block: "two-column",
      wanted: TWO_COLUMN,
      seen: blocks.filter((block) => block.type === "two-column").map((block) => block.variant),
    },
    {
      block: "callout",
      wanted: CALLOUT,
      seen: blocks.filter((block) => block.type === "callout").map((block) => block.variant),
    },
    {
      block: "timeline",
      wanted: CONTINUES,
      seen: blocks.filter((block) => block.type === "timeline").map((block) => block.continues),
    },
  ])("shows every $block variant", ({ wanted, seen }) => {
    expect(missing(wanted, seen)).toEqual([]);
  });

  it.each(Object.entries(GALLERY))("shows the %s gallery layout", (_layout, acceptedLayouts) => {
    const galleries = blocks.filter((block) => block.type === "gallery");
    expect(galleries.some(({ layout }) => acceptedLayouts.includes(layout))).toBe(true);
  });

  it.each(Object.entries(VARIANTS))("shows every %s slide variant", (type, wanted) => {
    const variants = slides
      .filter((slide): slide is Slide & { variant: string | undefined } => "variant" in slide)
      .filter((slide) => slide.type === type)
      .map((slide) => slide.variant);
    expect(missing(wanted, variants)).toEqual([]);
  });

  // The specimen's plain centred slide draws as a statement, which leaves the layout unseen.
  it("shows a centered content slide drawn as content", () => {
    const centered = contentSlides.filter((slide) => slide.layout === "centered");
    expect(centered.map(replacedBy)).toContain(undefined);
  });

  it("shows a closing quote", () => {
    const closing = slides.filter((slide) => slide.type === "closing");
    expect(closing.some((slide) => slide.closingQuote)).toBe(true);
  });

  it("shows a roadmap item with a tone", () => {
    const columns = slides
      .filter((slide) => slide.type === "roadmap")
      .flatMap((slide) => slide.columns);
    expect(columns.some((column) => column.items?.some((item) => item.tone))).toBe(true);
  });

  // Each where it changes the drawing: `secondary` is the default section's style, so it shows
  // nowhere, and slides-usage names a slide that sets it (or any colour that draws nothing there).
  it("uses the default section style for the secondary theme", () => {
    expect(getSectionStyle("secondary")).toBe(DEFAULT_SECTION_STYLE);
  });

  it("shows every non-default section theme", () => {
    const seen = slides
      .filter(
        (slide): slide is Slide & { sectionTheme: SectionTheme | undefined } =>
          "sectionTheme" in slide,
      )
      .map((slide) => slide.sectionTheme);
    expect(missing(THEMES, [...seen, "secondary"])).toEqual([]);
  });

  it("sets only fields that affect the drawing", () => {
    expect(slides.filter((s) => ignoredFields(s).length).map((s) => s.notes)).toEqual([]);
  });

  it.each(
    slides
      .map(({ type, notes }, index) => ({ type, notes, position: index + 1 }))
      .filter(({ type }) => type !== "content"),
  )("starts slide $position notes with its type ($type)", ({ type, notes, position }) => {
    assert(notes, `Add notes to slide ${position} (${type})`);
    expect(notes).toMatch(new RegExp(`^${type}[:, ]`));
  });

  // A consumer serves only the images the deck imports: one named by a root path is a 404 there.
  it("imports every image of its folder and names none by a root path", () => {
    const folder = join(import.meta.dirname, "..", "specimen", "slide-catalog");
    expect(Object.keys(specimenImages).sort()).toEqual(
      readdirSync(folder)
        .filter((file) => !file.startsWith("."))
        .sort(),
    );
    expect(JSON.stringify([slideCatalog, slideCatalogBrandDark])).not.toMatch(/"\/slide-catalog\//);
  });
});
