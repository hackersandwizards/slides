import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  BLOCK_KINDS,
  blocksLayout,
  drawBlocks,
  kindOf,
  tableLookup,
  type BlocksLayout,
} from "../scripts/pptx/blocks";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  contentHead,
  drawContentBadge,
  drawStageMarkers,
  markerChip,
} from "../scripts/pptx/slides/content";
import type { ContentBlock, ContentSlide } from "../types/slide";
import { shapesOf } from "./fixtures/rendered-deck";

async function drawOnSheet(draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const warnings: string[] = [];
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets: "",
    warnings,
    charts: new Map(),
  });
  draw(sheet);
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = zip.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  return { shapes: shapesOf(await file.async("string")), warnings };
}

describe("tableLookup", () => {
  const table: Record<string, number> = { alpha: 1, beta: 2 };

  it.each<{ label: string; key: unknown; expected: number | undefined }>([
    { label: "an own string key", key: "alpha", expected: 1 },
    { label: "a missing string key", key: "gamma", expected: undefined },
    { label: "an inherited prototype key", key: "constructor", expected: undefined },
    { label: "an undefined key", key: undefined, expected: undefined },
    { label: "a numeric key", key: 123, expected: undefined },
  ])("returns $expected for $label", ({ key, expected }) => {
    expect(tableLookup(table, key)).toBe(expected);
  });
});

describe("kindOf", () => {
  it.each<{
    label: string;
    block: ContentBlock;
    expected:
      { block: ContentBlock; kind: (typeof BLOCK_KINDS)[keyof typeof BLOCK_KINDS] } | undefined;
  }>([
    {
      label: "a registered block kind",
      block: { type: "paragraph", text: "Hello" },
      expected: {
        block: { type: "paragraph", text: "Hello" },
        kind: BLOCK_KINDS.paragraph,
      },
    },
    {
      label: "a redrawn labeled-grid alias block",
      block: { type: "labeled-grid", items: [{ title: "A", subtitle: "B" }] },
      expected: {
        block: {
          type: "cards",
          items: [{ title: "A", text: "B" }],
          highlight: undefined,
          columns: 2,
          reveal: undefined,
          dense: true,
        },
        kind: BLOCK_KINDS.cards,
      },
    },
    {
      label: "a prototype key",
      block: { type: "constructor" } as unknown as ContentBlock,
      expected: undefined,
    },
    {
      label: "a non-string block type",
      block: { type: undefined } as unknown as ContentBlock,
      expected: undefined,
    },
  ])("resolves $label", ({ block, expected }) => {
    expect(kindOf(block)).toEqual(expected);
  });
});

describe("blocksLayout", () => {
  const look = new Look(palette(false), "en", false);
  const baseArea = { x: 1, y: 2, w: 10, h: 4 };

  it.each<{
    label: string;
    slide: ContentSlide;
    area: { x: number; y: number; w: number; h: number };
    expected: BlocksLayout;
  }>([
    {
      label: "an uncentered fixed block positioned at free / 2.25",
      slide: {
        type: "content",
        headline: "H",
        content: [{ type: "paragraph", text: "Short line" }],
      },
      area: baseArea,
      expected: {
        k: 1,
        slots: [
          {
            area: { x: 1, y: 3.6166666666666667, w: 10, h: 0.3625 },
            k: 1,
            centered: false,
          },
        ],
        end: 3.979166666666667,
        short: 0,
        foot: { h: 0 },
        centered: false,
      },
    },
    {
      label: "a centered fixed block with a footer positioned at free / 2",
      slide: {
        type: "content",
        headline: "H",
        layout: "centered",
        footer: "Source 2026",
        content: [{ type: "paragraph", text: "Short line" }],
      },
      area: baseArea,
      expected: {
        k: 1,
        slots: [
          {
            area: { x: 1, y: 3.4625000000000004, w: 10, h: 0.3625 },
            k: 1,
            centered: true,
          },
        ],
        end: 3.825,
        short: 0,
        foot: { text: "Source 2026", h: 0.6125 },
        centered: true,
      },
    },
    {
      label: "a fixed block paired with a growing image block",
      slide: {
        type: "content",
        headline: "H",
        content: [
          { type: "paragraph", text: "Caption" },
          { type: "image", src: "shot.png", alt: "Shot" },
        ],
      },
      area: baseArea,
      expected: {
        k: 1,
        slots: [
          { area: { x: 1, y: 2, w: 10, h: 0.3625 }, k: 1, centered: false },
          { area: { x: 1, y: 2.6125, w: 10, h: 3.3875 }, k: 1, centered: false },
        ],
        end: 6,
        short: 0,
        foot: { h: 0 },
        centered: false,
      },
    },
    {
      label: "an over-full stack that shrinks to the floor and reports shortfall",
      slide: {
        type: "content",
        headline: "H",
        content: [
          { type: "paragraph", text: "Paragraph 1" },
          { type: "paragraph", text: "Paragraph 2" },
          { type: "paragraph", text: "Paragraph 3" },
        ],
      },
      area: { x: 1, y: 2, w: 10, h: 0.9 },
      expected: {
        k: 0.5999999999999996,
        slots: [
          {
            area: { x: 1, y: 2, w: 10, h: 0.22152777777777777 },
            k: 0.5999999999999996,
            centered: false,
          },
          {
            area: { x: 1, y: 2.4715277777777778, w: 10, h: 0.22152777777777777 },
            k: 0.5999999999999996,
            centered: false,
          },
          {
            area: { x: 1, y: 2.9430555555555555, w: 10, h: 0 },
            k: 0.5999999999999996,
            centered: false,
          },
        ],
        end: 2.9430555555555555,
        short: 0.2645833333333333,
        foot: { h: 0 },
        centered: false,
      },
    },
  ])("computes layout for $label", ({ slide, area, expected }) => {
    expect(blocksLayout(look, slide, area)).toEqual(expected);
  });
});

