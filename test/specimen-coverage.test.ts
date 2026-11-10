import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { slideCatalog, slideCatalogBrandDark, specimenImages } from "../specimen/slide-catalog";
import { aliasTypes, slideComponents } from "../lib/slide-components";
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
const CALLOUT: Record<NonNullable<Extract<ContentBlock, { type: "callout" }>["variant"]>, true> = {
  info: true,
  warning: true,
  success: true,
};
const GALLERY: Record<NonNullable<Extract<ContentBlock, { type: "gallery" }>["layout"]>, true> = {
  grid: true,
  row: true,
};
const VARIANTS: Partial<Record<Slide["type"], Record<string, true>>> = {
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
};
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
const blocks = slides.flatMap((s) => (s.type === "content" ? s.content : []));
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

  it("shows every two-column, callout and gallery variant", () => {
    const of = <T extends ContentBlock["type"]>(type: T) =>
      blocks.filter((b): b is Extract<ContentBlock, { type: T }> => b.type === type);
    expect(
      missing(
        TWO_COLUMN,
        of("two-column").map((b) => b.variant),
      ),
    ).toEqual([]);
    expect(
      missing(
        CALLOUT,
        of("callout").map((b) => b.variant),
      ),
    ).toEqual([]);
    expect(
      missing(
        GALLERY,
        of("gallery").map((b) => b.layout ?? "grid"),
      ),
    ).toEqual([]);
  });

  it("shows every variant of the slide types that have them", () => {
    for (const [type, wanted] of Object.entries(VARIANTS)) {
      const seen = slides
        .filter((s) => s.type === type)
        .map((s) => ("variant" in s ? s.variant : "layout" in s ? s.layout : undefined));
      expect(missing(wanted, seen), type).toEqual([]);
    }
  });

  it("shows every section theme", () => {
    const seen = slides.map((s) => ("sectionTheme" in s ? s.sectionTheme : undefined));
    expect(missing(THEMES, seen)).toEqual([]);
  });

  it("names the variant each slide shows in its notes", () => {
    expect(
      slides.filter(
        (s) => !new RegExp(`^${s.type}[:, ]`).test(s.notes ?? "") && s.type !== "content",
      ),
    ).toEqual([]);
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
