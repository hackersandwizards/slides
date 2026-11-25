import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import verbal from "@hackersandwizards/brand/verbal.json";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { centredMark } from "../scripts/pptx/chrome";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import {
  rendered,
  shapesOf,
  specimen,
  specimenAt,
  unescapeNamedEntities,
} from "./fixtures/rendered-deck";

import { pptxSlideVariants } from "./fixtures/pptx-slide-variants";

const require = createRequire(import.meta.url);

let slideXml: string[];
let slideText: string[];

beforeAll(async () => {
  ({ slideXml, slideText } = await specimen());
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
    const slides = slideCatalog.slides.filter((x) => x.type === "title" || x.type === "closing");
    const { zip: probe } = await rendered(
      { name: "T", theme: "brand-dark", slides },
      join(import.meta.dirname, ".."),
    );
    const ratio = (png: Buffer) => png.readUInt32BE(16) / png.readUInt32BE(20);
    const cuts = ["lockup-night", "wordmark-night"].map((name) =>
      ratio(readFileSync(require.resolve(`@hackersandwizards/brand/logos/${name}.png`))),
    );
    const drawn: number[] = [];
    for (let i = 1; probe.file(`ppt/slides/slide${i}.xml`); i++) {
      const xml = await probe.file(`ppt/slides/slide${i}.xml`)!.async("string");
      for (const [, alt, cx, cy] of xml.matchAll(
        /descr="([^"]*)"[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"/g,
      ))
        if (unescapeNamedEntities(alt) === verbal.name.company) drawn.push(+cx / +cy);
    }
    expect(drawn.length).toBeGreaterThan(0);
    for (const r of drawn) expect(Math.min(...cuts.map((c) => Math.abs(c - r)))).toBeLessThan(0.01);
  });

  // A list's first logo was the only one drawn, and only when it was no brand mark: the corner logo
  // the web draws went missing.
  it("stands a logo list as the web does: the last in the corner, the others at the bottom left", async () => {
    const partner = { src: "/specimen/slide-catalog/partner-mark.png", alt: "Partner" };
    const qr = { src: "/specimen/slide-catalog/qr-example.png", alt: "Other" };
    const { zip: probe } = await rendered(
      {
        name: "D",
        logo: { src: "/hw-lockup.svg", alt: "hackers&wizards" },
        slideLogos: {
          0: [{ src: "/hw-lockup.svg", alt: "hackers&wizards" }, partner],
          1: [qr, partner],
          2: [],
        },
        slides: [
          { type: "statement", lines: ["A"] },
          { type: "statement", lines: ["B"] },
          { type: "statement", lines: ["C"] },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    const pics = async (i: number) =>
      [
        ...(await probe.file(`ppt/slides/slide${i}.xml`)!.async("string")).matchAll(
          /descr="([^"]*)"[\s\S]*?<a:off x="(\d+)" y="\d+"\/>\s*<a:ext cx="\d+" cy="(\d+)"/g,
        ),
      ].map(([, alt, x, h]) => ({
        alt: unescapeNamedEntities(alt),
        x: +x / 914400,
        h: +h / 914400,
      }));
    const [one, two, three] = [await pics(1), await pics(2), await pics(3)];
    expect(one.find((p) => p.alt === "Partner")!.x).toBeGreaterThan(10);
    expect(one.find((p) => p.alt === verbal.name.company)!.x).toBeLessThan(1);
    // `h-9` at `bottom-6 left-6` on the print route, whose rem is 21.333 px.
    const other = two.find((p) => p.alt === "Other")!;
    expect(other.x).toBeCloseTo((1.5 * 21.333) / 144, 3);
    expect(other.h).toBeCloseTo((2.25 * 21.333) / 144, 3);
    expect(two.find((p) => p.alt === "Partner")!.x).toBeGreaterThan(10);
    expect(two.some((p) => p.alt === verbal.name.company)).toBe(false);
    expect(three.map((p) => p.alt)).toEqual([verbal.name.company]);
  });

  it("sets the headline a row below a principle that wraps to the kicker's second row", () => {
    const at = slideCatalog.slides.findLastIndex((s) => s.type === "gantt" && s.principle);
    const s = slideCatalog.slides[at] as Slide & { principle: string; headline: string };
    const shape = (text: string) => {
      const sp = slideXml[at].split("<p:sp>").find((x) => x.includes(`>${text}<`))!;
      const [, y, cy] = /<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"/.exec(sp)!;
      return { top: +y, bottom: +y + +cy };
    };
    // The pill keeps the print route's place; the title's box starts below it.
    expect(shape(s.headline).top).toBeGreaterThan(shape(s.principle).bottom);
  });
});

describe("slides-pptx draws what the slide shows", () => {
  it("keeps a section label in the deck's case and sets it in capitals with cap", () => {
    const i = specimenAt(
      (x) =>
        "sectionLabel" in x &&
        !!x.sectionLabel &&
        /[a-z]/.test(x.sectionLabel) &&
        !/[&<>]/.test(x.sectionLabel),
    );
    const label = (slideCatalog.slides[i] as { sectionLabel: string }).sectionLabel;
    const run = new RegExp(
      `<a:rPr [^>]*cap="all"[^>]*>(?:(?!<\\/a:r>).)*<a:t>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/a:t>`,
      "s",
    );
    expect(slideXml[i]).toMatch(run);
  });

  it("breaks a headline into balanced lines, as the web's text-wrap: balance", async () => {
    const headline = "Each team ships on its own schedule, every single week";
    const { zip } = await rendered({
      name: "T",
      slides: [{ type: "content", headline, content: [] } as Slide],
    });
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const title = shapesOf(xml).find(
      (sh) =>
        sh.texts.join(" ").replace(/\s+/g, " ").trim() === headline ||
        sh.texts.join("") === headline,
    )!;
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

  it("hides the page counter on a contact closing, as the web hides its corner", () => {
    const i = specimenAt((x) => x.type === "closing" && centredMark(x));
    expect(unescapeNamedEntities(slideText[i])).not.toMatch(/\d\d \/ \d\d/);
    expect(unescapeNamedEntities(slideText[specimenAt((x) => x.type === "content")])).toMatch(
      /\d\d \/ \d\d/,
    );
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
});
