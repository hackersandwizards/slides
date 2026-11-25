import { join } from "node:path";
import verbal from "@hackersandwizards/brand/verbal.json";
import { tokens } from "@hackersandwizards/brand/tokens";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import {
  contentRedrawnAs,
  dualPillAsRoadmap,
  evolutionAsProcess,
  gridAsContent,
  regularAsContent,
  WORDS,
  twoColumnAsSplit,
} from "../lib/slide-utils";
import {
  norm,
  onlySlide,
  rendered,
  shapesOf,
  specimen,
  specimenAt,
  TEAL,
  unescapeNamedEntities,
} from "./fixtures/rendered-deck";
import { pptxSlideVariants } from "./fixtures/pptx-slide-variants";

let slideXml: string[];
let slideText: string[];

beforeAll(async () => {
  ({ slideXml, slideText } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
  it("sets brand's claim on a contact closing unless it turns the claim off", () => {
    const at = (claim: boolean) =>
      slideCatalog.slides.findIndex(
        (sl) => sl.type === "closing" && sl.variant === "contact" && (sl.claim !== false) === claim,
      );
    expect(norm(unescapeNamedEntities(slideText[at(true)]))).toContain(norm(verbal.claim.en));
    expect(norm(unescapeNamedEntities(slideText[at(false)]))).not.toContain(norm(verbal.claim.en));
  });

  it.each(["en", "de"] as const)(
    "sets the %s claim in the deck's language, on one row",
    async (lang) => {
      const { zip: deck } = await rendered({
        name: "D",
        slides: [
          { type: "title", title: "T", lang },
          { type: "closing", line1: "Danke." },
        ],
      });
      const xml = await deck.file("ppt/slides/slide2.xml")!.async("string");
      expect(norm(unescapeNamedEntities(xml.replace(/<[^>]+>/g, "")))).toContain(
        norm(verbal.claim[lang]),
      );
      // One row: the claim's box no higher than its size times the line's 1.25, with some slack.
      const box = shapesOf(xml).find((sp) => sp.texts.includes(verbal.claim.word[lang]))!;
      const size = +/sz="(\d+)"/.exec(box.xml)![1] / 100;
      expect(box.h * 72).toBeLessThan(size * 1.25 * 1.5);
    },
  );

  it("labels a centred closing's LinkedIn link as the web does", async () => {
    const { zip } = await rendered(
      {
        name: "D",
        slides: [
          {
            type: "closing",
            line1: "Thanks.",
            speakers: [
              { name: "A", company: "B", linkedIn: "https://www.linkedin.com/in/example-name" },
            ],
          },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    expect(text).toContain("in/example-name");
    expect(text.join(" ")).not.toContain("linkedin.com");
  });

  it("sets a title slide's speakers and QR alt text in the deck's language", async () => {
    const { zip: de } = await rendered(
      {
        name: "D",
        lang: "de",
        slides: [
          {
            type: "title",
            title: "T",
            speakers: ["A", "B"],
            qr: { src: "/specimen/slide-catalog/qr-example.png", href: "https://example.com/" },
          },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    const xml = await de.file("ppt/slides/slide1.xml")!.async("string");
    expect(norm(unescapeNamedEntities(xml.replace(/<[^>]+>/g, "")))).toContain(norm("A und B"));
    expect(unescapeNamedEntities(xml)).toContain('descr="QR-Code: example.com"');
  });

  it("prints its own words in the deck's language and marks no unnamed cycle segment", async () => {
    const segments = [
      { label: "A", percentage: 50 },
      { label: "B", percentage: 50 },
    ];
    const { zip: de } = await rendered({
      name: "D",
      lang: "de",
      slides: [
        {
          type: "comparison",
          variant: "guidance",
          headline: "H",
          examples: [{ title: "T", bad: "b", good: "g" }],
        },
        { type: "closing", variant: "discussion" },
        { type: "chart", variant: "cycle", headline: "C", segments },
        { type: "chart", variant: "cycle", headline: "C", segments, currentSegmentIndex: 0 },
      ],
    });
    const text = async (n: number) =>
      unescapeNamedEntities(
        (await de.file(`ppt/slides/slide${n}.xml`)!.async("string")).replace(/<[^>]+>/g, " "),
      );
    // The labels keep the deck's case and are drawn in capitals, so an edit keeps them capitals.
    expect(await de.file("ppt/slides/slide1.xml")!.async("string")).toMatch(
      /cap="all"[^>]*>.*?<a:t>Schlecht<\/a:t>.*cap="all"[^>]*>.*?<a:t>Gut<\/a:t>/s,
    );
    expect(await text(2)).toContain("Diskussion");
    // The shape that holds the first segment's label, teal where it is marked.
    const label = async (n: number) => {
      const xml = await de.file(`ppt/slides/slide${n}.xml`)!.async("string");
      const before = xml.slice(0, xml.indexOf("<a:t>A</a:t>"));
      return before.slice(before.lastIndexOf("<p:sp>"));
    };
    const teal = `val="${tokens["--color-teal"].slice(1).toUpperCase()}"`;
    expect(await label(3)).not.toContain(teal);
    expect(await label(4)).toContain(teal);
  });

  it("draws a regular and a pillars grid slide as the content slides the web redraws them as", async () => {
    const regular = slideCatalog.slides.find(
      (x) => x.type === "regular" && !x.profile && x.layout !== "cards",
    ) as Extract<Slide, { type: "regular" }>;
    const grid = slideCatalog.slides.find(
      (x) => x.type === "grid" && (x.variant ?? "pillars") === "pillars",
    ) as Extract<Slide, { type: "grid"; variant?: "pillars" }>;
    const { zip: zipped } = await rendered({
      name: "R",
      slides: [regular, regularAsContent(regular)!, grid, gridAsContent(grid)] as Slide[],
    });
    const xmlOf = (n: number) => zipped.file(`ppt/slides/slide${n}.xml`)!.async("string");
    // Each pair is one drawing, but for the shapes' ids and names and the page counter.
    const shapes = (xml: string) =>
      xml.replace(/ id="\d+"| name="[^"]*"|<a:t>\d+ \/ \d+<\/a:t>/g, "");
    expect(shapes(await xmlOf(1))).toBe(shapes(await xmlOf(2)));
    expect(shapes(await xmlOf(3))).toBe(shapes(await xmlOf(4)));
  });

  it("sets a quote grid as the web's brand quote: upright, no quotation marks, the author in teal", () => {
    const at = slideCatalog.slides.findIndex((x) => x.type === "grid" && x.variant === "quotes");
    const xml = slideXml[at];
    const slide = slideCatalog.slides[at] as Extract<Slide, { type: "grid" }>;
    expect(xml).not.toContain("“");
    expect(xml).not.toContain(' i="1"');
    const teal = tokens["--color-teal"].slice(1).toUpperCase();
    for (const { author } of slide.cards) {
      const run = xml.slice(0, xml.indexOf(`<a:t>${author}</a:t>`));
      expect(run.slice(run.lastIndexOf("<a:rPr"))).toMatch(new RegExp(`b="1".*val="${teal}"`, "s"));
    }
  });

  it("names a team picture's types under it unless the slide turns its legend off", () => {
    const at = slideCatalog.slides.flatMap((x, i) => (x.type === "team-topology" ? [i] : []));
    const named = at.map((i) => slideXml[i].includes(`<a:t>${WORDS.en.teams.enabling}</a:t>`));
    expect(named).toEqual(
      at.map(
        (i) =>
          (slideCatalog.slides[i] as Extract<Slide, { type: "team-topology" }>).legend !== false,
      ),
    );
    expect(named).toContain(true);
    expect(named).toContain(false);
  });

  it("gives a Gantt bar's label its own line, under the months and the row above", () => {
    const at = slideCatalog.slides.findIndex((s) => s.type === "gantt");
    const d = slideCatalog.slides[at] as Extract<Slide, { type: "gantt" }>;
    const box = (text: string) => {
      const sp = slideXml[at].split("<p:sp>").find((x) => x.includes(`>${text}<`))!;
      const [, y, cy] = /<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"/.exec(sp)!;
      return { top: +y, bottom: +y + +cy };
    };
    const months = Math.max(...d.columns.map((c) => box(c).bottom));
    for (const bar of d.rows.flatMap((row) => row.bars))
      expect(
        box(bar.label).top,
        `slide ${at + 1} (${d.type}), bar "${bar.label}" under the months`,
      ).toBeGreaterThanOrEqual(months);
    for (const [i, row] of d.rows.slice(1).entries()) {
      for (const bar of row.bars)
        expect(
          box(bar.label).top,
          `slide ${at + 1} (${d.type}), bar "${bar.label}"`,
        ).toBeGreaterThanOrEqual(box(d.rows[i].label).bottom);
    }
  });

  it("stacks milestones that share a column, as the web does", async () => {
    const xml = await onlySlide({
      type: "gantt",
      headline: "H",
      columns: ["Q1", "Q2"],
      rows: [{ label: "R", bars: [{ label: "B", start: 1, span: 2 }] }],
      milestones: [
        { label: "Review", column: 2 },
        { label: "Go-live", column: 2 },
      ],
    });
    const top = (text: string) =>
      xml
        .split("<p:sp>")
        .find((sp) => sp.includes(`>${text}<`))
        ?.match(/<a:off x="\d+" y="(\d+)"/)?.[1];
    expect(top("Review")).toBeDefined();
    expect(Number(top("Go-live"))).toBeGreaterThan(Number(top("Review")));
  });

  it("draws a roadmap's items column beside its phased one", async () => {
    const xml = await onlySlide({
      type: "roadmap",
      headline: "H",
      columns: [
        {
          label: "A",
          title: "Phased",
          accent: "ingredients",
          phases: [{ label: "P", items: [{ title: "Pill" }] }],
        },
        { label: "B", title: "Listed", accent: "deepdive", items: [{ title: "Listed item" }] },
      ],
    });
    expect(xml).toContain("Pill");
    expect(xml).toContain("Listed item");
  });

  it("draws a complicated-subsystem branch in the team's colour", async () => {
    const slide = slideCatalog.slides.find(
      (x) => x.type === "decision" && x.yes.team === "complicated-subsystem",
    )!;
    const factory = tokens["--color-factory"].slice(1).toUpperCase();
    expect(await onlySlide(slide)).toContain(`<a:srgbClr val="${factory}"/>`);
  });

  it("draws a centered content slide the statement type takes as that statement", async () => {
    const slide: ContentSlide = {
      type: "content",
      layout: "centered",
      headline: "One claim",
      content: [{ type: "paragraph", text: "Under it." }],
    };
    expect(await onlySlide(slide)).toBe(await onlySlide(contentRedrawnAs(slide)!));
  });

  it("marks only a vs comparison's items, bullets a split's and strikes only a struck before side", () => {
    const sided = slideCatalog.slides.flatMap((slide: Slide, i) => {
      const sides = slide.type === "content" ? twoColumnAsSplit(slide) : slide;
      return sides?.type === "comparison" &&
        sides.variant !== "positions" &&
        sides.variant !== "guidance"
        ? [{ sides, xml: slideXml[i], at: `slide ${i + 1}`, converted: slide !== sides }]
        : [];
    });
    expect(sided.map((s) => s.sides.variant ?? "vs")).toEqual(
      expect.arrayContaining(["vs", "before-after", "split"]),
    );
    // A lone neutral two-column exports as the split it reads as on the web.
    expect(sided.some((s) => s.converted)).toBe(true);
    for (const { sides, xml, at } of sided) {
      const variant = sides.variant ?? "vs";
      expect(xml.includes("<a:t>+  </a:t>"), at).toBe(variant === "vs");
      expect(xml.includes("<a:t>−  </a:t>"), at).toBe(variant === "vs");
      expect(xml.includes("<a:buChar"), at).toBe(variant === "split");
      expect(xml.includes('strike="sngStrike"'), at).toBe(
        variant === "before-after" && sides.strike !== false,
      );
    }
  });
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
    const { zip: pptx } = await rendered(
      { ...slideCatalog, slides: phases.map(slide) as Slide[] },
      join(import.meta.dirname, "..", "specimen"),
    );
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

describe("slides-pptx draws what the slide shows", () => {
  it("numbers a process's tiles as FlowSteps does, a numbered: false step's tile empty", () => {
    const i = specimenAt(
      (x) => x.type === "process" && x.headline === "A request through three teams",
    );
    const tiles = shapesOf(slideXml[i]).filter(
      (sh) => sh.prst === "roundRect" && Math.abs(sh.w! - sh.h!) < 0.01,
    );
    expect(tiles).toHaveLength(5);
    const numbers = shapesOf(slideXml[i]).filter((sh) => /^\d$/.test(sh.texts.join("")));
    expect(numbers.map((sh) => sh.texts.join(""))).toEqual(["1", "2", "3"]);
    // Each number in a tile, the first and last tiles empty.
    for (const [n, t] of numbers.map((sh, k) => [sh, tiles[k + 1]] as const))
      expect(Math.abs(n.x! - t.x!)).toBeLessThan(0.01);
  });

  it("draws a team picture as the web lays it out: enabling columns side by side, subsystem octagons in one row, the platform teams in one dotted frame, roles beside a stream team's name", () => {
    const i = specimenAt(
      (x) =>
        x.type === "team-topology" &&
        (x.complicatedSubsystem?.length ?? 0) > 1 &&
        x.platform.length > 1 &&
        x.enabling.length > 0,
    );
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "team-topology" }>;
    const shapes = shapesOf(slideXml[i]);
    const top = (sh: { y?: number }) => +sh.y!.toFixed(2);
    const frames = shapes.filter((sh) => sh.dash === "sysDot" && sh.w! > 2);
    expect(frames).toHaveLength(1);
    // The legend's swatch, under the platform frame, is an octagon too.
    const octagons = shapes.filter((sh) => sh.prst === "octagon" && sh.y! < frames[0].y!);
    expect(octagons).toHaveLength(slide.complicatedSubsystem!.length);
    expect(new Set(octagons.map(top)).size).toBe(1);
    for (const t of slide.platform) {
      const name = shapes.find((sh) => sh.texts.join("") === t.name)!;
      expect(name.x!).toBeGreaterThanOrEqual(frames[0].x!);
      expect(name.y!).toBeGreaterThanOrEqual(frames[0].y!);
      expect(name.y! + name.h!).toBeLessThanOrEqual(frames[0].y! + frames[0].h!);
    }
    const purple = tokens["--color-purple"].slice(1).toUpperCase();
    const enabling = shapes.filter(
      (sh) =>
        sh.xml.includes(`<a:ln w="`) &&
        sh.xml.includes(`val="${purple}"/></a:solidFill><a:prstDash`) &&
        sh.h! > 1,
    );
    expect(enabling.length).toBe(slide.enabling.length);
    expect(new Set(enabling.map(top)).size).toBe(1);
    // A short team's roles follow its name on its line, on the first team picture.
    const j = specimenAt((x) => x.type === "team-topology");
    const team = (slideCatalog.slides[j] as typeof slide).streamAligned[0];
    const first = shapesOf(slideXml[j]);
    const name = first.find((sh) => sh.texts.join("") === team.name)!;
    const roles = first.find((sh) =>
      sh.texts
        .join("")
        .replace(/\u00a0/g, " ")
        .includes(team.roles[0]),
    )!;
    expect(Math.abs(name.y! + name.h! / 2 - (roles.y! + roles.h! / 2))).toBeLessThan(0.05);
    expect(roles.x!).toBeGreaterThan(name.x! + name.w!);
  });

  it("draws a wheel's segments as arcs with a gap between them", () => {
    const i = specimenAt((x) => x.type === "wheel");
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "wheel" }>;
    expect(shapesOf(slideXml[i]).filter((sh) => sh.prst === "blockArc")).toHaveLength(
      slide.segments.length,
    );
  });

  it("sets a statement's QR code in a white card with its address under it, as QrStatement", () => {
    const i = specimenAt((x) => x.type === "statement" && !!x.qr && !x.attribution);
    const shapes = shapesOf(slideXml[i]);
    const card = shapes.find((sh) => sh.fill === "FFFFFF" && Math.abs(sh.w! - sh.h!) < 0.01)!;
    expect(card.w).toBeGreaterThan(3);
    const address = shapes.find((sh) => sh.texts.join("").startsWith("↗"))!;
    expect(address.y!).toBeGreaterThan(card.y! + card.h!);
  });

  it("gives each of a question's options its count, as the printed QuestionSlide", () => {
    const i = specimenAt((x) => x.type === "question");
    const slide = slideCatalog.slides[i] as Extract<Slide, { type: "question" }>;
    const counts = shapesOf(slideXml[i]).filter(
      (sh) => sh.texts.join("") === "0" && sh.xml.includes(`val="${TEAL}"`),
    );
    expect(counts).toHaveLength(slide.options.length);
  });

  it("centres a contact closing's column in the slide, as ContactVariant", () => {
    const i = specimenAt(
      (x) =>
        x.type === "closing" && x.variant !== "discussion" && !x.speakers?.some((p) => p.imageSrc),
    );
    const texts = shapesOf(slideXml[i]).filter((sh) => sh.texts.join("").trim() && sh.y! < 6.8);
    const top = Math.min(...texts.map((sh) => sh.y!));
    const bottom = Math.max(...texts.map((sh) => sh.y! + sh.h!));
    expect(Math.abs((top + bottom) / 2 - 3.75)).toBeLessThan(0.1);
  });
});

describe("slides-pptx slide variants", () => {
  it.each([
    {
      name: "evolution",
      replaced: pptxSlideVariants.evolution,
      replacement: evolutionAsProcess(pptxSlideVariants.evolution),
    },
    {
      name: "dual-pill-overview",
      replaced: pptxSlideVariants.dualPill,
      replacement: dualPillAsRoadmap(pptxSlideVariants.dualPill),
    },
  ])("draws $name as its replacement", async ({ replaced, replacement }) => {
    const xml = await onlySlide(replaced);
    expect(xml).toBe(await onlySlide(replacement));
  });

  it("rejects a slide with an unknown type", async () => {
    const unsupported = { type: "nope" } as unknown as Slide;
    expect(await rejection(onlySlide(unsupported))).toBe(
      'Error: slide 1 is a "nope", which slides-pptx cannot draw',
    );
  });

  it("draws a section beside a regular slide's profile", async () => {
    const xml = await onlySlide(pptxSlideVariants.regular);
    const shapes = shapesOf(xml);
    const profile = shapes.find((shape) => shape.texts.includes("Ari Example"));
    const section = shapes.find((shape) => shape.texts.includes("A short summary"));
    assert(profile, "profile text");
    assert(section, "section text");
    expect(section.x).toBeGreaterThan(profile.x + profile.w);
    expect(section.texts).toEqual([
      "Findings",
      "A short summary",
      "Interview notes",
      "Read the report",
    ]);
  });

  it("sets a centred statement's closing in italic between quotation marks", async () => {
    const xml = await onlySlide(pptxSlideVariants.quote);
    const closing = shapesOf(xml).find((shape) => shape.texts.includes("Start small"));
    assert(closing, "closing text");
    expect(closing.texts).toEqual(["“", "Start small", "”"]);
    expect(closing.xml).toMatch(
      /<a:r><a:rPr[^>]*\bi="1"[^>]*>.*?<\/a:rPr><a:t>Start small<\/a:t><\/a:r>/s,
    );
  });

  it.each([
    ["kicker", "Live demo"],
    ["first point", "Open the sample"],
    ["second point", "Run the demo"],
    ["closing", "Bring questions"],
  ])("draws the QR statement's %s to the left of the card", async (_part, label) => {
    const xml = await onlySlide(pptxSlideVariants.qr);
    const shapes = shapesOf(xml);
    const card = shapes.find((shape) => shape.prst === "roundRect");
    const text = shapes.find((shape) => shape.texts.includes(label));
    assert(card, "QR card");
    assert(text, label);
    expect(text.x + text.w).toBeLessThan(card.x);
  });

  it("draws a picture-side statement's struck claim before its lines", async () => {
    const xml = await onlySlide(pptxSlideVariants.side);
    const statement = shapesOf(xml).find((shape) => shape.texts.includes("Share the results"));
    assert(statement, "statement text");
    expect(statement.texts.slice(0, 2)).toEqual(["Keep them private", "Share the results"]);
    expect(statement.xml).toMatch(
      /<a:r><a:rPr[^>]*strike="sngStrike"[^>]*>.*?<\/a:rPr><a:t>Keep them private<\/a:t><\/a:r>/s,
    );
  });

  it("numbers the points of a picture-side statement", async () => {
    const xml = await onlySlide(pptxSlideVariants.side);
    const statement = shapesOf(xml).find((shape) => shape.texts.includes("Share the results"));
    assert(statement, "statement text");
    expect(statement.texts.slice(-4).map((text) => text.trim())).toEqual([
      "01",
      "Write a summary",
      "02",
      "Send it",
    ]);
  });

  it("draws the comparison logo inside its side's card", async () => {
    const xml = await onlySlide(pptxSlideVariants.comparison);
    const picture =
      /<p:pic>(?:(?!<\/p:pic>).)*descr="First supplier"(?:(?!<\/p:pic>).)*?<a:off x="(\d+)" y="(\d+)".*?<a:ext cx="(\d+)" cy="(\d+)"/s.exec(
        xml,
      );
    assert(picture, "first supplier's picture");
    const [x, y, w, h] = picture.slice(1).map((value) => Number(value) / 914400);
    const label = shapesOf(xml).find((shape) => shape.texts.includes("First supplier"));
    assert(label, "first supplier's label");
    const card = shapesOf(xml).find((shape) => shape.prst === "round2DiagRect");
    assert(card, "first supplier's card");
    expect(x).toBeGreaterThan(card.x);
    expect(x + w).toBeLessThan(card.x + card.w);
    expect(y).toBeGreaterThan(card.y);
    expect(y + h).toBeLessThan(label.y);
  });

  it("draws the named subsystem without a description", async () => {
    const xml = await onlySlide(pptxSlideVariants.subsystem);
    const shapes = shapesOf(xml);
    expect(shapes.filter((shape) => shape.prst === "octagon")).toHaveLength(1);
    expect(shapes.flatMap((shape) => shape.texts)).toEqual([
      "01 / 01",
      "Delivery teams",
      "Storefront",
      "• ",
      "Engineer",
      "Payments",
      "Hosting",
    ]);
  });

  it("draws the stream team alone when no platform is supplied", async () => {
    const xml = await onlySlide(pptxSlideVariants.noPlatform);
    const shapes = shapesOf(xml);
    expect(shapes.filter((shape) => shape.prst === "round2DiagRect")).toHaveLength(1);
    expect(shapes.filter((shape) => shape.dash === "sysDot")).toEqual([]);
    expect(shapes.flatMap((shape) => shape.texts)).toEqual([
      "01 / 01",
      "Delivery teams",
      "Storefront",
      "• ",
      "Engineer",
    ]);
  });
});
