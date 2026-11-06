import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import verbal from "@hackersandwizards/brand/verbal.json";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderPptx } from "../scripts/render-pptx";
import { slideCatalogue } from "../specimen/slide-catalogue";
import type { Slide } from "../types/slide";

// Fields that hold no slide text: paths, ids, switches and names of variants, colours and icons.
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
  "ground",
  "alt",
  "imageAlt",
  "highlight",
  "highlightPhase",
  "contact",
  "continues",
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

  it("sets brand's claim on a closing that asks for it", () => {
    const i = slideCatalogue.slides.findIndex((sl) => sl.type === "closing" && sl.claim);
    expect(norm(unescape(slideText[i]))).toContain(norm(verbal.claim.en));
  });

  it("sets every text of a slide as text on that slide", () => {
    const missing = slideCatalogue.slides.flatMap((slide: Slide, i) => {
      const shown = norm(unescape(slideText[i]));
      // A stats card shows its label in place of its title, as the web card does.
      // A closing without portraits shows the h&w lockup in place of the company's name.
      const data =
        slide.type === "grid" && slide.variant === "stats"
          ? { ...slide, cards: slide.cards.map((cd) => (cd.label ? { ...cd, title: "" } : cd)) }
          : slide.type === "closing" && !slide.speakers?.some((sp) => sp.imageSrc)
            ? {
                ...slide,
                speakers: slide.speakers?.map((sp) =>
                  sp.company === "hackers&wizards" ? { ...sp, company: "" } : sp,
                ),
              }
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

  it("spells out a linked image's link and covers a video with its poster", async () => {
    const at = (type: string) =>
      slideCatalogue.slides.findIndex(
        (s) => s.type === "content" && s.content.some((b) => b.type === type),
      );
    expect(slideText[at("linked-image")]).toContain("forge.example.com/acme/payments/pull/128");
    const rels = await zip
      .file(`ppt/slides/_rels/slide${at("video") + 1}.xml.rels`)!
      .async("string");
    const poster = readFileSync(
      join(import.meta.dirname, "..", "specimen", "slide-catalogue", "agent-session-poster.png"),
    );
    const pictures = await Promise.all(
      [...rels.matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(async (m) =>
        Buffer.from(await zip.file(`ppt/media/${m[1]}`)!.async("uint8array")),
      ),
    );
    expect(pictures.some((p) => p.equals(poster))).toBe(true);
  });

  it("names the brand fonts with their pitch, so a machine without them substitutes in kind", () => {
    const all = slideXml.join("");
    expect(all).toContain('typeface="Inter" pitchFamily="34" charset="0"');
    expect(all).toContain('typeface="JetBrains Mono" pitchFamily="49" charset="0"');
    expect(all).not.toMatch(/typeface="JetBrains Mono" pitchFamily="34"/);
  });
});

// The specimen deck has no deep-dive slide with bullets: two content slides that differ only there.
it("colours a deep-dive slide's bullets in the night teal, every other slide's in the day teal", async () => {
  const slide = {
    type: "content",
    headline: "H",
    content: [{ type: "bullets", items: ["a", "b"] }],
  };
  const out = join(dir, "bullets.pptx");
  await renderPptx(
    { ...slideCatalogue, slides: [slide, { ...slide, sectionTheme: "deepdive" }] as Slide[] },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const pptx = await JSZip.loadAsync(readFileSync(out));
  const colour = async (n: number) =>
    [
      ...(await pptx.file(`ppt/slides/slide${n}.xml`)!.async("string")).matchAll(
        /<a:buClr><a:srgbClr val="(\w+)"/g,
      ),
    ].map((m) => m[1]);
  const [day, night] = [await colour(1), await colour(2)];
  expect(day.length).toBeGreaterThan(0);
  expect(night).toHaveLength(day.length);
  expect(new Set(night).size).toBe(1);
  expect(night[0]).not.toBe(day[0]);
});

it("marks the text of a German deck German, its notes included", async () => {
  const out = join(dir, "lang.pptx");
  await renderPptx(
    {
      ...slideCatalogue,
      slides: [
        { type: "title", title: "Titel", lang: "de" },
        {
          type: "content",
          headline: "H",
          content: [{ type: "paragraph", text: "Text" }],
          notes: "N",
        },
      ] as Slide[],
    },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const pptx = await JSZip.loadAsync(readFileSync(out));
  for (const part of ["ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide2.xml"])
    expect(await pptx.file(part)!.async("string")).toContain('lang="de-DE"');
  for (const part of Object.keys(pptx.files).filter((f) => f.endsWith(".xml")))
    expect(await pptx.file(part)!.async("string")).not.toContain('lang="en-US"');
});

// pptxgenjs split a run at its \n into paragraphs that each ended a line, so the bold word after
// the break started a third line. Text boxes and table cells hand text to pptxgenjs apart.
it.each([
  [
    "a statement's closing",
    { type: "statement", lines: ["S"], closing: "one\ntwo **three** four" },
  ],
  ["a title", { type: "title", title: "one\ntwo **three** four" }],
  [
    "a table cell",
    {
      type: "content",
      headline: "H",
      content: [{ type: "table", rows: [["x", "one\ntwo **three** four"]] }],
    },
  ],
])("sets a \\n in %s as a line break inside its paragraph", async (_, slide) => {
  const out = join(dir, "breaks.pptx");
  await renderPptx(
    { ...slideCatalogue, slides: [slide as Slide] },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  const xml = await (
    await JSZip.loadAsync(readFileSync(out))
  )
    .file("ppt/slides/slide1.xml")!
    .async("string");
  const para = [...xml.matchAll(/<a:p>(.*?)<\/a:p>/g)].find((m) => m[1].includes(">one<"))!;
  expect(para[1].match(/<a:br\/>/g)).toHaveLength(1);
  expect(para[1]).toMatch(/>two .*three.* four<\/a:t>/);
});

// pptxgenjs stores every video cover as a PNG part: another format would sit there mislabelled.
it("warns on a video poster that is no PNG and sets no cover", async () => {
  const out = join(dir, "poster.pptx");
  const warnings = await renderPptx(
    {
      ...slideCatalogue,
      slides: [
        {
          type: "content",
          headline: "Video",
          content: [
            {
              type: "video",
              src: "/slide-catalogue/demo.mp4",
              poster: "/slide-catalogue/demo.mp4",
            },
          ],
        },
      ],
    },
    out,
    join(import.meta.dirname, "..", "specimen"),
  );
  expect(warnings).toEqual([expect.stringContaining("poster")]);
});

// The web lights the phase whose title matches `highlightPhase` in any case, and no phase without one.
it.each([true, false])(
  "lights a process slide's phase by the web's rule, loop %s",
  async (loop) => {
    const slide = (highlightPhase?: string) => ({
      type: "process",
      headline: "H",
      loop,
      nodes: ["One", "Two", "Three"].map((title) => ({ title, description: "d" })),
      ...(highlightPhase === undefined ? {} : { highlightPhase }),
    });
    const phases = ["Two", "two", undefined, "Nope", "Three"];
    const out = join(dir, "process.pptx");
    await renderPptx(
      { ...slideCatalogue, slides: phases.map(slide) as Slide[] },
      out,
      join(import.meta.dirname, "..", "specimen"),
    );
    const pptx = await JSZip.loadAsync(readFileSync(out));
    // Each slide's colours in drawing order: the slides differ in nothing else but name and page.
    const [exact, lower, none, unknown, last] = await Promise.all(
      phases.map(async (_, i) =>
        [
          ...(await pptx.file(`ppt/slides/slide${i + 1}.xml`)!.async("string")).matchAll(
            /srgbClr val="(\w+)"/g,
          ),
        ]
          .map((m) => m[1])
          .join(),
      ),
    );
    expect(lower).toBe(exact);
    expect(none).toBe(unknown);
    expect(none).not.toBe(last);
  },
);