describe("drawBlocks", () => {
  it("draws every known block in its slot and warns when layout.short is positive", async () => {
    const list: ContentBlock[] = [
      { type: "paragraph", text: "First" },
      { type: "paragraph", text: "Second" },
    ];
    const layout: BlocksLayout = {
      k: 0.6,
      slots: [
        { area: { x: 1, y: 2, w: 10, h: 0.3 }, k: 0.6, centered: false },
        { area: { x: 1, y: 2.55, w: 10, h: 0.3 }, k: 0.6, centered: false },
      ],
      end: 2.85,
      short: 0.42,
      foot: { h: 0 },
      centered: false,
    };
    const out = await drawOnSheet((sheet) => {
      drawBlocks(sheet, list, layout);
    });
    expect({
      warnings: out.warnings,
      boxes: out.shapes.map(({ y, texts }) => ({ y, texts })),
    }).toEqual({
      warnings: ["blocks paragraph, paragraph: 0.42 in taller than the slide holds"],
      boxes: [
        { y: 2, texts: ["First"] },
        { y: 2.55, texts: ["Second"] },
      ],
    });
  });

  it("skips unknown blocks without warning when layout.short is zero", async () => {
    const list: ContentBlock[] = [
      { type: "paragraph", text: "Visible" },
      { type: "unknown-block" } as unknown as ContentBlock,
    ];
    const layout: BlocksLayout = {
      k: 1,
      slots: [
        { area: { x: 1, y: 2, w: 10, h: 0.4 }, k: 1, centered: false },
        { area: { x: 1, y: 2.65, w: 10, h: 0 }, k: 1, centered: false },
      ],
      end: 2.65,
      short: 0,
      foot: { h: 0 },
      centered: false,
    };
    const out = await drawOnSheet((sheet) => {
      drawBlocks(sheet, list, layout);
    });
    expect({
      warnings: out.warnings,
      boxes: out.shapes.map(({ y, texts }) => ({ y, texts })),
    }).toEqual({
      warnings: [],
      boxes: [{ y: 2, texts: ["Visible"] }],
    });
  });
});

describe("markerChip", () => {
  it("builds a teal-tinted label chip for badge and stage markers", () => {
    const look = new Look(palette(false), "en", false);
    expect(markerChip(look, "BETA")).toEqual({
      size: 13.5,
      fill: "DCE9EC",
      color: "1A7285",
      text: "BETA",
    });
  });
});

describe("contentHead, drawContentBadge and drawStageMarkers", () => {
  it("draws the top-right badge chip", async () => {
    const out = await drawOnSheet((sheet) => {
      drawContentBadge(sheet, "BETA");
    });
    const round = (n: number) => Number(n.toFixed(2));
    expect(
      out.shapes.map(({ prst, x, y, fill, texts }) => ({
        prst,
        x: round(x),
        y: round(y),
        fill,
        texts,
      })),
    ).toEqual([
      { prst: "roundRect", x: 11.96, y: 0.49, fill: "DCE9EC", texts: [] },
      { prst: "rect", x: 11.96, y: 0.49, fill: "1A7285", texts: ["BETA"] },
    ]);
  });

  it.each<{
    label: string;
    slide: ContentSlide;
    expectedY: number;
    expectedShapes: Array<{
      prst: string | undefined;
      x: number;
      y: number;
      fill: string | undefined;
      texts: string[];
    }>;
  }>([
    {
      label: "a slide without stage markers leaves y unchanged",
      slide: { type: "content", headline: "H", content: [] },
      expectedY: 2.1,
      expectedShapes: [],
    },
    {
      label: "a slide with a stage prefix and two markers places each x in sequence and advances y",
      slide: {
        type: "content",
        headline: "H",
        stagePrefix: "STAGE",
        stageMarker: ["Build", "Ship"],
        content: [],
      },
      expectedY: 2.35,
      expectedShapes: [
        { prst: "rect", x: 0.6667, y: 1.95, fill: "545861", texts: ["STAGE"] },
        { prst: "roundRect", x: 1.3979, y: 1.95, fill: "DCE9EC", texts: [] },
        { prst: "rect", x: 1.3936, y: 1.95, fill: "1A7285", texts: ["Build"] },
        { prst: "roundRect", x: 2.366, y: 1.95, fill: "DCE9EC", texts: [] },
        { prst: "rect", x: 2.3623, y: 1.95, fill: "1A7285", texts: ["Ship"] },
      ],
    },
  ])("drawStageMarkers for $label", async ({ slide, expectedY, expectedShapes }) => {
    let returnedY = 0;
    const out = await drawOnSheet((sheet) => {
      returnedY = drawStageMarkers(sheet, slide, 2.1);
    });
    const r4 = (n: number) => Number(n.toFixed(4));
    expect({
      y: returnedY,
      shapes: out.shapes.map(({ prst, x, y, fill, texts }) => ({
        prst,
        x: r4(x),
        y: r4(y),
        fill,
        texts,
      })),
    }).toEqual({
      y: expectedY,
      shapes: expectedShapes,
    });
  });

  it("contentHead draws header, badge and stage markers and returns the body start y", async () => {
    const slide: ContentSlide = {
      type: "content",
      headline: "Architecture",
      badge: "NEW",
      stageMarker: ["Core"],
      content: [],
    };
    let bodyY = 0;
    const out = await drawOnSheet((sheet) => {
      bodyY = contentHead(sheet, slide);
    });
    expect({
      bodyY,
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      bodyY: 1.9925,
      texts: ["Architecture", "NEW", "Core"],
    });
  });
});
