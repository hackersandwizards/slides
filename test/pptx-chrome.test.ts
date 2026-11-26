import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { brandStrip, kickerBand, slideCorner, startLogos, type Head } from "../scripts/pptx/chrome";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { W } from "../scripts/pptx/stage";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Presentation } from "../types/slide";
import {
  onlySlide,
  rendered,
  shapesOf,
  specimen,
  unescapeNamedEntities,
} from "./fixtures/rendered-deck";

import { pptxSlideVariants } from "./fixtures/pptx-slide-variants";

const require = createRequire(import.meta.url);

let slideXml: string[];

beforeAll(async () => {
  ({ slideXml } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
  it("writes the confidentiality line on every slide at the footer centre line", () => {
    for (const xml of slideXml) {
      const note = shapesOf(xml).find(
        (shape) => shape.texts.join("") === slideCatalog.confidential,
      );
      expect(note).toBeDefined();
      expect(note!.x).toBeCloseTo(96 / 144);
      expect(note!.y! + note!.h! / 2).toBeCloseTo(1024 / 144);
    }
  });

  it("places the confidentiality line after the start logo in a logo list", async () => {
    const confidential = "Specimen deck, fictional content";
    const { warnings, zip: deck } = await rendered({
      name: "Deck",
      confidential,
      slideLogos: {
        0: [
          { src: "/hw-lockup.svg", alt: "Start" },
          { src: "/hw-lockup.svg", alt: "End" },
        ],
      },
      slides: [{ type: "statement", lines: ["Hello"] }],
    });
    expect(warnings).toEqual([]);
    const xml = await deck.file("ppt/slides/slide1.xml")!.async("string");
    const [, x, width] =
      /descr="Start"[^>]*>[\s\S]*?<a:off x="(\d+)" y="\d+"\/>\s*<a:ext cx="(\d+)"/.exec(xml)!;
    const note = shapesOf(xml).find((shape) => shape.texts.join("") === confidential)!;
    expect(note.x).toBeGreaterThan((+x + +width) / 914400);
  });

  // Each cut of the brand marks has its own proportions; the night lockup is wider (F20).
  it("draws each brand mark of a night deck at its own file's proportions", async () => {
    const titles = slideCatalog.slides.filter((slide) => slide.type === "title");
    const closings = slideCatalog.slides.filter((slide) => slide.type === "closing");
    const { slideXml } = await rendered(
      {
        name: "T",
        theme: "brand-dark",
        slides: [
          ...titles,
          ...closings,
          { type: "content", headline: "Night wordmark", content: [] },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    const [lockup, wordmark] = ["lockup-night", "wordmark-night"].map((name) => {
      const png = readFileSync(require.resolve(`@hackersandwizards/brand/logos/${name}.png`));
      return png.readUInt32BE(16) / png.readUInt32BE(20);
    });
    const drawn = slideXml.map((xml) =>
      [...xml.matchAll(/<p:pic>(.*?)<\/p:pic>/gs)]
        .map(([, pic]) => pic)
        .filter((pic) => pic.includes('descr="hackers&amp;wizards"'))
        .map((pic) => {
          const extent = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(pic);
          assert(extent, "The brand mark has dimensions");
          return +extent[1] / +extent[2];
        }),
    );
    const lockupRatio: unknown = expect.toSatisfy((r: number) => Math.abs(r - lockup) < 0.01);
    expect(drawn).toEqual([
      ...Array.from({ length: 8 }, () => [lockupRatio]),
      [expect.toSatisfy((r: number) => Math.abs(r - wordmark) < 0.01)],
    ]);
  });

  // A list's first logo was the only one drawn, and only when it was no brand mark: the corner logo
  // the web draws went missing.
  describe("logo lists", () => {
    const brand = { src: "/hw-lockup.svg", alt: "hackers&wizards" };
    const partner = { src: "/specimen/slide-catalog/partner-mark.png", alt: "Partner" };
    const qr = { src: "/specimen/slide-catalog/qr-example.png", alt: "Other" };
    let slides: string[];

    beforeAll(async () => {
      ({ slideXml: slides } = await rendered(
        {
          name: "D",
          logo: brand,
          slideLogos: { 0: [brand, partner], 1: [qr, partner], 2: [] },
          slides: [
            { type: "statement", lines: ["A"] },
            { type: "statement", lines: ["B"] },
            { type: "statement", lines: ["C"] },
          ],
        },
        join(import.meta.dirname, ".."),
      ));
    });

    const corner: unknown = expect.toSatisfy((x: number) => x > 10);
    const start: unknown = expect.toSatisfy((x: number) => x < 1);
    // `h-9` at `bottom-6 left-6` on the print route, whose rem is 21.333 px.
    const left: unknown = expect.closeTo((1.5 * 21.333) / 144, 3);
    const height: unknown = expect.closeTo((2.25 * 21.333) / 144, 3);
    const cases: { name: string; index: number; pictures: unknown[] }[] = [
      {
        name: "brand and a partner",
        index: 0,
        pictures: [
          expect.objectContaining({ alt: "Partner", x: corner }),
          expect.objectContaining({
            alt: "hackers&wizards",
            x: start,
          }),
        ],
      },
      {
        name: "two custom logos",
        index: 1,
        pictures: [
          expect.objectContaining({ alt: "Partner", x: corner }),
          {
            alt: "Other",
            x: left,
            h: height,
          },
        ],
      },
      {
        name: "an empty list",
        index: 2,
        pictures: [expect.objectContaining({ alt: "hackers&wizards" })],
      },
    ];

    it.each(cases)("stands $name in the corner and at the bottom left", ({ index, pictures }) => {
      const drawn = [
        ...slides[index].matchAll(
          /descr="([^"]*)"[\s\S]*?<a:off x="(\d+)" y="\d+"\/>\s*<a:ext cx="\d+" cy="(\d+)"/g,
        ),
      ].map(([, alt, x, h]) => ({
        alt: unescapeNamedEntities(alt),
        x: +x / 914400,
        h: +h / 914400,
      }));
      expect(drawn).toEqual(pictures);
    });
  });

  it("sets the headline a row below a principle that wraps to the kicker's second row", async () => {
    const principle = "Every team ships through the same harness, every day";
    const headline = "Gantt with the longest kicker";
    const xml = await onlySlide({
      type: "gantt",
      sectionLabel: "Platform engineering and developer experience",
      principle,
      headline,
      columns: ["M1", "M2", "M3", "M4"],
      rows: [{ label: "Training", bars: [{ label: "Cohorts", start: 1, span: 3 }] }],
    });
    const shapes = shapesOf(xml);
    const pills = shapes.filter(({ texts }) => texts.join("") === principle);
    const titles = shapes.filter(({ texts }) => texts.join("") === headline);
    expect(pills).toHaveLength(1);
    expect(titles).toHaveLength(1);
    const [pill] = pills;
    const [title] = titles;
    // The pill keeps the print route's place; the title's box starts below it.
    expect(title.y).toBeGreaterThan(pill.y + pill.h);
  });
});

describe("slides-pptx draws what the slide shows", () => {
  it("keeps a section label in the deck's case and sets it in capitals with cap", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Case on the slide",
      sectionLabel: "Mixed Case Label",
      content: [],
    });
    expect(xml).toMatch(
      /<a:rPr [^>]*cap="all"[^>]*>(?:(?!<\/a:r>).)*<a:t>Mixed Case Label<\/a:t>/s,
    );
  });

  it("breaks a headline into balanced lines, as the web's text-wrap: balance", async () => {
    const headline = "Each team ships on its own schedule, every single week";
    const xml = await onlySlide({ type: "content", headline, content: [] });
    const titles = shapesOf(xml).filter(
      ({ texts }) => texts.join(" ").replace(/\s+/g, " ").trim() === headline,
    );
    expect(titles).toHaveLength(1);
    const [title] = titles;
    expect(title.xml).toContain("<a:br/>");
    const lines = title.xml.split("<a:br/>").map(
      (part) =>
        [...part.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
          .map((m) => m[1])
          .join("")
          .trim().length,
    );
    expect(lines).toHaveLength(2);
    expect(Math.abs(lines[0] - lines[1])).toBeLessThan(12);
  });

  it("hides the page counter on a contact closing, as the web hides its corner", async () => {
    const {
      slideText: [content, closing],
    } = await rendered({
      name: "Counter",
      slides: [
        { type: "content", headline: "Counter on content", content: [] },
        pptxSlideVariants.centredEmail,
      ],
    });
    expect(content).toMatch(/01 \/ 02/);
    expect(closing).not.toMatch(/\d\d \/ \d\d/);
  });
});

