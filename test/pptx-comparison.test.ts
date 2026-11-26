import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  comparisonCardsLayout,
  comparisonFootLayout,
  drawBeforeAfterComparison,
  drawComparisonCards,
  drawComparisonFoot,
  splitSideItems,
  vsSideItems,
  type ComparisonCardsLayout,
  type ComparisonFootLayout,
} from "../scripts/pptx/slides/comparison";
import type { Area } from "../scripts/pptx/stage";
import type { Para } from "../scripts/pptx/text";
import type { ComparisonSidesSlide } from "../types/slide";
import { picsOf, shapesOf } from "./fixtures/rendered-deck";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const r4 = (n: number) => Number(n.toFixed(4));

async function drawOnSheet(assets: string, draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const warnings: string[] = [];
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets,
    warnings,
    charts: new Map(),
  });
  draw(sheet);
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = zip.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  const xml = await file.async("string");
  return {
    shapes: shapesOf(xml),
    pics: picsOf(xml).map(({ x, y, w, h }) => ({ x: r4(x), y: r4(y), w: r4(w), h: r4(h) })),
    warnings,
  };
}

describe("comparisonFootLayout and drawComparisonFoot", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    label: string;
    input: { punchline?: string; footnotes?: string[] };
    expected: ComparisonFootLayout;
  }>([
    {
      label: "neither punchline nor footnotes",
      input: {},
      expected: { h: 0, parts: [] },
    },
    {
      label: "both a punchline and footnotes",
      input: { punchline: "Choose clarity", footnotes: ["Source 2026"] },
      expected: {
        h: 1.192583333333333,
        parts: [
          {
            paras: { runs: [{ text: "Choose clarity", options: {} }], balance: true },
            o: {
              size: 18,
              mono: true,
              bold: true,
              color: "1A7285",
              align: "center",
              line: 1.35,
            },
            y: 0.3703645833333333,
            w: 7.110999999999999,
            h: 0.3375,
          },
          {
            paras: [{ runs: [{ text: "Source 2026", options: {} }] }],
            o: { size: 13.33, color: "545861", line: 1.4 },
            y: 0.9300833333333332,
            w: 1.163489374457465,
            h: 0.26249999999999996,
          },
        ],
      },
    },
  ])("comparisonFootLayout measures $label", ({ input, expected }) => {
    expect(comparisonFootLayout(look, input)).toEqual(expected);
  });

  it("drawComparisonFoot centres each part at y + part.y", async () => {
    const foot: ComparisonFootLayout = {
      h: 1,
      parts: [
        {
          paras: { runs: [{ text: "Bottom line", options: {} }], balance: true },
          o: { size: 18, mono: true, bold: true, color: "1A7285", align: "center", line: 1.35 },
          y: 0.25,
          w: 6,
          h: 0.35,
        },
      ],
    };
    const out = await drawOnSheet("", (sheet) => {
      drawComparisonFoot(sheet, foot, 5);
    });
    expect(
      out.shapes.map(({ prst, x, y, w, h, fill, texts }) => ({
        prst,
        x: r4(x),
        y: r4(y),
        w: r4(w),
        h: r4(h),
        fill,
        texts,
      })),
    ).toEqual([
      {
        prst: "rect",
        x: 3.6365,
        y: 5.25,
        w: 6.06,
        h: 0.35,
        fill: "1A7285",
        texts: ["Bottom line"],
      },
    ]);
  });
});

describe("vsSideItems and splitSideItems", () => {
  const day = palette(false);

  it("vsSideItems puts highlight first, then plus items, then minus items", () => {
    expect(
      vsSideItems(
        { label: "A", highlight: "Fast", items: ["- Slow setup", "+ Quick runs", "Simple API"] },
        day,
      ),
    ).toEqual<Para[]>([
      {
        runs: [{ text: "Fast", options: { color: "1A7285", lang: "x-caps" } }],
        mono: true,
        bold: true,
        rel: 0.8,
        after: 8,
      },
      {
        runs: [
          { text: "+  ", options: { color: "15803D", bold: true } },
          { text: "Quick runs", options: {} },
        ],
        after: 7.9998749999999985,
      },
      {
        runs: [
          { text: "+  ", options: { color: "15803D", bold: true } },
          { text: "Simple API", options: {} },
        ],
        after: 7.9998749999999985,
      },
      {
        runs: [
          { text: "−  ", options: { color: "DC2626", bold: true } },
          { text: "Slow setup", options: {} },
        ],
        after: 7.9998749999999985,
      },
    ]);
  });

  it("splitSideItems emits highlight followed by markdown bullets", () => {
    expect(splitSideItems({ label: "B", highlight: "Key", items: ["One", "Two"] }, day)).toEqual<
      Para[]
    >([
      {
        runs: [{ text: "Key", options: { color: "1A7285", lang: "x-caps" } }],
        mono: true,
        bold: true,
        rel: 0.8,
        after: 8,
      },
      { runs: [{ text: "One", options: {} }], bullet: true, after: 7.9998749999999985 },
      { runs: [{ text: "Two", options: {} }], bullet: true, after: 7.9998749999999985 },
    ]);
  });
});

