import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type JSZip from "jszip";
import { tokens } from "@hackersandwizards/brand/tokens";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";
import { labeledGridAsCards } from "../lib/content-block-aliases";
import {
  onlySlide,
  PRINT_REM,
  rendered,
  shapesOf,
  specimen,
  specimenAt,
  TEAL,
} from "./fixtures/rendered-deck";
import { pptxBlockVariants } from "./fixtures/pptx-block-variants";

let zip: JSZip;
let slideXml: string[];
let slideText: string[];

beforeAll(async () => {
  ({ zip, slideXml, slideText } = await specimen());
}, 60_000);

describe("slides-pptx on the specimen deck", () => {
  // The annotated image's band, 8 % to 52 % of the picture (F06).
  it("crops an annotated image to its band", () => {
    const i = slideCatalog.slides.findIndex((x) =>
      JSON.stringify(x).includes('"crop":{"top":0.08,"bottom":0.52}'),
    );
    expect(slideXml[i]).toContain('<a:srcRect l="0" r="0" t="8000" b="48000"/>');
  });

  it("tints a table's head and every second body row, as the web's table", () => {
    const at = slideCatalog.slides.findIndex(
      (slide: Slide) =>
        slide.type === "content" && slide.content.some((b) => b.type === "table" && b.headers),
    );
    const table = slideXml[at].match(/<a:tbl>.*?<\/a:tbl>/s)![0];
    // Each row's first cell fill, after its borders: the head, then the three body rows.
    const fills = [
      ...table.matchAll(/<a:tr\b.*?<\/a:lnB><a:solidFill><a:srgbClr val="(\w+)"/gs),
    ].map((m) => m[1]);
    expect(fills).toHaveLength(4);
    expect(fills[0]).not.toBe(fills[1]);
    expect(fills).toEqual([fills[0], fills[1], fills[0], fills[1]]);
  });

  it("sets a content slide's quote behind a purple rule, its source in grey", () => {
    const at = slideCatalog.slides.findIndex(
      (x) => x.type === "content" && x.content.some((b) => b.type === "quote"),
    );
    const xml = slideXml[at];
    const purple = tokens["--color-purple"].slice(1).toUpperCase();
    const muted = tokens["--color-muted"].slice(1).toUpperCase();
    expect(xml).toContain(`<a:srgbClr val="${purple}"`);
    expect(xml).toContain("We stopped asking for a release date.");
    const run = xml.slice(0, xml.indexOf("<a:t>Mara Lindqvist"));
    expect(run.slice(run.lastIndexOf("<a:rPr"))).toContain(`val="${muted}"`);
    // The words stand brand's 2 px rule and 1.25 rem gap off the rule, at the print route's 21.333
    // px rem; the export stood them 20 px off.
    const shapes = shapesOf(xml);
    const rule = shapes.find((sp) => sp.fill === purple && sp.w! < 0.02)!;
    const words = shapes.find((sp) => sp.texts.some((t) => t.includes("We stopped asking")))!;
    expect(words.x! - rule.x!).toBeCloseTo((2 + 1.25 * 21.333) / 144, 3);
  });

  it.each([
    [
      "an info callout",
      "--color-purple",
      (x: Slide) => JSON.stringify(x).includes("Two stages are active"),
    ],
    ["a process footer", "--color-teal", (x: Slide) => x.type === "process" && !!x.footer],
  ] as const)(
    "draws %s as brand's callout, %s at 10 percent on white with no line",
    (_, hue, pick) => {
      const xml = slideXml[slideCatalog.slides.findIndex(pick)];
      const tint = [1, 3, 5]
        .map((i) => Math.round(parseInt(tokens[hue].slice(i, i + 2), 16) * 0.1 + 255 * 0.9))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      expect(xml).toContain(`val="${tint}"`);
      const shape = xml.slice(xml.lastIndexOf("<p:sp>", xml.indexOf(`val="${tint}"`)));
      expect(shape.slice(0, shape.indexOf("</p:spPr>"))).toContain("<a:ln></a:ln>");
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
    const at = slideCatalog.slides.findIndex((s) => s.type === "comparison" && "adds" in s);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(slideXml[at]).toContain("<a:t>+</a:t>");
    expect(slideXml[at]).not.toContain("tailEnd");
  });

  it("spells out a linked image's link and covers a video with its poster", async () => {
    const at = (type: string) =>
      slideCatalog.slides.findIndex(
        (s) => s.type === "content" && s.content.some((b) => b.type === type),
      );
    expect(slideText[at("linked-image")]).toContain("forge.example.com/acme/payments/pull/128");
    const rels = await zip
      .file(`ppt/slides/_rels/slide${at("video") + 1}.xml.rels`)!
      .async("string");
    const poster = readFileSync(
      join(import.meta.dirname, "..", "specimen", "slide-catalog", "agent-session-poster.png"),
    );
    const pictures = await Promise.all(
      [...rels.matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(async (m) =>
        Buffer.from(await zip.file(`ppt/media/${m[1]}`)!.async("uint8array")),
      ),
    );
    expect(pictures.some((p) => p.equals(poster))).toBe(true);
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
  it("marks a plain card with the web's short teal rule, never a square", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some(
          (b) => b.type === "cards" && !b.numbered && !b.dense && b.items.every((it) => !it.icon),
        ),
    );
    const rules = shapesOf(slideXml[i]).filter(
      (sh) => sh.fill === TEAL && Math.abs(sh.w! - 4 * PRINT_REM) < 0.01,
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r.h).toBeLessThan(r.w! / 4);
  });

  it("draws a numbers block's figures in teal mono over a rule, as the web's Numbers", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" && x.content.some((b) => b.type === "numbers" && b.items.length > 1),
    );
    const block = (slideCatalog.slides[i] as ContentSlide).content.find(
      (b) => b.type === "numbers",
    )! as Extract<ContentSlide["content"][number], { type: "numbers" }>;
    const shapes = shapesOf(slideXml[i]);
    expect(shapes.filter((sh) => sh.prst === "line").length).toBeGreaterThanOrEqual(
      block.items.length,
    );
    const figure = shapes.find((sh) =>
      sh.texts.join("").endsWith(block.items[0].value.replace(/^-/, "−")),
    )!;
    expect(figure.xml).toContain(`<a:srgbClr val="${TEAL}"/>`);
    expect(figure.xml).toContain('typeface="JetBrains Mono"');
  });

  it("writes a timeline figure's minus as the web's", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some((b) => b.type === "timeline" && b.events.some((e) => e.figure === "-90 %")),
    );
    expect(slideXml[i]).toContain("<a:t>−90 %</a:t>");
    expect(slideXml[i]).not.toContain("-90");
  });

  // A figure's box is one line high, so a wrapped figure warns as text taller than its box.
  it("keeps a five-digit figure with its unit on one line in every numbers layout", async () => {
    type Numbers = Extract<ContentSlide["content"][number], { type: "numbers" }>;
    const lone = (b: ContentSlide["content"][number]): b is Numbers =>
      b.type === "numbers" && b.items.length === 1;
    const one = slideCatalog.slides.find(
      (x) => x.type === "content" && x.content.some(lone),
    ) as ContentSlide;
    const block = one.content.find(lone)!;
    const slides = [1, 2, 4, 6].map((n) => ({
      ...one,
      content: [
        {
          ...block,
          items: Array(n).fill({ ...block.items[0], value: "12.345 %" }),
        },
      ],
    }));
    expect(
      (await rendered({ name: "T", slides }, join(import.meta.dirname, ".."))).warnings,
    ).toEqual([]);
  });

  it("numbers a named scale's ends and quarters under its last track, as the web's Bars", () => {
    const i = specimenAt(
      (x) =>
        x.type === "content" &&
        x.content.some(
          (b) => b.type === "bars" && b.max === 100 && b.bars.some((r) => r.from != null),
        ),
    );
    const ticks = shapesOf(slideXml[i]).filter((sh) =>
      /^(0|25|50|75|100)$/.test(sh.texts.join("")),
    );
    expect(ticks.map((sh) => sh.texts.join(""))).toEqual(["0", "25", "50", "75", "100"]);
    expect(new Set(ticks.map((sh) => sh.y!.toFixed(2))).size).toBe(1);
  });

  it("indents a numbered list as far as the measure assumes, and steps code highlights by its lines", () => {
    const ordered =
      slideXml[
        specimenAt(
          (x) => x.type === "content" && x.content.some((b) => b.type === "bullets" && !!b.ordered),
        )
      ];
    const numbered = [...ordered.matchAll(/<a:pPr([^>]*)>(?:(?!<\/a:pPr>).)*<a:buAutoNum/g)];
    expect(numbered.length).toBeGreaterThan(0);
    for (const [, attrs] of numbered) expect(attrs).toContain(`marL="${16 * 12700}"`);
    // The annotated code's lines at the web's 1.3 em, the step its highlights take.
    const code =
      slideXml[
        specimenAt(
          (x) => x.type === "content" && x.content.some((b) => b.type === "annotated-code"),
        )
      ];
    expect(code).toContain(`<a:spcPts val="${Math.round(16 * 1.3 * 100)}"/>`);
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
