import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  BLOCK_KINDS,
  blocksLayout,
  drawBlocks,
  kindOf,
  type BlocksLayout,
  type BlocksRoom,
} from "../scripts/pptx/blocks";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { contentHead, drawContentBadge, drawStageMarkers } from "../scripts/pptx/slides/content";
import type { ContentBlock, Slide } from "../types/slide";
import { shapesOf } from "./fixtures/rendered-deck";

type ContentSlide = Extract<Slide, { type: "content" }>;

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

describe("kindOf", () => {
  it.each<{ label: string; block: ContentBlock; expectedType: string | undefined }>([
    {
      label: "a registered block kind",
      block: { type: "paragraph", text: "Hello" },
      expectedType: "paragraph",
    },
    {
      label: "a redrawn alias block",
      block: { type: "labeled-grid", items: [{ title: "A", subtitle: "B" }] },
      expectedType: "cards",
    },
    {
      label: "a prototype key",
      block: { type: "constructor" } as unknown as ContentBlock,
      expectedType: undefined,
    },
    {
      label: "a non-string block type",
      block: { type: undefined } as unknown as ContentBlock,
      expectedType: undefined,
    },
  ])("resolves $label", ({ block, expectedType }) => {
    const match = kindOf(block);
    expect(match?.block.type).toBe(expectedType);
  });

  it("pairs a redrawn labeled-grid block with the cards handler", () => {
    const match = kindOf({ type: "labeled-grid", items: [{ title: "A", subtitle: "B" }] });
    expect(match?.kind).toBe(BLOCK_KINDS.cards);
  });
});

describe("blocksLayout", () => {
  const look = new Look(palette(false), "en", false);
  const baseArea = { x: 1, y: 2, w: 10, h: 4 };

  it.each<{
    label: string;
    list: ContentBlock[];
    room: BlocksRoom;
    expected: BlocksLayout;
  }>([
    {
      label: "an uncentered fixed block positioned at free / 2.25",
      list: [{ type: "paragraph", text: "Short line" }],
      room: { area: baseArea, centered: false, tail: 0 },
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
      },
    },
    {
      label: "a centered fixed block with a footer tail positioned at free / 2",
      list: [{ type: "paragraph", text: "Short line" }],
      room: { area: baseArea, centered: true, tail: 0.5 },
      expected: {
        k: 1,
        slots: [
          {
            area: { x: 1, y: 3.56875, w: 10, h: 0.3625 },
            k: 1,
            centered: true,
          },
        ],
        end: 3.9312500000000004,
        short: 0,
      },
    },
    {
      label: "a fixed block paired with a growing image block",
      list: [
        { type: "paragraph", text: "Caption" },
        { type: "image", src: "shot.png", alt: "Shot" },
      ],
      room: { area: baseArea, centered: false, tail: 0 },
      expected: {
        k: 1,
        slots: [
          { area: { x: 1, y: 2, w: 10, h: 0.3625 }, k: 1, centered: false },
          { area: { x: 1, y: 2.6125, w: 10, h: 3.3875 }, k: 1, centered: false },
        ],
        end: 6,
        short: 0,
      },
    },
    {
      label: "an over-full stack that shrinks to the floor and reports shortfall",
      list: [
        { type: "paragraph", text: "Paragraph 1" },
        { type: "paragraph", text: "Paragraph 2" },
        { type: "paragraph", text: "Paragraph 3" },
      ],
      room: { area: { x: 1, y: 2, w: 10, h: 0.9 }, centered: false, tail: 0 },
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
      },
    },
  ])("computes layout for $label", ({ list, room, expected }) => {
    expect(blocksLayout(look, list, room)).toEqual(expected);
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
    };
    const out = await drawOnSheet((sheet) => {
      drawBlocks(sheet, list, layout);
    });
    expect({
      warnings: out.warnings,
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      warnings: ["blocks paragraph, paragraph: 0.42 in taller than the slide holds"],
      texts: ["First", "Second"],
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
    };
    const out = await drawOnSheet((sheet) => {
      drawBlocks(sheet, list, layout);
    });
    expect({
      warnings: out.warnings,
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      warnings: [],
      texts: ["Visible"],
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
    expectedTexts: string[];
    expectedPills: number;
  }>([
    {
      label: "a slide without stage markers leaves y unchanged",
      slide: { type: "content", headline: "H", content: [] },
      expectedY: 2.1,
      expectedTexts: [],
      expectedPills: 0,
    },
    {
      label: "a slide with a stage prefix and two markers advances y by 0.25",
      slide: {
        type: "content",
        headline: "H",
        stagePrefix: "STAGE",
        stageMarker: ["Build", "Ship"],
        content: [],
      },
      expectedY: 2.35,
      expectedTexts: ["STAGE", "Build", "Ship"],
      expectedPills: 2,
    },
  ])("drawStageMarkers for $label", async ({ slide, expectedY, expectedTexts, expectedPills }) => {
    let returnedY = 0;
    const out = await drawOnSheet((sheet) => {
      returnedY = drawStageMarkers(sheet, slide, 2.1);
    });
    expect({
      y: returnedY,
      texts: out.shapes.flatMap((sh) => sh.texts),
      pills: out.shapes.filter((sh) => sh.prst === "roundRect").length,
    }).toEqual({
      y: expectedY,
      texts: expectedTexts,
      pills: expectedPills,
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
      bodyY: Number(bodyY.toFixed(4)),
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      bodyY: 1.9925,
      texts: ["Architecture", "NEW", "Core"],
    });
  });
});