describe("comparisonCardsLayout, drawComparisonCards, and drawBeforeAfterComparison", () => {
  const look = new Look(palette(false), "en", false);
  const area: Area = { x: 1, y: 1.5, w: 10, h: 4.5 };
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-comparison-test-"));
    writeFileSync(join(assetsDir, "logo.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it("comparisonCardsLayout measures equal-height split cards with logo and markdown labels", () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      headline: "H",
      variant: "split",
      left: { label: "**Left**", logo: "logo.png", items: ["Alpha"] },
      right: { label: "Right", items: ["Beta"] },
    };
    expect(comparisonCardsLayout(look, slide, area)).toEqual<ComparisonCardsLayout>({
      surface: { fill: "FFFFFF", line: "D0D2D8" },
      titleO: {
        size: 18,
        mono: true,
        bold: true,
        color: "19283A",
        line: 1.35,
        tracking: -0.015,
      },
      itemO: { size: 18, color: "19283A", line: 1.4 },
      cards: [
        {
          x: 1,
          y: 2.6183194444444444,
          w: 4.851854166666667,
          h: 1.9837812499999998,
          logo: {
            src: "logo.png",
            alt: "Left",
            area: { x: 1.2962916666666666, y: 2.9146111111111113, w: 1.4, h: 0.3333333333333333 },
          },
          label: { runs: [{ text: "Left", options: { bold: true } }] },
          labelArea: {
            x: 1.2962916666666666,
            y: 3.3960902777777777,
            w: 4.259270833333334,
            h: 0.3375,
          },
          items: [
            { runs: [{ text: "Alpha", options: {} }], bullet: true, after: 7.9998749999999985 },
          ],
          itemsArea: {
            x: 1.2962916666666666,
            y: 3.9558090277777778,
            w: 4.259270833333334,
            h: 0.34999999999999964,
          },
        },
        {
          x: 6.148145833333333,
          y: 2.6183194444444444,
          w: 4.851854166666667,
          h: 1.9837812499999998,
          logo: undefined,
          label: { runs: [{ text: "Right", options: {} }] },
          labelArea: {
            x: 6.4444375,
            y: 2.9146111111111113,
            w: 4.259270833333334,
            h: 0.3375,
          },
          items: [
            { runs: [{ text: "Beta", options: {} }], bullet: true, after: 7.9998749999999985 },
          ],
          itemsArea: {
            x: 6.4444375,
            y: 3.4743298611111113,
            w: 4.259270833333334,
            h: 0.8314791666666661,
          },
        },
      ],
      footY: 4.602100694444444,
      foot: { h: 0, parts: [] },
    });
  });

  it("drawComparisonCards draws both cards, logo picture, and footer", async () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      headline: "H",
      variant: "split",
      left: { label: "Left", logo: "logo.png", items: ["Alpha"] },
      right: { label: "Right", items: ["Beta"] },
      punchline: "Summary",
    };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawComparisonCards(sheet, slide, area);
    });
    expect({
      warnings: out.warnings,
      pics: out.pics,
      cards: out.shapes
        .filter((sh) => sh.prst === "round2DiagRect")
        .map(({ x, y, w, h, fill }) => ({ x: r4(x), y: r4(y), w: r4(w), h: r4(h), fill })),
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      warnings: [],
      pics: [{ x: 1.2963, y: 2.6, w: 0.3333, h: 0.3333 }],
      cards: [
        { x: 1, y: 2.3037, w: 4.8519, h: 1.9838, fill: "FFFFFF" },
        { x: 6.1481, y: 2.3037, w: 4.8519, h: 1.9838, fill: "FFFFFF" },
      ],
      texts: ["Left", "Alpha", "Right", "Beta", "Summary"],
    });
  });

  it("drawBeforeAfterComparison draws before/after sides and punchline", async () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      headline: "H",
      variant: "before-after",
      left: { label: "Before", items: ["Manual"] },
      right: { label: "After", items: ["Automated"] },
      punchline: "Faster",
    };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawBeforeAfterComparison(sheet, slide, area);
    });
    expect({
      warnings: out.warnings,
      cards: out.shapes.filter((sh) => sh.prst === "round2DiagRect").length,
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      warnings: [],
      cards: 2,
      texts: ["Before", "Manual", "After", "Automated", "Faster"],
    });
  });
});
