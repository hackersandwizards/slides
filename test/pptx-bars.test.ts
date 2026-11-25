import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  barRoleStyle,
  barSpan,
  barValueText,
  barsFooter,
  barsLayout,
  drawScaleTrack,
  scaleTicks,
  type BarRole,
  type BarRoleStyle,
} from "../scripts/pptx/blocks/bars";
import type { Block } from "../scripts/pptx/blocks/kind";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
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

describe("barRoleStyle", () => {
  const day = palette(false);

  it.each<{ role: BarRole; expected: BarRoleStyle }>([
    { role: "highlight", expected: { tone: "1A7285", fill: "1A7285", bold: true } },
    { role: "context", expected: { tone: "545861", fill: "9EA5AD", bold: false } },
    { role: "plain", expected: { tone: "19283A", fill: "1A7285", bold: true } },
  ])("resolves the $role bar role", ({ role, expected }) => {
    expect(barRoleStyle(role, day)).toEqual(expected);
  });
});

describe("barValueText", () => {
  const fmt = (n: number) => `${n}h`;

  it.each<{ label: string; bar: Block<"bars">["bars"][number]; expected: string }>([
    {
      label: "an explicit display override",
      bar: { label: "A", from: 2, value: 8, display: "~50%" },
      expected: "~50%",
    },
    {
      label: "a range bar without override",
      bar: { label: "B", from: 2, value: 8 },
      expected: "2h–8h",
    },
    { label: "a single-value bar", bar: { label: "C", value: 12 }, expected: "12h" },
  ])("formats $label", ({ bar, expected }) => {
    expect(barValueText(bar, fmt)).toBe(expected);
  });
});

describe("scaleTicks", () => {
  it("builds the five percentage stops and formatted labels for a named scale", () => {
    expect(scaleTicks(80, (n) => `${n} ms`)).toEqual([
      { q: 0, text: "0 ms" },
      { q: 25, text: "20 ms" },
      { q: 50, text: "40 ms" },
      { q: 75, text: "60 ms" },
      { q: 100, text: "80 ms" },
    ]);
  });
});

describe("barSpan", () => {
  it.each<{
    label: string;
    bar: { from?: number; value: number };
    expected: { from: number; barW: number };
  }>([
    { label: "a range bar", bar: { from: 25, value: 75 }, expected: { from: 2, barW: 4 } },
    {
      label: "a zero-length bar clamped to the 4 px floor",
      bar: { value: 0 },
      expected: { from: 0, barW: 0.027777777777777776 },
    },
  ])("maps $label onto an 8-inch track", ({ bar, expected }) => {
    expect(barSpan(bar, 100, 8)).toEqual(expected);
  });
});

describe("barsFooter", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    label: string;
    block: Block<"bars">;
    expected: { scaleH: number; sourceH: number };
  }>([
    {
      label: "neither scale nor source",
      block: { type: "bars", bars: [{ label: "A", value: 1 }] },
      expected: { scaleH: 0, sourceH: 0 },
    },
    {
      label: "both a named scale and a source",
      block: { type: "bars", max: 100, source: "Survey 2026", bars: [{ label: "A", value: 1 }] },
      expected: { scaleH: 0.45485937499999995, sourceH: 0.6925868055555555 },
    },
  ])("measures $label", ({ block, expected }) => {
    const { scaleH, sourceH } = barsFooter(look, block, { w: 12, k: 1 });
    expect({ scaleH, sourceH }).toEqual(expected);
  });
});

describe("drawScaleTrack", () => {
  it("draws the muted track, end cap and three quarter hairlines", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawScaleTrack(sheet, { x: 2, y: 3, w: 6, h: 0.5 });
    });
    const round = (n: number) => Number(n.toFixed(4));
    expect(
      shapes.map(({ prst, x, y, w, h, fill }) => ({
        prst,
        x: round(x),
        y: round(y),
        w: round(w),
        h: round(h),
        fill,
      })),
    ).toEqual([
      { prst: "rect", x: 2, y: 3, w: 6, h: 0.5, fill: "E7EAED" },
      { prst: "rect", x: 7.9722, y: 3, w: 0.0278, h: 0.5, fill: "C0C5CA" },
      { prst: "rect", x: 3.4931, y: 3, w: 0.0139, h: 0.5, fill: "F7F9FA" },
      { prst: "rect", x: 4.9931, y: 3, w: 0.0139, h: 0.5, fill: "F7F9FA" },
      { prst: "rect", x: 6.4931, y: 3, w: 0.0139, h: 0.5, fill: "F7F9FA" },
    ]);
  });
});

describe("barsLayout", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    mode: string;
    block: Block<"bars">;
    expected: {
      barH: number;
      labelW: number;
      trackX: number;
      trackW: number;
      h: number;
      firstRow: {
        y: number;
        labelY: number;
        barY: number;
        barW: number;
        fill: string;
        valueX: number;
      };
      secondRow: { y: number; fill: string; valueX: number };
    };
  }>([
    {
      mode: "stacked",
      block: {
        type: "bars",
        order: "given",
        bars: [
          { label: "Alpha", value: 4, highlight: true },
          { label: "Beta", value: 8 },
        ],
      },
      expected: {
        barH: 0.7407291666666665,
        labelW: 12,
        trackX: 0,
        trackW: 9.629666666666667,
        h: 2.9814479166666668,
        firstRow: {
          y: 0,
          labelY: 0,
          barY: 0.5277760416666667,
          barW: 4.8148333333333335,
          fill: "1A7285",
          valueX: 5.111125,
        },
        secondRow: { y: 1.7129427083333333, fill: "9EA5AD", valueX: 9.925958333333334 },
      },
    },
    {
      mode: "inline",
      block: {
        type: "bars",
        max: 100,
        bars: [10, 40, 60, 80].map((value, i) => ({ label: `Item ${i + 1}`, value })),
      },
      expected: {
        barH: 0.44443749999999993,
        labelW: 2.666625,
        trackX: 2.9629166666666666,
        trackW: 6.66675,
        h: 2.7881562499999997,
        firstRow: {
          y: 0,
          labelY: 0.04860763888888886,
          barY: 0,
          barW: 5.333400000000001,
          fill: "1A7285",
          valueX: 9.925958333333334,
        },
        secondRow: { y: 0.6296197916666666, fill: "1A7285", valueX: 9.925958333333334 },
      },
    },
  ])(
    "lays out $mode bars with their row geometry, fills and value placement",
    ({ block, expected }) => {
      const layout = barsLayout(look, block, { w: 12, k: 1 });
      expect({
        barH: layout.barH,
        labelW: layout.labelW,
        trackX: layout.trackX,
        trackW: layout.trackW,
        h: layout.h,
        firstRow: {
          y: layout.rows[0].y,
          labelY: layout.rows[0].labelY,
          barY: layout.rows[0].barY,
          barW: layout.rows[0].barW,
          fill: layout.rows[0].fill,
          valueX: layout.rows[0].valueX,
        },
        secondRow: {
          y: layout.rows[1].y,
          fill: layout.rows[1].fill,
          valueX: layout.rows[1].valueX,
        },
      }).toEqual(expected);
    },
  );
});
