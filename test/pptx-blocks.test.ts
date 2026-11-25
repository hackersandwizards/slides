import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import { tokens } from "@hackersandwizards/brand/tokens";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { itemCard } from "../scripts/pptx/blocks/columns";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { slideCatalog, specimenImages } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import { labeledGridAsCards } from "../lib/content-block-aliases";
import {
  onlySlide,
  PRINT_REM,
  rendered,
  shapesOf,
  specimen,
  specimenSlide,
  TEAL,
} from "./fixtures/rendered-deck";
import { pptxBlockVariants } from "./fixtures/pptx-block-variants";

let slideXml: string[];

beforeAll(async () => {
  ({ slideXml } = await specimen());
}, 60_000);

describe("slides-pptx block rendering", () => {
  // The annotated image's band, 8 % to 52 % of the picture (F06).
  it("crops an annotated image to its band", () => {
    const i = slideCatalog.slides.findIndex((x) =>
      JSON.stringify(x).includes('"crop":{"top":0.08,"bottom":0.52}'),
    );
    expect(slideXml[i]).toContain('<a:srcRect l="0" r="0" t="8000" b="48000"/>');
  });

  it("tints a table's head and every second body row, as the web's table", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Delivery measures",
      content: [
        {
          type: "table",
          headers: ["Team", "Lead time", "Change failure rate"],
          rows: [
            ["Checkout", "2 days", "4%"],
            ["Search", "5 days", "9%"],
            ["Billing", "11 days", "15%"],
          ],
        },
      ],
    });
    const table = /<a:tbl>.*?<\/a:tbl>/s.exec(xml);
    assert(table, "The table has native table markup");
    // Each row's first cell fill, after its borders: the head, then the three body rows.
    const fills = [
      ...table[0].matchAll(/<a:tr\b.*?<\/a:lnB><a:solidFill><a:srgbClr val="(\w+)"/gs),
    ].map((m) => m[1]);
    const tint = tokens["--color-tint"].slice(1).toUpperCase();
    const white = tokens["--color-white"].slice(1).toUpperCase();
    expect(fills).toEqual([tint, white, tint, white]);
  });

  it("sets a content slide's quote behind a purple rule, its source in grey", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Releases stopped being events",
      content: [
        {
          type: "quote",
          text: "We stopped asking for a release date. The question became which customer saw the change first.",
          source: "Mara Lindqvist, platform lead, [field notes](https://example.com/field-notes)",
        },
      ],
    });
    const purple = tokens["--color-purple"].slice(1).toUpperCase();
    const muted = tokens["--color-muted"].slice(1).toUpperCase();
    // The brand strip at the top edge also uses purple.
    const shapes = shapesOf(xml).filter(({ y }) => y > 0);
    const rules = shapes.filter((shape) => shape.fill === purple);
    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(rule.w).toBeLessThan(0.02);
    const quotes = shapes.filter((shape) =>
      shape.texts.join("").startsWith("We stopped asking for a release date."),
    );
    expect(quotes).toHaveLength(1);
    const [words] = quotes;
    const sources = [...words.xml.matchAll(/<a:r>.*?<\/a:r>/gs)]
      .map(([run]) => run)
      .filter((run) => run.includes("<a:t>Mara Lindqvist"));
    expect(sources).toEqual([expect.stringContaining(`val="${muted}"`)]);
    // The words stand brand's 2 px rule and 1.25 rem gap off the rule, at the print route's 21.333
    // px rem; the export stood them 20 px off.
    expect(words.x - rule.x).toBeCloseTo((2 + 1.25 * 21.333) / 144, 3);
  });

  it.each([
    {
      name: "an info callout",
      hue: "--color-purple",
      slide: {
        type: "content",
        sectionLabel: "Stage strip",
        stageMarker: ["Implement", "Review"],
        headline: "Stage strip marks where in the pipeline we are",
        content: [
          { type: "callout", text: "Two stages are active on this slide.", variant: "info" },
        ],
      },
    },
    {
      name: "a process footer",
      hue: "--color-teal",
      slide: {
        type: "process",
        headline: "From autocomplete to delivery harness",
        loop: false,
        highlightPhase: "Harness",
        nodes: [
          {
            label: "1x",
            title: "Autocomplete",
            subtitle: "Line by line",
            description: "Faster typing.",
            dimmed: true,
          },
          { label: "3x", title: "Chat", subtitle: "Task by task", description: "Copy and paste." },
          {
            label: "10x",
            title: "Harness",
            subtitle: "Ticket by ticket",
            description: "Plans, checks, review.",
            badge: "You are here",
          },
        ],
        footer: "Each stage changes what a person reviews.",
      },
    },
  ] as const satisfies readonly { name: string; hue: keyof typeof tokens; slide: Slide }[])(
    "draws $name as brand's callout, $hue at 10 percent on white with no line",
    async ({ hue, slide }) => {
      const xml = await onlySlide(slide);
      const tint = [1, 3, 5]
        .map((i) => Math.round(parseInt(tokens[hue].slice(i, i + 2), 16) * 0.1 + 255 * 0.9))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      const callouts = shapesOf(xml).filter((shape) => shape.fill === tint);
      expect(callouts.map((shape) => shape.xml.split("</p:spPr>")[0])).toEqual([
        expect.stringContaining("<a:ln></a:ln>"),
      ]);
    },
  );

  it("prints a bar's figure with the deck's decimal mark", async () => {
    const { zip } = await rendered({
      name: "T",
      lang: "de",
      slides: [
        {
          type: "content",
          headline: "H",
          content: [{ type: "bars", max: 10, bars: [{ label: "a", value: 2.5 }] }],
        },
      ],
    });
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain(">2,5<");
  });

  // The export drew three forms by rules of its own (F11).
  it("draws a labeled grid as the cards block the web draws it as", async () => {
    const block = {
      type: "labeled-grid" as const,
      items: [1, 2, 3, 4].map((n) => ({ title: `T${n}`, subtitle: `s${n}` })),
    };
    const content = (b: ContentSlide["content"][number]): Slide => ({
      type: "content",
      headline: "H",
      content: [b],
    });
    expect(await onlySlide(content(block))).toBe(
      await onlySlide(content(labeledGridAsCards(block))),
    );
  });

  it("draws a toned two-column's markers in its hues and a neutral one's in teal", async () => {
    const column = { title: "T", items: ["one"] };
    const xml = await onlySlide({
      type: "content",
      headline: "H",
      content: [
        { type: "two-column", variant: "success-error", left: column, right: column },
        { type: "two-column", left: column, right: column },
      ],
    });
    const hues = [...xml.matchAll(/<a:buClr><a:srgbClr val="(\w+)"\/>/g)].map((m) => m[1]);
    const hex = (v: string) => v.replace("#", "").toUpperCase();
    expect(new Set(hues)).toEqual(
      new Set([
        hex(tokens["--color-green-dark"]),
        hex(tokens["--color-red"]),
        hex(tokens["--color-teal"]),
      ]),
    );
    expect(xml).not.toMatch(/&#xE00|<a:t>\+ {2}<\/a:t>/);
  });

  it("shrinks a transform's gap with its text", async () => {
    const items = Array.from({ length: 12 }, () => "A line of a long list, written out in full");
    const side = (label: string, list: string[]) => ({ label, items: list });
    const gap = async (list: string[]) => {
      const xml = await onlySlide({
        type: "content",
        headline: "H",
        content: [{ type: "transform", before: side("B", list), after: side("A", list) }],
      });
      return Number(/<a:ext cx="(\d+)" cy="914"\/>/.exec(xml)?.[1]);
    };
    expect(await gap(items)).toBeLessThan(await gap(["One"]));
  });

  it("puts a plus between the sides of a before-after that adds", async () => {
    const slide = specimenSlide("What stays, what needs building", "comparison");
    const xml = await onlySlide(slide);
    expect(xml).toContain("<a:t>+</a:t>");
    expect(xml).not.toContain("tailEnd");
  });

  it("spells out a linked image's link", async () => {
    const {
      slideText: [text],
    } = await rendered(
      {
        name: "Linked image",
        slides: [
          {
            type: "content",
            headline: "A screenshot with its link spelled out",
            content: [
              {
                type: "linked-image",
                src: specimenImages["screen-pull-request.png"],
                alt: "Fictional pull request",
                href: "https://forge.example.com/acme/payments/pull/128",
              },
            ],
          },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    expect(text).toContain("forge.example.com/acme/payments/pull/128");
  });

  it("covers a video with its poster", async () => {
    const { zip } = await rendered(
      {
        name: "Video poster",
        slides: [
          {
            type: "content",
            headline: "A screen recording, ready to play",
            content: [
              {
                type: "video",
                src: specimenImages["agent-session.mp4"],
                poster: specimenImages["agent-session-poster.png"],
                alt: "Fictional agent session",
                caption: "The agent session on a fictional repository, 10 seconds",
              },
            ],
          },
        ],
      },
      join(import.meta.dirname, ".."),
    );
    const rels = zip.file("ppt/slides/_rels/slide1.xml.rels");
    assert(rels, "The video slide has relationships");
    const poster = readFileSync(
      join(import.meta.dirname, "..", "specimen", "slide-catalog", "agent-session-poster.png"),
    );
    const pictures = await Promise.all(
      [...(await rels.async("string")).matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(
        async ([, name]) => {
          const picture = zip.file(`ppt/media/${name}`);
          assert(picture, `The picture part ${name} exists`);
          return Buffer.from(await picture.async("uint8array"));
        },
      ),
    );
    expect(pictures).toContainEqual(poster);
  });
});

// pptxgenjs splits a run at its \n into paragraphs, and text boxes and table cells reach it apart.
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
  const { zip } = await rendered(
    { ...slideCatalog, slides: [slide as Slide] },
    join(import.meta.dirname, "..", "specimen"),
  );
  const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const para = [...xml.matchAll(/<a:p>(.*?)<\/a:p>/g)].find((m) => m[1].includes(">one<"))!;
  expect(para[1].match(/<a:br\/>/g)).toHaveLength(1);
  expect(para[1]).toMatch(/>two .*three.* four<\/a:t>/);
});

// pptxgenjs stores every video cover as a PNG part: another format would sit there mislabelled.
it("warns on a video poster that is no PNG and sets no cover", async () => {
  const { warnings } = await rendered(
    {
      ...slideCatalog,
      slides: [
        {
          type: "content",
          headline: "Video",
          content: [
            {
              type: "video",
              src: "/slide-catalog/demo.mp4",
              poster: "/slide-catalog/demo.mp4",
            },
          ],
        },
      ],
    },
    join(import.meta.dirname, "..", "specimen"),
  );
  expect(warnings).toEqual([expect.stringContaining("poster")]);
});

describe("slides-pptx draws what the slide shows", () => {
  it("marks a plain card with the web's short teal rule, never a square", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Four cards, one highlighted, each with a list",
      content: [
        {
          type: "cards",
          columns: 4,
          highlight: 1,
          reveal: true,
          items: [
            { title: "Intake", text: "Tickets", items: ["Template", "Owner"] },
            { title: "Plan", text: "Before code", items: ["Steps", "Checks", "Risks"] },
            { title: "Build", text: "In the loop", items: ["Tests first", "Small commits"] },
            { title: "Ship", text: "Behind a flag", items: ["Review", "Rollout"] },
          ],
        },
      ],
    });
    // The brand strip at the top edge also uses teal.
    const body = shapesOf(xml).filter(({ y }) => y > 0);
    const rules = body
      .filter((shape) => shape.texts.length === 0)
      .filter((shape) => shape.fill === TEAL);
    expect(rules).toHaveLength(4);
    expect(Math.max(...rules.map(({ w }) => Math.abs(w - 4 * PRINT_REM)))).toBeLessThan(0.01);
    expect(rules.filter(({ h, w }) => h >= w / 4)).toEqual([]);
  });

  it("draws a numbers block's figures in teal mono over a rule, as the web's Numbers", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Numbers with a source",
      content: [
        {
          type: "numbers",
          items: [
            { value: "3x", label: "faster review" },
            { value: "-40%", label: "rework" },
            { value: "up to +70%", label: "fewer handoffs" },
          ],
          source: "Fictional figures",
        },
      ],
    });
    const shapes = shapesOf(xml);
    expect(shapes.filter((shape) => shape.prst === "line")).toHaveLength(3);
    const figures = shapes.filter((shape) => shape.texts.join("") === "3x");
    expect(figures).toHaveLength(1);
    const [figure] = figures;
    expect(figure.xml).toContain(`<a:srgbClr val="${TEAL}"/>`);
    expect(figure.xml).toContain('typeface="JetBrains Mono"');
  });

  it("writes a timeline figure's minus as the web's", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Two weeks to the first live version, two more to the measured result",
      content: [
        {
          type: "timeline",
          continues: "in",
          highlight: 2,
          events: [
            {
              title: "Plan",
              text: "Written from the tested prototype, not before it, and split into tasks the agent works on.",
            },
            {
              segment: "2 weeks",
              title: "Built and rolled out",
              text: "First live version behind a feature flag, then iterated and opened to everyone.",
            },
            {
              segment: "2 weeks",
              title: "Measured",
              text: "Against the team's metric: time per product text before and after.",
              figure: "-90 %",
            },
          ],
        },
      ],
    });
    expect(xml).toContain("<a:t>−90 %</a:t>");
    expect(xml).not.toContain("-90");
  });

  // A figure's box is one line high, so a wrapped figure warns as text taller than its box.
  it.each([1, 2, 4, 6])(
    "keeps a five-digit figure with its unit on one line with %i figures",
    async (count) => {
      const { warnings } = await rendered({
        name: "Numbers",
        slides: [
          {
            type: "content",
            sectionLabel: "Visual: numbers, one figure",
            headline: "One figure carries the slide",
            content: [
              {
                type: "numbers",
                items: Array.from({ length: count }, () => ({
                  value: "12.345 %",
                  label: "of teams review every plan",
                  text: "A decimal comma and a spaced unit, as a German deck writes them",
                })),
                source: "Fictional figures",
              },
            ],
          },
        ],
      });
      expect(warnings).toEqual([]);
    },
  );

  it("numbers a named scale's ends and quarters under its last track, as the web's Bars", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Ranges on a track",
      content: [
        {
          type: "bars",
          max: 100,
          bars: [
            { label: "Weekly digest", from: 45, value: 60, display: "45 to 60%", highlight: true },
            { label: "Chat summary", from: 55, value: 70, display: "55 to 70%", highlight: true },
            { label: "Status answers", from: 30, value: 55, display: "30 to 55%", highlight: true },
            { label: "Risk alerts", from: 50, value: 75, display: "50 to 75%", highlight: true },
            { label: "Audio recap", from: 15, value: 40, display: "15 to 40%" },
            { label: "Slide export", from: 20, value: 30, display: "20 to 30%" },
          ],
          source: "Fictional forecast: the chance to hit each option's success model",
        },
      ],
    });
    const ticks = shapesOf(xml).filter((shape) => /^(0|25|50|75|100)$/.test(shape.texts.join("")));
    expect(ticks.map((shape) => shape.texts.join(""))).toEqual(["0", "25", "50", "75", "100"]);
    expect(new Set(ticks.map((shape) => shape.y.toFixed(2))).size).toBe(1);
  });

  it("indents a numbered list as far as the measure assumes", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Numbered steps",
      content: [
        {
          type: "bullets",
          ordered: true,
          items: ["Write the plan", "Review the plan", "Let the agent build", "Review the result"],
        },
      ],
    });
    const numbered = [...xml.matchAll(/<a:pPr([^>]*)>(?:(?!<\/a:pPr>).)*<a:buAutoNum/g)];
    const margins = numbered.flatMap(([, attrs]) =>
      [...attrs.matchAll(/marL="(\d+)"/g)].map(([, margin]) => margin),
    );
    const indent = String(16 * 12700);
    expect(margins).toEqual([indent, indent, indent, indent]);
  });

  // The annotated code's lines at the web's 1.3 em.
  it("sets annotated code at a line spacing of 1.3 em", async () => {
    const xml = await onlySlide({
      type: "content",
      headline: "Annotated code marks the lines that matter",
      content: [
        {
          type: "annotated-code",
          language: "typescript",
          code: "const plan = await agent.plan(ticket);\nawait review(plan);\nconst diff = await agent.build(plan);\nawait review(diff);",
          notes: [
            { line: 2, text: "A person reads the plan first" },
            { line: 4, text: "and the diff last" },
          ],
        },
      ],
    });
    const code = shapesOf(xml).filter((shape) => shape.texts.join("").startsWith("const plan"));
    expect(code.map((shape) => shape.xml)).toEqual([
      expect.stringContaining(`<a:spcPts val="${Math.round(16 * 1.3 * 100)}"/>`),
    ]);
  });
});

