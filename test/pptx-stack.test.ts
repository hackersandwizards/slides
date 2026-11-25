import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import { drawPositions, positionsLayout } from "../scripts/pptx/blocks/positions";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { drawStack, stackHeight, type StackItem } from "../scripts/pptx/stack";
import { shapesOf } from "./fixtures/rendered-deck";

async function drawOnSheet(draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  draw(sheet);
  const out = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = out.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  return shapesOf(await file.async("string"));
}

const sampleItems: StackItem[] = [
  { text: { runs: [{ text: "First" }] }, o: { size: 18, color: "111827", line: 1.5 }, gap: 0 },
  { text: { runs: [{ text: "Second" }] }, o: { size: 12, color: "111827", line: 1.5 }, gap: 0.25 },
];

describe("stackHeight", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{ label: string; items: StackItem[]; expected: number }>([
    { label: "an empty column", items: [], expected: 0 },
    { label: "two paragraphs separated by a gap", items: sampleItems, expected: 0.875 },
  ])("returns $expected for $label", ({ items, expected }) => {
    expect(stackHeight(look, items, 4)).toBe(expected);
  });
});

describe("drawStack", () => {
  it("places each item at its cumulative y offset and returns the total height", async () => {
    let total = 0;
    const shapes = await drawOnSheet((sheet) => {
      total = drawStack(sheet, sampleItems, { x: 1, y: 2, w: 4 });
    });
    expect({
      total,
      boxes: shapes.map(({ x, y, w, h, texts }) => ({ x, y, w, h, texts })),
    }).toEqual({
      total: 0.875,
      boxes: [
        { x: 1, y: 2, w: 4.04, h: 0.375, texts: ["First"] },
        { x: 1, y: 2.625, w: 4.04, h: 0.25, texts: ["Second"] },
      ],
    });
  });
});

describe("positionsLayout", () => {
  const look = new Look(palette(false), "en", false);
  const baseBlock = {
    type: "positions" as const,
    left: { name: "Ari", stance: "Ship now", quote: "Users teach us." },
    right: { name: "Bea", stance: "Test first", quote: "Bugs cost more." },
    resolution: "Ship small with tests",
  };

  it.each<{
    label: string;
    block: typeof baseBlock & { middle?: string };
    areaW: number;
    expected: {
      w: number;
      xOffset: number;
      cw: number;
      cardH: number;
      resGap: number;
      resCount: number;
      resGaps: number[];
      h: number;
    };
  }>([
    {
      label: "clamped without a middle label",
      block: baseBlock,
      areaW: 12,
      expected: {
        w: 7.9998749999999985,
        xOffset: 2.0000625000000007,
        cw: 3.8888281249999994,
        cardH: 1.6300234374999998,
        resGap: 0.333328125,
        resCount: 1,
        resGaps: [0],
        h: 2.3133515625,
      },
    },
    {
      label: "clamped with a middle label",
      block: { ...baseBlock, middle: "Both hold" },
      areaW: 12,
      expected: {
        w: 7.9998749999999985,
        xOffset: 2.0000625000000007,
        cw: 3.8888281249999994,
        cardH: 1.6300234374999998,
        resGap: 0.333328125,
        resCount: 2,
        resGaps: [0, 0.11110937499999998],
        h: 2.657794270833333,
      },
    },
    {
      label: "unclamped when area is narrower than 72 rem",
      block: baseBlock,
      areaW: 6,
      expected: {
        w: 6,
        xOffset: 0,
        cw: 2.888890625,
        cardH: 1.6300234374999998,
        resGap: 0.333328125,
        resCount: 1,
        resGaps: [0],
        h: 2.3133515625,
      },
    },
  ])("measures the positions layout $label", ({ block, areaW, expected }) => {
    const layout = positionsLayout(look, block, { w: areaW, k: 0.75 });
    expect({
      w: layout.w,
      xOffset: layout.xOffset,
      cw: layout.cw,
      cardH: layout.cardH,
      resGap: layout.resGap,
      resCount: layout.resolution.length,
      resGaps: layout.resolution.map((item) => item.gap),
      h: layout.h,
    }).toEqual(expected);
  });
});

describe("drawPositions", () => {
  it("draws both stance cards and the resolution stack centred from the given origin", async () => {
    const shapes = await drawOnSheet((sheet) => {
      const layout = positionsLayout(
        sheet,
        {
          type: "positions",
          left: { name: "Ari", stance: "Ship now", quote: "Users teach us." },
          right: { name: "Bea", stance: "Test first", quote: "Bugs cost more." },
          middle: "Both hold",
          resolution: "Ship small with tests",
        },
        { w: 12, k: 0.75 },
      );
      drawPositions(sheet, layout, { x: 0.5, y: 1 });
    });
    const round = (n: number) => Number(n.toFixed(4));
    const cards = shapes.filter((sh) => sh.prst === "round2DiagRect");
    const middle = shapes.find((sh) => sh.texts.includes("Both hold"));
    const resolution = shapes.find((sh) => sh.texts.includes("Ship small with tests"));
    assert(middle, "middle label");
    assert(resolution, "resolution text");
    expect({
      cards: cards.map(({ x, y, w, h }) => ({
        x: round(x),
        y: round(y),
        w: round(w),
        h: round(h),
      })),
      middle: { x: round(middle.x), y: round(middle.y) },
      resolution: { x: round(resolution.x), y: round(resolution.y) },
    }).toEqual({
      cards: [
        { x: 2.5001, y: 1, w: 3.8888, h: 1.63 },
        { x: 6.6111, y: 1, w: 3.8888, h: 1.63 },
      ],
      middle: { x: 2.4601, y: 2.9634 },
      resolution: { x: 2.4601, y: 3.3078 },
    });
  });
});
