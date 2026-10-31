import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderPptx } from "../scripts/render-pptx";
import { slideCatalogue } from "../specimen/slide-catalogue";
import type { Slide } from "../types/slide";

// Fields that hold no slide text: paths, ids, switches and names of variants, colours and icons.
const NOT_TEXT = new Set([
  "type",
  "src",
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
  "align",
  "theme",
  "sectionTheme",
  "accent",
  "accentColor",
  "state",
  "tone",
  "dotColor",
  "team",
  "kind",
  "language",
  "closingStyle",
  "background",
  "alt",
  "imageAlt",
  "highlight",
  "highlightPhase",
  "contact",
]);

/** Every string a slide shows, by walking its data. */
function texts(value: unknown, key = ""): string[] {
  if (NOT_TEXT.has(key)) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => texts(v, k));
  return [];
}

const norm = (t: string) =>
  t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`|[*“”"]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const unescape = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

let dir: string;
let zip: JSZip;
const slideXml: string[] = [];
// The text of each slide's parts: its own XML and the charts it holds.
const slideText: string[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "slides-pptx-"));
  const out = join(dir, "specimen.pptx");
  const warnings = await renderPptx(
    slideCatalogue,
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  expect(warnings).toEqual([]);
  zip = await JSZip.loadAsync(readFileSync(out));
  for (let i = 1; zip.file(`ppt/slides/slide${i}.xml`); i++) {
    const xml = await zip.file(`ppt/slides/slide${i}.xml`)!.async("string");
    const rels = (await zip.file(`ppt/slides/_rels/slide${i}.xml.rels`)?.async("string")) ?? "";
    const charts = await Promise.all(
      [...rels.matchAll(/Target="[^"]*\/charts\/(chart\d+\.xml)"/g)].map((m) =>
        zip.file(`ppt/charts/${m[1]}`)!.async("string"),
      ),
    );
    slideXml.push(xml);
    slideText.push(
      [xml, ...charts]
        .flatMap((x) => [...x.matchAll(/<(?:a:t|c:v)>([^<]*)<\/(?:a:t|c:v)>/g)].map((m) => m[1]))
        .join(""),
    );
  }
}, 60_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("slides-pptx on the specimen deck", () => {
  it("writes one slide per deck slide", () => {
    expect(slideXml).toHaveLength(slideCatalogue.slides.length);
  });

  // A malformed part opens in no viewer: Quick Look hangs on it and PowerPoint offers a repair.
  it("writes well-formed XML in every part", async () => {
    const parts = Object.keys(zip.files).filter((f) => /\.(xml|rels)$/.test(f));
    for (const part of parts) {
      const doc = new DOMParser().parseFromString(
        await zip.file(part)!.async("string"),
        "application/xml",
      );
      expect(doc.getElementsByTagName("parsererror"), part).toHaveLength(0);
    }
  });

  it("sets every text of a slide as text on that slide", () => {
    const missing = slideCatalogue.slides.flatMap((slide: Slide, i) => {
      const shown = norm(unescape(slideText[i]));
      // A stats card shows its label in place of its title, as the web card does.
      const data =
        slide.type === "grid" && slide.variant === "stats"
          ? { ...slide, cards: slide.cards.map((cd) => (cd.label ? { ...cd, title: "" } : cd)) }
          : slide;
      return texts(data)
        .filter((t) => !shown.includes(norm(t)))
        .map((t) => `slide ${i + 1} (${slide.type}): ${t}`);
    });
    expect(missing).toEqual([]);
  });

  it("places pictures only for a deck's images and the h&w mark", () => {
    slideCatalogue.slides.forEach((slide: Slide, i) => {
      const images =
        JSON.stringify(slide).match(
          /"(src|imageSrc|logo)":"[^"]+\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)"/g,
        ) ?? [];
      const pictures = slideXml[i].match(/<p:pic>/g) ?? [];
      expect(pictures.length, `slide ${i + 1} (${slide.type})`).toBeLessThanOrEqual(
        images.length + 1,
      );
    });
  });

  it("draws tables as tables and trend and bar charts as charts", () => {
    slideCatalogue.slides.forEach((slide: Slide, i) => {
      if (slide.type === "content" && slide.content.some((b) => b.type === "table")) {
        expect(slideXml[i], `slide ${i + 1}`).toContain("<a:tbl>");
      }
      if (slide.type === "chart" && (slide.variant === "trend" || slide.variant === "bar")) {
        expect(slideXml[i], `slide ${i + 1}`).toContain("drawingml/2006/chart");
      }
    });
  });

  it("names the brand fonts with their pitch, so a machine without them substitutes in kind", () => {
    const all = slideXml.join("");
    expect(all).toContain('typeface="Inter" pitchFamily="34" charset="0"');
    expect(all).toContain('typeface="JetBrains Mono" pitchFamily="49" charset="0"');
    expect(all).not.toMatch(/typeface="JetBrains Mono" pitchFamily="34"/);
  });
});