describe("slides-pptx block variants", () => {
  it("sets single-asterisk emphasis in bold amber", async () => {
    const xml = await onlySlide(pptxBlockVariants.emphasis);
    const run = [...xml.matchAll(/<a:r>.*?<\/a:r>/gs)].find(([part]) =>
      part.includes("<a:t>small steps</a:t>"),
    );
    assert(run, "emphasis run");
    expect(run[0]).toContain('b="1"');
    const amber = tokens["--color-amber-dark"].slice(1).toUpperCase();
    expect(run[0]).toContain(`<a:srgbClr val="${amber}"/>`);
  });

  it("draws a source-free quote as one paragraph", async () => {
    const xml = await onlySlide(pptxBlockVariants.quote);
    const quote = shapesOf(xml).find((shape) => shape.texts.includes("Start where you are."));
    assert(quote, "quote text");
    expect([...quote.xml.matchAll(/<a:p>/g)]).toHaveLength(1);
    expect(quote.texts).toEqual(["Start where you are."]);
  });

  it("centres a callout in its 7.5-inch card", async () => {
    const xml = await onlySlide(pptxBlockVariants.callout);
    const shapes = shapesOf(xml);
    const card = shapes.find((shape) => shape.prst === "round2DiagRect");
    const callout = shapes.find((shape) => shape.texts.includes("Bring a sample."));
    assert(card, "callout card");
    assert(callout, "callout text");
    expect(card.w).toBe(7.5);
    expect(callout.x + callout.w / 2).toBeCloseTo(card.x + card.w / 2, 5);
    expect(callout.xml).toContain('algn="ctr"');
  });

  it("prefixes ordered layers with their numbers", async () => {
    const xml = await onlySlide(pptxBlockVariants.layers);
    const layers = shapesOf(xml).filter((shape) =>
      shape.texts.some((text) => ["Queue", "Work"].includes(text)),
    );
    expect(layers.map((shape) => shape.texts.map((text) => text.trim()))).toEqual([
      ["1", "Queue"],
      ["2", "Work"],
    ]);
  });

  it("draws a placeholder and warns when a video is missing", async () => {
    const assets = join(import.meta.dirname, "fixtures");
    const {
      warnings,
      slideXml: [xml],
    } = await rendered({ name: "Video", slides: [pptxBlockVariants.missingVideo] }, assets);
    const shapes = shapesOf(xml);
    expect(warnings).toEqual([`video /r2s-missing.mp4: not found under ${assets}`]);
    expect(shapes.filter((shape) => shape.prst === "round2DiagRect")).toHaveLength(1);
    expect(shapes.flatMap((shape) => shape.texts)).toContain("Video unavailable");
  });

  it("warns when an annotated image is missing", async () => {
    const assets = join(import.meta.dirname, "fixtures");
    const { warnings } = await rendered(
      { name: "Annotations", slides: [pptxBlockVariants.missingAnnotated] },
      assets,
    );
    expect(warnings).toEqual([`image /r2s-missing-annotated.png: not found under ${assets}`]);
  });

  it("prints both ends of a bar range without a display override", async () => {
    const xml = await onlySlide(pptxBlockVariants.barRange);
    expect(shapesOf(xml).flatMap((shape) => shape.texts)).toContain("3–7");
  });

  it("draws two position cards when the middle label is absent", async () => {
    const xml = await onlySlide(pptxBlockVariants.positions);
    const shapes = shapesOf(xml);
    expect(shapes.filter((shape) => shape.prst === "round2DiagRect")).toHaveLength(2);
    const headings = shapes.filter((shape) =>
      shape.texts.some((text) => ["Ari", "Bea"].includes(text)),
    );
    expect(headings.map((shape) => shape.texts.join(""))).toEqual(["Ari", "Bea"]);
  });

  it("shares the full inner frame between flow steps when notes are absent", async () => {
    const xml = await onlySlide(pptxBlockVariants.framedFlow);
    const shapes = shapesOf(xml);
    const frame = shapes.find((shape) => shape.dash === "dash");
    assert(frame, "dashed flow frame");
    const centers = shapes
      .filter((shape) => shape.prst === "roundRect")
      .map((shape) => shape.x + shape.w / 2);
    const pad = 1.5 * PRINT_REM;
    expect(centers).toEqual([
      expect.closeTo(frame.x + pad + (frame.w - 2 * pad) / 4, 5),
      expect.closeTo(frame.x + pad + (3 * (frame.w - 2 * pad)) / 4, 5),
    ]);
  });

  it("sets the height of a dense card with a title and no body", async () => {
    const xml = await onlySlide(pptxBlockVariants.cardWithoutText);
    const shapes = shapesOf(xml);
    const card = shapes.find((shape) => shape.prst === "round2DiagRect");
    const title = shapes.find((shape) => shape.texts.includes("Plan"));
    assert(card, "dense card");
    assert(title, "card title");
    expect(card.h).toBeCloseTo(title.h + 3 * PRINT_REM, 5);
  });

  it("exports a slide with an unknown block without warnings", async () => {
    const { warnings, slideXml: slides } = await rendered({
      name: "Unknown",
      slides: [pptxBlockVariants.unknown],
    });
    expect(warnings).toEqual([]);
    expect(slides).toHaveLength(1);
  });
});