describe("slides-pptx contact links", () => {
  it.each([
    {
      label: "centred email",
      slide: pptxSlideVariants.centredEmail,
      text: "ari@example.com",
      target: "mailto:ari@example.com",
    },
    {
      label: "portrait email",
      slide: pptxSlideVariants.portraitContact,
      text: "ari@example.com",
      target: "mailto:ari@example.com",
    },
    {
      label: "portrait LinkedIn",
      slide: pptxSlideVariants.portraitLinkedIn,
      text: "in/ari-example",
      target: "https://www.linkedin.com/in/ari-example",
    },
  ])("links the $label contact line", async ({ slide, text, target }) => {
    const {
      zip,
      slideXml: [xml],
    } = await rendered({ name: "Contact", slides: [slide] });
    const speaker = shapesOf(xml).find((shape) => shape.texts.includes("Ari Example"));
    assert(speaker, "speaker contact box");
    expect(speaker.texts).toContain(text);
    const rels = zip.file("ppt/slides/_rels/slide1.xml.rels");
    assert(rels, "slide relationships");
    expect(await rels.async("string")).toContain(`Target="${target}"`);
  });

  const phone = "+1 202-555-0142";

  it.each([
    { layout: "centred", slide: pptxSlideVariants.centredEmail },
    { layout: "portrait", slide: pptxSlideVariants.portraitContact },
  ])("draws a plain $layout contact without a mailto link", async ({ slide }) => {
    const {
      zip,
      slideXml: [xml],
    } = await rendered({
      name: "Contact",
      slides: [
        { ...slide, speakers: slide.speakers.map((speaker) => ({ ...speaker, contact: phone })) },
      ],
    });
    const speaker = shapesOf(xml).find((shape) => shape.texts.includes("Ari Example"));
    assert(speaker, "speaker contact box");
    expect(speaker.texts).toContain(phone);
    const rels = zip.file("ppt/slides/_rels/slide1.xml.rels");
    assert(rels, "slide relationships");
    expect(await rels.async("string")).not.toContain("mailto:");
  });
});

