import { join } from "node:path";
import verbal from "@hackersandwizards/brand/verbal.json";
import { tokens } from "@hackersandwizards/brand/tokens";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import { assert, beforeAll, describe, expect, it } from "vitest";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import { dualPillAsRoadmap, evolutionAsProcess } from "../lib/slide-aliases";
import { WORDS } from "../lib/slide-words";
import {
  norm,
  onlySlide,
  rendered,
  shapesOf,
  specimen,
  specimenAt,
  specimenSlide,
  TEAL,
  unescapeNamedEntities,
} from "./fixtures/rendered-deck";
import { pptxSlideVariants } from "./fixtures/pptx-slide-variants";

let slideXml: string[];

beforeAll(async () => {
  ({ slideXml } = await specimen());
}, 60_000);

const neutralColumns = specimenSlide("Two lists, one block", "content");

describe("slides-pptx on the specimen deck", () => {
  describe("brand claim on a contact closing", () => {
    const decks = [
      {
        name: "English default",
        lang: "en",
        closing: { type: "closing", variant: "contact", line1: "Danke." },
      },
      {
        name: "German default",
        lang: "de",
        closing: { type: "closing", variant: "contact", line1: "Danke." },
      },
      {
        name: "English with the claim off",
        lang: "en",
        closing: { type: "closing", variant: "contact", line1: "Danke.", claim: false },
      },
    ] as const;
    let closings: string[];

    beforeAll(async () => {
      closings = await Promise.all(
        decks.map(async ({ name, lang, closing }) => {
          const { slideXml } = await rendered({
            name,
            slides: [{ type: "title", title: "T", lang }, closing],
          });
          return slideXml[1];
        }),
      );
    });

    it.each([
      { name: "English default", at: 0, expected: [verbal.claim.en] },
      { name: "German default", at: 1, expected: [verbal.claim.de] },
      { name: "English with the claim off", at: 2, expected: [] },
    ])("sets the claim for $name", ({ at, expected }) => {
      const text = norm(unescapeNamedEntities(closings[at].replace(/<[^>]+>/g, "")));
      const visible = [verbal.claim.en, verbal.claim.de].filter((claim) =>
        text.includes(norm(claim)),
      );
      expect(visible).toEqual(expected);
    });

    // One row: the claim's box no higher than its size times the line's 1.25, with some slack.
    it.each([
      { lang: "English", at: 0, word: verbal.claim.word.en },
      { lang: "German", at: 1, word: verbal.claim.word.de },
    ])("sets the $lang claim on one row", ({ at, word }) => {
      const boxes = shapesOf(closings[at]).filter((shape) => shape.texts.includes(word));
      expect(boxes).toHaveLength(1);
      const [box] = boxes;
      const size = /sz="(\d+)"/.exec(box.xml);
      assert(size, "The claim has a font size");
      expect(box.h * 72).toBeLessThan((+size[1] / 100) * 1.25 * 1.5);
    });
  });

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

  it.each([
    {
      name: "regular without a profile",
      replaced: {
        type: "regular",
        headline: "Regular slide, one section, no profile",
        sections: [{ title: "One section", items: ["Drawn as a content slide", "No sidebar"] }],
      },
      replacement: {
        type: "content",
        headline: "Regular slide, one section, no profile",
        content: [
          { type: "paragraph", text: "**One section**" },
          { type: "bullets", items: ["Drawn as a content slide", "No sidebar"] },
        ],
      },
    },
    {
      name: "pillars grid",
      replaced: {
        type: "grid",
        variant: "pillars",
        sectionLabel: "Grid",
        headline: "Four pillars",
        columns: 4,
        cards: [
          { title: "Tools", description: "What the agent uses.", icon: "wrench" },
          { title: "Knowledge", description: "What it reads.", icon: "book" },
          { title: "Checks", description: "What is enforced.", icon: "shield" },
          { title: "Metrics", description: "What we learn.", icon: "bar-chart" },
        ],
      },
      replacement: {
        type: "content",
        sectionLabel: "Grid",
        headline: "Four pillars",
        content: [
          {
            type: "cards",
            columns: 4,
            numbered: false,
            reveal: true,
            dense: true,
            items: [
              { title: "Tools", text: "What the agent uses.", icon: "wrench" },
              { title: "Knowledge", text: "What it reads.", icon: "book" },
              { title: "Checks", text: "What is enforced.", icon: "shield" },
              { title: "Metrics", text: "What we learn.", icon: "bar-chart" },
            ],
          },
        ],
      },
    },
  ] satisfies { name: string; replaced: Slide; replacement: Slide }[])(
    "draws a $name as its content slide",
    async ({ replaced, replacement }) => {
      const { slideXml } = await rendered({
        name: "Replaced forms",
        slides: [replaced, replacement],
      });
      // Each pair is one drawing, but for the shapes' ids and names and the page counter.
      const [actual, expected] = slideXml.map((xml) =>
        xml.replace(/ id="\d+"| name="[^"]*"|<a:t>\d+ \/ \d+<\/a:t>/g, ""),
      );
      expect(actual).toBe(expected);
    },
  );

  // A lone neutral two-column exports as the split it reads as on the web.
  it.each([
    {
      name: "centered content",
      replaced: {
        type: "content",
        layout: "centered",
        headline: "One claim",
        content: [{ type: "paragraph", text: "Under it." }],
      },
      replacement: { type: "statement", lines: ["One claim"], subtitle: "Under it." },
    },
    {
      name: "neutral columns",
      replaced: neutralColumns,
      replacement: {
        type: "comparison",
        variant: "split",
        headline: "Two lists, one block",
        left: { label: "Chat", items: ["Answers a question", "Forgets the session"] },
        right: { label: "Agent", items: ["Edits the files", "Runs the checks"] },
        punchline: "Pick by what the work needs.",
        notes: neutralColumns.notes,
      },
    },
  ] satisfies { name: string; replaced: Slide; replacement: Slide }[])(
    "draws $name as its replacement",
    async ({ replaced, replacement }) => {
      expect(await onlySlide(replaced)).toBe(await onlySlide(replacement));
    },
  );

  it("sets a quote grid as the web's brand quote: upright, no quotation marks, the author in teal", async () => {
    const authors = ["Engineer, fictional", "Team lead, fictional", "Product lead, fictional"];
    const xml = await onlySlide({
      type: "grid",
      variant: "quotes",
      sectionLabel: "Voices",
      headline: "What participants said",
      columns: 3,
      cards: [
        { title: "I review plans now, not just diffs.", author: authors[0] },
        { title: "The checks caught what I missed.", author: authors[1] },
        { title: "Monday metrics changed our backlog.", author: authors[2] },
      ],
    });
    expect(xml).not.toContain("“");
    expect(xml).not.toContain(' i="1"');
    const runs = [...xml.matchAll(/<a:r>.*?<\/a:r>/gs)].map(([run]) => run);
    const authorRuns = runs.filter((run) =>
      authors.some((author) => run.includes(`<a:t>${author}</a:t>`)),
    );
    expect(authorRuns).toHaveLength(3);
    expect(
      authorRuns.flatMap((run) =>
        [...run.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(([, text]) => text),
      ),
    ).toEqual(authors);
    expect(authorRuns.filter((run) => !new RegExp(`b="1".*val="${TEAL}"`, "s").test(run))).toEqual(
      [],
    );
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

  const plainSplits = slideCatalog.slides.filter(
    (slide) => slide.notes === "comparison: split, no headline, long items, highlights.",
  );
  assert(
    plainSplits.length === 1,
    "The specimen has one split comparison with long items and no headline",
  );

  it.each([
    {
      name: "vs",
      slide: specimenSlide("Prompting against a harness", "comparison"),
      expected: { plus: true, minus: true, bullets: false, struck: false },
    },
    {
      name: "struck before-after",
      slide: specimenSlide("Before and after", "comparison"),
      expected: { plus: false, minus: false, bullets: false, struck: true },
    },
    {
      name: "split without a heading",
      slide: plainSplits[0],
      expected: { plus: false, minus: false, bullets: true, struck: false },
    },
    {
      name: "before-after without strike",
      slide: specimenSlide("How a change reaches production", "comparison"),
      expected: { plus: false, minus: false, bullets: false, struck: false },
    },
    {
      name: "before-after that adds",
      slide: specimenSlide("What stays, what needs building", "comparison"),
      expected: { plus: false, minus: false, bullets: false, struck: false },
    },
    {
      name: "neutral columns drawn as a split",
      slide: neutralColumns,
      expected: { plus: false, minus: false, bullets: true, struck: false },
    },
  ])("draws the $name comparison's list treatment", async ({ slide, expected }) => {
    const xml = await onlySlide(slide);
    expect({
      plus: xml.includes("<a:t>+  </a:t>"),
      minus: xml.includes("<a:t>−  </a:t>"),
      bullets: xml.includes("<a:buChar"),
      struck: xml.includes('strike="sngStrike"'),
    }).toEqual(expected);
  });
});

// The web lights the phase whose title matches `highlightPhase` in any case, and no phase without one.
it.each([
  { name: "with a loop", loop: true },
  { name: "without a loop", loop: false },
])("lights a process slide's phase by the web's rule, $name", async ({ loop }) => {
  const base = {
    type: "process",
    headline: "H",
    loop,
    nodes: [
      { title: "One", description: "d" },
      { title: "Two", description: "d" },
      { title: "Three", description: "d" },
    ],
  } satisfies Slide;
  const { slideXml } = await rendered({
    ...slideCatalog,
    slides: [
      { ...base, highlightPhase: "Two" },
      { ...base, highlightPhase: "two" },
      base,
      { ...base, highlightPhase: "Nope" },
      { ...base, highlightPhase: "Three" },
    ],
  });
  // Each slide's colours in drawing order: the slides differ in nothing else but name and page.
  const [exact, lower, none, unknown, last] = slideXml.map((xml) =>
    [...xml.matchAll(/srgbClr val="(\w+)"/g)].map(([, color]) => color).join(),
  );
  expect(lower).toBe(exact);
  expect(none).toBe(unknown);
  expect(none).not.toBe(last);
});

describe("slides-pptx draws what the slide shows", () => {
  it("numbers a process's tiles as FlowSteps does, a numbered: false step's tile empty", async () => {
    const xml = await onlySlide({
      type: "process",
      headline: "A request through three teams",
      loop: false,
      nodes: [
        { title: "Customer", description: "Raises the request.", numbered: false },
        { title: "Intake", description: "Sizes and plans it." },
        { title: "Build", description: "Ships it behind a flag." },
        { title: "Operate", description: "Turns the flag on." },
        { title: "Customer", description: "Uses the result.", numbered: false },
      ],
    });
    const shapes = shapesOf(xml);
    const tiles = shapes.filter((shape) => shape.prst === "roundRect");
    expect(tiles).toHaveLength(5);
    expect(tiles.filter(({ w, h }) => Math.abs(w - h) >= 0.01)).toEqual([]);
    const numbers = shapes.filter((shape) => /^\d$/.test(shape.texts.join("")));
    expect(numbers.map((shape) => shape.texts.join(""))).toEqual(["1", "2", "3"]);
    // Each number in a tile, the first and last tiles empty.
    expect(numbers.filter((number, i) => Math.abs(number.x - tiles[i + 1].x) >= 0.01)).toEqual([]);
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

  const { type, lines, qr } = pptxSlideVariants.qr;
  const qrStatement = { type, lines, qr };

  it.each([
    { part: "kicker", slide: { ...qrStatement, kicker: "Live demo" }, text: "Live demo" },
    {
      part: "first point",
      slide: { ...qrStatement, points: ["Open the sample"] },
      text: "Open the sample",
    },
    {
      part: "second point",
      slide: { ...qrStatement, points: ["Check the settings", "Run the demo"] },
      text: "Run the demo",
    },
    {
      part: "closing",
      slide: { ...qrStatement, closing: "Bring questions" },
      text: "Bring questions",
    },
  ])("draws the QR statement's $part to the left of the card", async ({ slide, text }) => {
    const xml = await onlySlide(slide);
    const shapes = shapesOf(xml);
    const card = shapes.find((shape) => shape.prst === "roundRect");
    const part = shapes.find((shape) => shape.texts.includes(text));
    assert(card, "QR card");
    assert(part, text);
    expect(part.x + part.w).toBeLessThan(card.x);
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