describe("slides-pptx picture headers", () => {
  let assets: string;

  beforeAll(() => {
    assets = mkdtempSync(join(tmpdir(), "slides-pptx-headers-"));
  });

  afterAll(() => rmSync(assets, { recursive: true, force: true }));

  it.each([
    { format: "GIF", file: "picture.gif", header: "47494638396128001400", ratio: 2 },
    {
      format: "VP8X",
      file: "x.webp",
      header: "5249464600000000574542505650385800000000000000005900001d0000",
      ratio: 3,
    },
    {
      format: "VP8L",
      file: "l.webp",
      header: "5249464600000000574542505650384c000000002f63000600",
      ratio: 4,
    },
    {
      format: "VP8",
      file: "picture.webp",
      header: "524946460000000057454250565038200000000000000000000096001e00",
      ratio: 5,
    },
    { format: "JPEG", file: "picture.jpg", header: "ffd8ffc0000708001e00b4", ratio: 6 },
  ])("uses the $format header's picture proportions", async ({ file, header, ratio }) => {
    writeFileSync(join(assets, file), Buffer.from(header, "hex"));
    const {
      warnings,
      slideXml: [xml],
    } = await rendered(
      {
        name: "Picture",
        slides: [
          {
            type: "content",
            headline: "Picture proportions",
            content: [{ type: "image", src: file, alt: "Header picture" }],
          },
        ],
      },
      assets,
    );
    const picture = [...xml.matchAll(/<p:pic>.*?<\/p:pic>/gs)].find(([part]) =>
      part.includes('descr="Header picture"'),
    );
    assert(picture, "embedded picture");
    const size = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(picture[0]);
    assert(size, "picture dimensions");
    expect(Number(size[1]) / Number(size[2])).toBeCloseTo(ratio, 3);
    expect(warnings).toEqual([]);
  });

  it("draws a placeholder and warns for an unreadable image format", async () => {
    writeFileSync(join(assets, "unreadable.bin"), Buffer.from("not an image"));
    const {
      warnings,
      slideXml: [xml],
    } = await rendered(
      {
        name: "Unreadable picture",
        slides: [
          {
            type: "content",
            headline: "Unreadable picture",
            content: [{ type: "image", src: "unreadable.bin", alt: "Picture unavailable" }],
          },
        ],
      },
      assets,
    );
    const shapes = shapesOf(xml);
    expect(warnings).toEqual(["image unreadable.bin: unreadable format"]);
    expect(shapes.filter((shape) => shape.prst === "round2DiagRect")).toHaveLength(1);
    expect(shapes.flatMap((shape) => shape.texts)).toContain("Picture unavailable");
  });
});