function freshSheet(): { pptx: PptxGenJS; sheet: Sheet } {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets: join(import.meta.dirname, ".."),
    warnings: [],
    charts: new Map(),
  });
  return { pptx, sheet };
}

describe("slides-pptx chrome parts", () => {
  it("draws the brand strip in 24 steps from teal to purple across the slide width", async () => {
    const { pptx, sheet } = freshSheet();
    brandStrip(sheet);
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const file = zip.file("ppt/slides/slide1.xml");
    assert(file, "slide1.xml");
    const rects = shapesOf(await file.async("string"));
    const day = palette(false);
    expect({
      count: rects.length,
      firstX: rects[0].x,
      firstFill: rects[0].fill,
      lastFill: rects[rects.length - 1].fill,
      rightEdge: Math.round((rects[rects.length - 1].x + rects[rects.length - 1].w) * 100) / 100,
    }).toEqual({
      count: 24,
      firstX: 0,
      firstFill: day.teal,
      lastFill: day.purple,
      rightEdge: Math.round(W * 100) / 100,
    });
  });

  const cornerCases: { name: string; deck: Presentation; index: number; expected: number }[] = [
    {
      name: "centred closing with hidden corner",
      deck: { name: "D", slides: [{ type: "closing", headline: "Bye" }] },
      index: 0,
      expected: 12.666333333333334,
    },
    {
      name: "title slide with lockup and no page counter",
      deck: {
        name: "D",
        slides: [
          { type: "title", title: "Start" },
          { type: "statement", lines: ["Next"] },
        ],
      },
      index: 0,
      expected: 10.226611732537908,
    },
    {
      name: "content slide with wordmark and page counter",
      deck: {
        name: "D",
        slides: [
          { type: "title", title: "Start" },
          { type: "statement", lines: ["Next"] },
        ],
      },
      index: 1,
      expected: 8.85483908045977,
    },
  ];

  it.each(cornerCases)(
    "slideCorner returns the corner left bound for $name",
    ({ deck, index, expected }) => {
      const { sheet } = freshSheet();
      expect(slideCorner(sheet, deck, index)).toEqual(expected);
    },
  );

  const partnerLogo = { src: "/specimen/slide-catalog/partner-mark.png", alt: "Partner" };
  const qrLogo = { src: "/specimen/slide-catalog/qr-example.png", alt: "QR" };
  const hwLogo = { src: "/hw-lockup.svg", alt: "h&w" };
  const startLogoCases: { name: string; deck: Presentation; expected: number }[] = [
    {
      name: "one start logo on a plain deck",
      deck: {
        name: "D",
        slideLogos: { 0: [partnerLogo, hwLogo] },
        slides: [{ type: "statement", lines: ["A"] }],
      },
      expected: 1.5462721354166664,
    },
    {
      name: "two start logos on a confidential deck",
      deck: {
        name: "D",
        confidential: "Confidential",
        slideLogos: { 0: [partnerLogo, qrLogo, hwLogo] },
        slides: [{ type: "statement", lines: ["A"] }],
      },
      expected: 2.5092304687499993,
    },
  ];

  it.each(startLogoCases)("startLogos returns the left edge for $name", ({ deck, expected }) => {
    const { sheet } = freshSheet();
    expect(startLogos(sheet, deck, 0)).toEqual(expected);
  });

  const kickerCases: { name: string; head: Head; expected: number }[] = [
    { name: "empty head", head: {}, expected: 0 },
    {
      name: "preText and short principle on one row",
      head: { preText: "Intro", principle: "Small steps" },
      expected: 0,
    },
    {
      name: "long sectionLabel that wraps the principle pill",
      head: {
        sectionLabel: "A very long section label spanning nearly the whole stage width here",
        principle: "Principle that wraps onto the second kicker row",
      },
      expected: 76 / 144,
    },
  ];

  it.each(kickerCases)("kickerBand returns the wrapped height for $name", ({ head, expected }) => {
    const { sheet } = freshSheet();
    expect(kickerBand(sheet, head)).toEqual(expected);
  });
});
