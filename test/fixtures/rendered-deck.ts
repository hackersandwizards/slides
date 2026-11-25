import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tokens } from "@hackersandwizards/brand/tokens";
import { assert } from "vitest";
import { renderPptx } from "../../scripts/pptx/deck";
import { slideCatalog } from "../../specimen/slide-catalog";
import type { Presentation, Slide } from "../../types/slide";

export async function rendered(deck: Presentation, assets?: string) {
  const dir = mkdtempSync(join(tmpdir(), "slides-pptx-"));
  try {
    const { zip, warnings } = await renderPptx(deck, assets ?? dir);
    const slideXml: string[] = [];
    const slideText: string[] = [];
    const slideCharts: string[][] = [];
    for (let i = 1; zip.file(`ppt/slides/slide${i}.xml`); i++) {
      const xml = await zip.file(`ppt/slides/slide${i}.xml`)!.async("string");
      const rels = (await zip.file(`ppt/slides/_rels/slide${i}.xml.rels`)?.async("string")) ?? "";
      const charts = await Promise.all(
        [...rels.matchAll(/Target="[^"]*\/charts\/(chart\d+\.xml)"/g)].map((m) =>
          zip.file(`ppt/charts/${m[1]}`)!.async("string"),
        ),
      );
      slideXml.push(xml);
      slideCharts.push(charts);
      slideText.push(
        [xml, ...charts]
          .flatMap((x) => [...x.matchAll(/<(?:a:t|c:v)>([^<]*)<\/(?:a:t|c:v)>/g)].map((m) => m[1]))
          .join(""),
      );
    }
    return { zip, warnings, slideXml, slideText, slideCharts };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let specimenRender: ReturnType<typeof rendered> | undefined;

export function specimen() {
  // Vite names the specimen's images from the repository root.
  return (specimenRender ??= rendered(slideCatalog, join(import.meta.dirname, "../..")));
}

export async function onlySlide(slide: Slide, deck: Presentation = { name: "T", slides: [] }) {
  const { slideXml } = await rendered({ ...deck, slides: [slide] });
  return slideXml[0];
}

export function specimenSlide<K extends Slide["type"]>(headline: string, type: K) {
  const matches = slideCatalog.slides.filter(
    (slide): slide is Extract<Slide, { type: K }> =>
      slide.type === type && "headline" in slide && slide.headline === headline,
  );
  assert(
    matches.length === 1,
    `Expected one ${type} slide with headline "${headline}", found ${matches.length}`,
  );
  return matches[0];
}

const NOT_TEXT = new Set([
  "type",
  "src",
  "poster",
  "imageSrc",
  "logo",
  "href",
  "linkedIn",
  "url",
  "icon",
  "notes",
  "storageKey",
  "variant",
  "layout",
  "theme",
  "sectionTheme",
  "accent",
  "state",
  "tone",
  "dotColor",
  "team",
  "kind",
  "language",
  "closingStyle",
  "background",
  "ground",
  "alt",
  "imageAlt",
  "highlight",
  "highlightPhase",
  "contact",
  "continues",
  "order",
]);

export function texts(value: unknown, key = ""): string[] {
  if (NOT_TEXT.has(key)) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => texts(v, k));
  return [];
}

export const norm = (t: string) =>
  t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`|[*“”"]/g, "")
    .replace(/−/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();

// Each shape of a slide: its preset, frame in inches, fill, line dash and texts.
export const shapesOf = (xml: string) =>
  [...xml.matchAll(/<p:sp>(.*?)<\/p:sp>/gs)].map(([, b]) => {
    const [x, y, w, h] = (
      /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"/.exec(b) ?? []
    )
      .slice(1)
      .map((v) => +v / 914400);
    return {
      prst: /prst="(\w+)"/.exec(b)?.[1],
      x,
      y,
      w,
      h,
      fill: /<p:spPr>.*?<a:solidFill><a:srgbClr val="(\w+)"/s.exec(b)?.[1],
      dash: /<a:prstDash val="(\w+)"/.exec(b)?.[1],
      texts: [...b.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]),
      xml: b,
    };
  });
export const TEAL = tokens["--color-teal"].slice(1).toUpperCase();
export const REM = 21.333 / 144;

export const specimenAt = (test: (s: Slide) => boolean) => slideCatalog.slides.findIndex(test);

export const unescape = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
