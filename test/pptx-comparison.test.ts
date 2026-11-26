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
  beforeAfterComparisonLayout,
  comparisonCardsLayout,
  comparisonFootLayout,
  drawBeforeAfterComparison,
  drawComparison,
  drawComparisonCards,
  drawComparisonFoot,
  splitSideItems,
  vsSideItems,
  type BeforeAfterComparisonLayout,
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
    shapes: shapesOf(xml).map(({ prst, x, y, w, h, fill, line, lineW, texts }) => ({
      prst,
      x: r4(x),
      y: r4(y),
      w: r4(w),
      h: r4(h),
      fill,
      line,
      lineW,
      texts,
    })),
    pics: picsOf(xml).map(({ x, y, w, h, alt }) => ({
      x: r4(x),
      y: r4(y),
      w: r4(w),
      h: r4(h),
      alt,
    })),
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
      label: "a punchline alone",
      input: { punchline: "Choose clarity" },
      expected: {
        h: 0.7078645833333332,
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
        ],
      },
    },
    {
      label: "footnotes alone",
      input: { footnotes: ["Source 2026"] },
      expected: {
        h: 0.4847187499999999,
        parts: [
          {
            paras: [{ runs: [{ text: "Source 2026", options: {} }] }],
            o: { size: 13.33, color: "545861", line: 1.4 },
            y: 0.22221874999999996,
            w: 1.163489374457465,
            h: 0.26249999999999996,
          },
        ],
      },
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
    expect(out.shapes).toEqual([
      {
        prst: "rect",
        x: 3.6365,
        y: 5.25,
        w: 6.06,
        h: 0.35,
        fill: "1A7285",
        line: undefined,
        lineW: undefined,
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

describe("comparisonCardsLayout, beforeAfterComparisonLayout, and drawing", () => {
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

  const titleO = {
    size: 18,
    mono: true,
    bold: true,
    color: "19283A",
    line: 1.35,
    tracking: -0.015,
  };
  const itemO = { size: 18, color: "19283A", line: 1.4 };

  it.each<{
    label: string;
    slide: ComparisonSidesSlide;
    box: Area;
    expected: ComparisonCardsLayout;
  }>([
    {
      label: "equal-height split cards with logo and markdown labels",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "split",
        left: { label: "**Left**", logo: "logo.png", items: ["Alpha"] },
        right: { label: "Right", items: ["Beta"] },
      },
      box: area,
      expected: {
        surface: { fill: "FFFFFF", line: "D0D2D8" },
        titleO,
        itemO,
        cards: [
          {
            x: 1,
            y: 2.6183194444444444,
            w: 4.851854166666667,
            h: 1.9837812499999998,
            logo: {
              src: "logo.png",
              alt: "Left",
              area: {
                x: 1.2962916666666666,
                y: 2.9146111111111113,
                w: 1.4,
                h: 0.3333333333333333,
              },
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
      },
    },
    {
      label: "vs cards (default variant) with litCard, literal labels, and plus/minus items",
      slide: {
        type: "comparison",
        headline: "H",
        left: { label: "**Literal**", items: ["- Slow", "+ Fast"] },
        right: { label: "Option B", items: ["Steady"] },
      },
      box: area,
      expected: {
        surface: { fill: "DCE9EC", line: "1A7285" },
        titleO,
        itemO,
        cards: [
          {
            x: 1,
            y: 2.6273726851851853,
            w: 4.851854166666667,
            h: 1.9634114583333333,
            logo: undefined,
            label: { runs: [{ text: "**Literal**" }] },
            labelArea: {
              x: 1.2962916666666666,
              y: 2.923664351851852,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              {
                runs: [
                  { text: "+  ", options: { color: "15803D", bold: true } },
                  { text: "Fast", options: {} },
                ],
                after: 7.9998749999999985,
              },
              {
                runs: [
                  { text: "−  ", options: { color: "DC2626", bold: true } },
                  { text: "Slow", options: {} },
                ],
                after: 7.9998749999999985,
              },
            ],
            itemsArea: {
              x: 1.2962916666666666,
              y: 3.483383101851852,
              w: 4.259270833333334,
              h: 0.811109375,
            },
          },
          {
            x: 6.148145833333333,
            y: 2.6273726851851853,
            w: 4.851854166666667,
            h: 1.9634114583333333,
            logo: undefined,
            label: { runs: [{ text: "Option B" }] },
            labelArea: {
              x: 6.4444375,
              y: 2.923664351851852,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              {
                runs: [
                  { text: "+  ", options: { color: "15803D", bold: true } },
                  { text: "Steady", options: {} },
                ],
                after: 7.9998749999999985,
              },
            ],
            itemsArea: {
              x: 6.4444375,
              y: 3.483383101851852,
              w: 4.259270833333334,
              h: 0.811109375,
            },
          },
        ],
        footY: 4.590784143518519,
        foot: { h: 0, parts: [] },
      },
    },
    {
      label: "split cards lifted upward by a punchline foot band",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "split",
        left: { label: "Left", logo: "logo.png", items: ["Alpha"] },
        right: { label: "Right", items: ["Beta"] },
        punchline: "Summary",
      },
      box: area,
      expected: {
        surface: { fill: "FFFFFF", line: "D0D2D8" },
        titleO,
        itemO,
        cards: [
          {
            x: 1,
            y: 2.303712962962963,
            w: 4.851854166666667,
            h: 1.9837812499999998,
            logo: {
              src: "logo.png",
              alt: "Left",
              area: {
                x: 1.2962916666666666,
                y: 2.6000046296296295,
                w: 1.4,
                h: 0.3333333333333333,
              },
            },
            label: { runs: [{ text: "Left", options: {} }] },
            labelArea: {
              x: 1.2962916666666666,
              y: 3.081483796296296,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              { runs: [{ text: "Alpha", options: {} }], bullet: true, after: 7.9998749999999985 },
            ],
            itemsArea: {
              x: 1.2962916666666666,
              y: 3.641202546296296,
              w: 4.259270833333334,
              h: 0.35000000000000053,
            },
          },
          {
            x: 6.148145833333333,
            y: 2.303712962962963,
            w: 4.851854166666667,
            h: 1.9837812499999998,
            logo: undefined,
            label: { runs: [{ text: "Right", options: {} }] },
            labelArea: {
              x: 6.4444375,
              y: 2.6000046296296295,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              { runs: [{ text: "Beta", options: {} }], bullet: true, after: 7.9998749999999985 },
            ],
            itemsArea: {
              x: 6.4444375,
              y: 3.1597233796296296,
              w: 4.259270833333334,
              h: 0.831479166666667,
            },
          },
        ],
        footY: 4.287494212962963,
        foot: {
          h: 0.7078645833333332,
          parts: [
            {
              paras: { runs: [{ text: "Summary", options: {} }], balance: true },
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
          ],
        },
      },
    },
    {
      label: "split cards with zero height for items cut by the footer",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "split",
        left: { label: "Left", logo: "logo.png", items: ["Alpha"] },
        right: { label: "Right", items: ["Beta"] },
        punchline: "Summary",
      },
      box: { x: 1, y: 1.5, w: 10, h: 2.2 },
      expected: {
        surface: { fill: "FFFFFF", line: "D0D2D8" },
        titleO,
        itemO,
        cards: [
          {
            x: 1,
            y: 1.5,
            w: 4.851854166666667,
            h: 1.492135416666667,
            logo: {
              src: "logo.png",
              alt: "Left",
              area: {
                x: 1.2962916666666666,
                y: 1.7962916666666666,
                w: 1.4,
                h: 0.3333333333333333,
              },
            },
            label: { runs: [{ text: "Left", options: {} }] },
            labelArea: {
              x: 1.2962916666666666,
              y: 2.2777708333333333,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              { runs: [{ text: "Alpha", options: {} }], bullet: true, after: 7.9998749999999985 },
            ],
            itemsArea: {
              x: 1.2962916666666666,
              y: 2.8374895833333333,
              w: 4.259270833333334,
              h: 0,
            },
          },
          {
            x: 6.148145833333333,
            y: 1.5,
            w: 4.851854166666667,
            h: 1.492135416666667,
            logo: undefined,
            label: { runs: [{ text: "Right", options: {} }] },
            labelArea: {
              x: 6.4444375,
              y: 1.7962916666666666,
              w: 4.259270833333334,
              h: 0.3375,
            },
            items: [
              { runs: [{ text: "Beta", options: {} }], bullet: true, after: 7.9998749999999985 },
            ],
            itemsArea: {
              x: 6.4444375,
              y: 2.356010416666667,
              w: 4.259270833333334,
              h: 0.339833333333333,
            },
          },
        ],
        footY: 2.9921354166666667,
        foot: {
          h: 0.7078645833333332,
          parts: [
            {
              paras: { runs: [{ text: "Summary", options: {} }], balance: true },
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
          ],
        },
      },
    },
  ])("comparisonCardsLayout measures $label", ({ slide, box, expected }) => {
    expect(comparisonCardsLayout(look, slide, box)).toEqual(expected);
  });

  it.each<{
    label: string;
    slide: ComparisonSidesSlide;
    expected: BeforeAfterComparisonLayout;
  }>([
    {
      label: "replace mode (default strike) with a punchline",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "before-after",
        left: { label: "Before", items: ["Manual"] },
        right: { label: "After", items: ["Automated"] },
        punchline: "Faster",
      },
      expected: {
        body: {
          k: 1,
          pad: 0.25,
          gap: 0.7,
          half: 4.65,
          o: { size: 18, color: "19283A" },
          connector: "arrow",
          sides: [
            {
              surface: { fill: "ECEEEF", line: "D0D2D8" },
              icon: { kind: "cross", color: "545861", d: 0.325 },
              indent: 0.445,
              label: {
                runs: [{ text: "Before", options: { color: "545861" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [
                {
                  runs: [{ text: "Manual", options: { strike: "sngStrike", color: "545861" } }],
                  after: 6,
                },
              ],
              labelH: 0.3625,
              restH: 0.3625,
            },
            {
              surface: { fill: "DCE9EC", line: "1A7285" },
              icon: { kind: "check", color: "1A7285", d: 0.325 },
              indent: 0.445,
              label: {
                runs: [{ text: "After", options: { color: "1A7285" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [{ runs: [{ text: "Automated", options: {} }], after: 6 }],
              labelH: 0.3625,
              restH: 0.3625,
            },
          ],
          h: 1.475,
        },
        bodyArea: { x: 1, y: 2.5298379629629633, w: 10, h: 1.475 },
        foot: {
          h: 0.7078645833333332,
          parts: [
            {
              paras: { runs: [{ text: "Faster", options: {} }], balance: true },
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
          ],
        },
        footY: 4.004837962962963,
      },
    },
    {
      label: "add mode (strike: false, adds: true) with footnotes",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "before-after",
        strike: false,
        adds: true,
        left: { label: "Stays", items: ["Core API"] },
        right: { label: "Added", items: ["Webhooks"] },
        footnotes: ["Note"],
      },
      expected: {
        body: {
          k: 1,
          pad: 0.25,
          gap: 0.7,
          half: 4.65,
          o: { size: 18, color: "19283A" },
          connector: "plus",
          sides: [
            {
              surface: { fill: "FFFFFF", line: "D0D2D8" },
              icon: undefined,
              indent: 0,
              label: {
                runs: [{ text: "Stays", options: { color: "545861" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [{ runs: [{ text: "Core API", options: {} }], after: 6 }],
              labelH: 0.3625,
              restH: 0.3625,
            },
            {
              surface: { fill: "DCE9EC", line: "1A7285" },
              icon: undefined,
              indent: 0,
              label: {
                runs: [{ text: "Added", options: { color: "1A7285" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [{ runs: [{ text: "Webhooks", options: {} }], after: 6 }],
              labelH: 0.3625,
              restH: 0.3625,
            },
          ],
          h: 1.475,
        },
        bodyArea: { x: 1, y: 2.629013888888889, w: 10, h: 1.475 },
        foot: {
          h: 0.4847187499999999,
          parts: [
            {
              paras: [{ runs: [{ text: "Note", options: {} }] }],
              o: { size: 13.33, color: "545861", line: 1.4 },
              y: 0.22221874999999996,
              w: 0.44319332885742196,
              h: 0.26249999999999996,
            },
          ],
        },
        footY: 4.10401388888889,
      },
    },
    {
      label: "transition mode (strike: false without adds) with no foot",
      slide: {
        type: "comparison",
        headline: "H",
        variant: "before-after",
        strike: false,
        left: { label: "Current", items: ["Nightly"] },
        right: { label: "Target", items: ["Continuous"] },
      },
      expected: {
        body: {
          k: 1,
          pad: 0.25,
          gap: 0.7,
          half: 4.65,
          o: { size: 18, color: "19283A" },
          connector: "arrow",
          sides: [
            {
              surface: { fill: "FFFFFF", line: "D0D2D8" },
              icon: undefined,
              indent: 0,
              label: {
                runs: [{ text: "Current", options: { color: "545861" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [{ runs: [{ text: "Nightly", options: {} }], after: 6 }],
              labelH: 0.3625,
              restH: 0.3625,
            },
            {
              surface: { fill: "DCE9EC", line: "1A7285" },
              icon: { kind: "check", color: "1A7285", d: 0.325 },
              indent: 0.445,
              label: {
                runs: [{ text: "Target", options: { color: "1A7285" } }],
                mono: true,
                bold: true,
                rel: 1,
              },
              rest: [{ runs: [{ text: "Continuous", options: {} }], after: 6 }],
              labelH: 0.3625,
              restH: 0.3625,
            },
          ],
          h: 1.475,
        },
        bodyArea: { x: 1, y: 2.844444444444444, w: 10, h: 1.475 },
        foot: { h: 0, parts: [] },
        footY: 4.319444444444445,
      },
    },
  ])("beforeAfterComparisonLayout measures $label", ({ slide, expected }) => {
    expect(beforeAfterComparisonLayout(look, slide, area)).toEqual(expected);
  });

  it("allocates zero height to the comparison sides when the footer fills the body", async () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      left: { label: "Left", items: ["Alpha"] },
      right: { label: "Right", items: ["Beta"] },
      punchline: "Summary",
    };
    const box = { ...area, h: 0.5 };
    const cards = comparisonCardsLayout(look, slide, box);
    const pair = beforeAfterComparisonLayout(look, slide, box);
    expect({
      heights: [...cards.cards.map((card) => card.h), pair.bodyArea.h],
      footPositions: [cards.footY, pair.footY],
    }).toEqual({ heights: [0, 0, 0], footPositions: [box.y, box.y] });
    for (const [draw, marker] of [
      [(sheet: Sheet) => drawComparisonCards(sheet, cards), " +"],
      [(sheet: Sheet) => drawBeforeAfterComparison(sheet, pair), ""],
    ] as const) {
      const { shapes, warnings } = await drawOnSheet(assetsDir, draw);
      expect(shapes.map((shape) => shape.texts)).toEqual([["Summary"]]);
      expect(warnings).toEqual([
        `text "Left${marker} Alpha": no height left in its box`,
        `text "Right${marker} Beta": no height left in its box`,
      ]);
    }
  });

  it("omits the comparison item box with no remaining height", async () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      headline: "H",
      variant: "split",
      left: { label: "Left", logo: "logo.png", items: ["Alpha"] },
      right: { label: "Right", items: ["Beta"] },
      punchline: "Summary",
    };
    const box = { ...area, h: 2.2 };
    const { shapes, warnings } = await drawOnSheet(assetsDir, (sheet) => {
      drawComparisonCards(sheet, comparisonCardsLayout(look, slide, box));
    });
    expect(shapes.flatMap((shape) => shape.texts)).toEqual(["Left", "Right", "Beta", "Summary"]);
    expect(warnings).toEqual(['text "Alpha": no height left in its box']);
  });

  it("drawComparisonCards draws cards, logo picture, label/item boxes, and footer at exact layout coordinates", async () => {
    const layout: ComparisonCardsLayout = {
      surface: { fill: "FFFFFF", line: "D0D2D8" },
      titleO,
      itemO,
      cards: [
        {
          x: 1,
          y: 2,
          w: 4.8,
          h: 2,
          logo: { src: "logo.png", alt: "Left", area: { x: 1.3, y: 2.3, w: 1.4, h: 0.35 } },
          label: { runs: [{ text: "Left" }] },
          labelArea: { x: 1.3, y: 2.8, w: 4.2, h: 0.35 },
          items: [{ runs: [{ text: "Alpha" }], bullet: true }],
          itemsArea: { x: 1.3, y: 3.3, w: 4.2, h: 0.45 },
        },
        {
          x: 6.2,
          y: 2,
          w: 4.8,
          h: 2,
          logo: undefined,
          label: { runs: [{ text: "Right" }] },
          labelArea: { x: 6.5, y: 2.3, w: 4.2, h: 0.35 },
          items: [{ runs: [{ text: "Beta" }], bullet: true }],
          itemsArea: { x: 6.5, y: 2.9, w: 4.2, h: 0.85 },
        },
      ],
      footY: 4,
      foot: {
        h: 0.7,
        parts: [
          {
            paras: { runs: [{ text: "Summary" }], balance: true },
            o: { size: 18, mono: true, bold: true, color: "1A7285", align: "center", line: 1.35 },
            y: 0.35,
            w: 6,
            h: 0.35,
          },
        ],
      },
    };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawComparisonCards(sheet, layout);
    });
    expect(out).toEqual({
      warnings: [],
      pics: [{ x: 1.3, y: 2.3, w: 0.35, h: 0.35, alt: "Left" }],
      shapes: [
        {
          prst: "round2DiagRect",
          x: 1,
          y: 2,
          w: 4.8,
          h: 2,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 1.3,
          y: 2.8,
          w: 4.242,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Left"],
        },
        {
          prst: "rect",
          x: 1.3,
          y: 3.3,
          w: 4.242,
          h: 0.45,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Alpha"],
        },
        {
          prst: "round2DiagRect",
          x: 6.2,
          y: 2,
          w: 4.8,
          h: 2,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 6.5,
          y: 2.3,
          w: 4.242,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Right"],
        },
        {
          prst: "rect",
          x: 6.5,
          y: 2.9,
          w: 4.242,
          h: 0.85,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Beta"],
        },
        {
          prst: "rect",
          x: 3.6365,
          y: 4.35,
          w: 6.06,
          h: 0.35,
          fill: "1A7285",
          line: undefined,
          lineW: undefined,
          texts: ["Summary"],
        },
      ],
    });
  });

  it("drawBeforeAfterComparison draws the pair at bodyArea and the foot at footY", async () => {
    const layout: BeforeAfterComparisonLayout = {
      body: {
        k: 1,
        pad: 0.25,
        gap: 0.6,
        half: 4.7,
        o: { size: 18, color: "19283A", line: 1.4 },
        connector: "plus",
        sides: [
          {
            surface: { fill: "FFFFFF", line: "D0D2D8" },
            indent: 0,
            label: { runs: [{ text: "Before" }] },
            rest: [{ runs: [{ text: "Manual" }], bullet: true }],
            labelH: 0.35,
            restH: 0.4,
          },
          {
            surface: { fill: "E8F1F3", line: "A4C6CE" },
            indent: 0,
            label: { runs: [{ text: "After" }] },
            rest: [{ runs: [{ text: "Automated" }], bullet: true }],
            labelH: 0.35,
            restH: 0.4,
          },
        ],
        h: 1.5,
      },
      bodyArea: { x: 1, y: 2.4, w: 10, h: 1.5 },
      foot: {
        h: 0.7,
        parts: [
          {
            paras: { runs: [{ text: "Faster" }], balance: true },
            o: { size: 18, mono: true, bold: true, color: "1A7285", align: "center", line: 1.35 },
            y: 0.35,
            w: 6,
            h: 0.35,
          },
        ],
      },
      footY: 3.9,
    };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawBeforeAfterComparison(sheet, layout);
    });
    expect(out).toEqual({
      warnings: [],
      pics: [],
      shapes: [
        {
          prst: "round2DiagRect",
          x: 1,
          y: 2.4,
          w: 4.7,
          h: 1.5,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 1.25,
          y: 2.65,
          w: 4.242,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Before"],
        },
        {
          prst: "rect",
          x: 1.25,
          y: 3.15,
          w: 4.242,
          h: 0.5,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Manual"],
        },
        {
          prst: "round2DiagRect",
          x: 6.3,
          y: 2.4,
          w: 4.7,
          h: 1.5,
          fill: "E8F1F3",
          line: "A4C6CE",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 6.55,
          y: 2.65,
          w: 4.242,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["After"],
        },
        {
          prst: "rect",
          x: 6.55,
          y: 3.15,
          w: 4.242,
          h: 0.5,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Automated"],
        },
        {
          prst: "rect",
          x: 5.697,
          y: 2.85,
          w: 0.606,
          h: 0.6,
          fill: "1A7285",
          line: undefined,
          lineW: undefined,
          texts: ["+"],
        },
        {
          prst: "rect",
          x: 3.6365,
          y: 4.25,
          w: 6.06,
          h: 0.35,
          fill: "1A7285",
          line: undefined,
          lineW: undefined,
          texts: ["Faster"],
        },
      ],
    });
  });

  it.each<{ label: string; variant: string }>([
    { label: "an unknown variant ('Vs')", variant: "Vs" },
    { label: "a prototype key ('constructor')", variant: "constructor" },
  ])("drawComparison falls back to split cards for $label", async ({ variant }) => {
    const slide = JSON.parse(
      JSON.stringify({
        type: "comparison",
        headline: "Compare",
        variant,
        left: { label: "**Left**", items: ["- Plain bullet"] },
        right: { label: "Right", items: ["Second"] },
      }),
    ) as ComparisonSidesSlide;
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawComparison(sheet, slide);
    });
    expect(out).toEqual({
      warnings: [],
      pics: [],
      shapes: [
        {
          prst: "rect",
          x: 0.6667,
          y: 0.8125,
          w: 12.1197,
          h: 0.55,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Compare"],
        },
        {
          prst: "round2DiagRect",
          x: 0.6667,
          y: 3.2541,
          w: 5.8517,
          h: 1.5023,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 0.963,
          y: 3.5504,
          w: 5.3117,
          h: 0.3375,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Left"],
        },
        {
          prst: "rect",
          x: 0.963,
          y: 4.1101,
          w: 5.3117,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["- Plain bullet"],
        },
        {
          prst: "round2DiagRect",
          x: 6.8146,
          y: 3.2541,
          w: 5.8517,
          h: 1.5023,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 7.1109,
          y: 3.5504,
          w: 5.3117,
          h: 0.3375,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Right"],
        },
        {
          prst: "rect",
          x: 7.1109,
          y: 4.1101,
          w: 5.3117,
          h: 0.35,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Second"],
        },
      ],
    });
  });

  it("drawComparison dispatches variant 'before-after' through the before-after layout", async () => {
    const slide: ComparisonSidesSlide = {
      type: "comparison",
      headline: "Shift",
      variant: "before-after",
      strike: false,
      adds: true,
      left: { label: "Stays", items: ["Core"] },
      right: { label: "Adds", items: ["Events"] },
    };
    const out = await drawOnSheet(assetsDir, (sheet) => {
      drawComparison(sheet, slide);
    });
    expect(out).toEqual({
      warnings: [],
      pics: [],
      shapes: [
        {
          prst: "rect",
          x: 0.6667,
          y: 0.8125,
          w: 12.1197,
          h: 0.55,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Shift"],
        },
        {
          prst: "round2DiagRect",
          x: 0.6667,
          y: 3.2662,
          w: 5.6498,
          h: 1.475,
          fill: "FFFFFF",
          line: "D0D2D8",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 0.9167,
          y: 3.5162,
          w: 5.2013,
          h: 0.3625,
          fill: "545861",
          line: undefined,
          lineW: undefined,
          texts: ["Stays"],
        },
        {
          prst: "rect",
          x: 0.9167,
          y: 4.0287,
          w: 5.2013,
          h: 0.4625,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Core"],
        },
        {
          prst: "round2DiagRect",
          x: 7.0165,
          y: 3.2662,
          w: 5.6498,
          h: 1.475,
          fill: "DCE9EC",
          line: "1A7285",
          lineW: 1,
          texts: [],
        },
        {
          prst: "rect",
          x: 7.2665,
          y: 3.5162,
          w: 5.2013,
          h: 0.3625,
          fill: "1A7285",
          line: undefined,
          lineW: undefined,
          texts: ["Adds"],
        },
        {
          prst: "rect",
          x: 7.2665,
          y: 4.0287,
          w: 5.2013,
          h: 0.4625,
          fill: "19283A",
          line: undefined,
          lineW: undefined,
          texts: ["Events"],
        },
        {
          prst: "rect",
          x: 6.313,
          y: 3.6537,
          w: 0.707,
          h: 0.7,
          fill: "1A7285",
          line: undefined,
          lineW: undefined,
          texts: ["+"],
        },
      ],
    });
  });
});