describe("slides-pptx column cards", () => {
  it("draws an itemCard with its tone border, title, subtitle, text and marker bullet", async () => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const day = palette(false);
    const sheet = new Sheet(new Look(day, "en", false), pptx.addSlide(), {
      pptx,
      assets: "",
      warnings: [],
      charts: new Map(),
    });
    itemCard(
      sheet,
      {
        title: "Keep",
        subtitle: "Every day",
        text: "Short note",
        items: ["Small steps"],
        tone: day.green,
        marker: "green",
      },
      { area: { x: 1, y: 1, w: 5, h: 4 }, k: 1, centered: false },
    );
    const out = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const file = out.file("ppt/slides/slide1.xml");
    assert(file, "slide1.xml");
    const xml = await file.async("string");
    const [card, body] = shapesOf(xml);
    expect({
      cardPreset: card.prst,
      hasToneBorder: card.xml.includes(`<a:srgbClr val="${day.green}"/>`),
      texts: body.texts,
      hasMarker: body.xml.includes('char="&#xE001;"'),
    }).toEqual({
      cardPreset: "round2DiagRect",
      hasToneBorder: true,
      texts: ["Keep", "Every day", "Short note", "Small steps"],
      hasMarker: true,
    });
  });

  it("throws a TypeError for a prototype-key two-column variant", async () => {
    const error = await rejection(
      onlySlide({
        type: "content",
        headline: "Columns",
        content: [
          {
            type: "two-column",
            variant: "constructor" as "neutral",
            left: { title: "A", items: ["One"] },
            right: { title: "B", items: ["Two"] },
          },
          { type: "paragraph", text: "Tail" },
        ],
      }),
    );
    expect(error).toMatch(/^TypeError:.*\.map is not a function/);
  });
});
