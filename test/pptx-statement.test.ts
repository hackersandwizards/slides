import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  lineRuns,
  statementKind,
  type StatementKind,
  type StatementSlide,
} from "../scripts/pptx/slides/statement";
import {
  centredClosingPart,
  centredHeadingParts,
  centredPointsPart,
  centredStatementLayout,
  centredSupportParts,
  drawCentredStatement,
  type CentredPart,
  type CentredStatementLayout,
} from "../scripts/pptx/slides/statement-centred";
import type { Run } from "../scripts/pptx/text";
import { shapesOf } from "./fixtures/rendered-deck";

const r4 = (n: number) => Number(n.toFixed(4));

describe("statementKind", () => {
  it.each<{ label: string; slide: StatementSlide; expected: StatementKind }>([
    { label: "a bare statement", slide: { type: "statement", lines: ["A"] }, expected: "centred" },
    {
      label: "a QR statement without attribution",
      slide: {
        type: "statement",
        lines: ["A"],
        qr: { src: "qr.png", href: "https://example.com" },
      },
      expected: "qr",
    },
    {
      label: "a quoted statement with attribution and QR drops QR to side",
      slide: {
        type: "statement",
        lines: ["A"],
        attribution: "Ada, CTO",
        qr: { src: "qr.png", href: "https://example.com" },
      },
      expected: "side",
    },
    {
      label: "a statement with imageSrc",
      slide: { type: "statement", lines: ["A"], imageSrc: "shot.png" },
      expected: "side",
    },
    {
      label: "a statement with linkedImage",
      slide: {
        type: "statement",
        lines: ["A"],
        linkedImage: { src: "shot.png", alt: "Shot", href: "https://example.com" },
      },
      expected: "side",
    },
  ])("classifies $label as $expected", ({ slide, expected }) => {
    expect(statementKind(slide)).toBe(expected);
  });
});

describe("lineRuns", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    label: string;
    line: string;
    marks: Pick<StatementSlide, "highlighted" | "crossedOut">;
    expected: Run[];
  }>([
    {
      label: "both highlighted and crossedOut spans in one line",
      line: "Fast not slow today",
      marks: { highlighted: "Fast", crossedOut: "slow" },
      expected: [
        { text: "Fast", options: { color: "1A7285" } },
        { text: " not ", options: {} },
        { text: "slow", options: { strike: "sngStrike", color: "545861" } },
        { text: " today", options: {} },
      ],
    },
    {
      label: "a plain line with no marks",
      line: "Plain text",
      marks: {},
      expected: [{ text: "Plain text", options: {} }],
    },
  ])("splits runs for $label", ({ line, marks, expected }) => {
    expect(lineRuns(line, marks, look)).toEqual(expected);
  });
});

describe("centred statement parts", () => {
  const look = new Look(palette(false), "en", false);
  const day = look.c;

  it("centredPointsPart numbers points in teal mono and fits width to the longest line", () => {
    expect(centredPointsPart(["Alpha", "Beta"], day, 12)).toEqual<CentredPart>({
      paras: [
        {
          runs: [
            {
              text: "01\u00a0",
              options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono", fontSize: 20 },
            },
            { text: "Alpha", options: { color: "545861" } },
          ],
          after: 13.333124999999997,
        },
        {
          runs: [
            {
              text: "02\u00a0",
              options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono", fontSize: 20 },
            },
            { text: "Beta", options: { color: "545861" } },
          ],
          after: 13.333124999999997,
        },
      ],
      o: { size: 18, color: "545861", line: 1.375 },
      w: 1.2360595703125001,
      gap: 0.5185104166666665,
    });
  });

  it.each<{
    label: string;
    slide: Pick<StatementSlide, "closing" | "closingStyle">;
    expected: CentredPart | undefined;
  }>([
    {
      label: "no closing",
      slide: {},
      expected: undefined,
    },
    {
      label: "a quoted closing with tinted curly quotes",
      slide: { closing: "Stay lean", closingStyle: "quote" },
      expected: {
        paras: [
          {
            runs: [
              { text: "“", options: { color: "5C9BA8" } },
              { text: "Stay lean", options: { color: "545861", italic: true } },
              { text: "”", options: { color: "5C9BA8" } },
            ],
            bold: true,
            balance: true,
          },
        ],
        o: { size: 20, color: "19283A", line: 1.375, align: "center" },
        w: 8.296166666666664,
        gap: 0.3703645833333333,
      },
    },
    {
      label: "a plain closing",
      slide: { closing: "Act now" },
      expected: {
        paras: [{ runs: [{ text: "Act now", options: {} }], bold: true, balance: true }],
        o: { size: 24, color: "19283A", line: 1.375, align: "center" },
        w: 8.296166666666664,
        gap: 0.3703645833333333,
      },
    },
  ])("centredClosingPart builds $label", ({ slide, expected }) => {
    expect(centredClosingPart(slide, day, 12)).toEqual(expected);
  });

  it.each<{ label: string; slide: StatementSlide; expected: CentredPart[] }>([
    {
      label: "a simple statement at 64 pt",
      slide: { type: "statement", lines: ["Big idea"] },
      expected: [
        {
          paras: [{ runs: [{ text: "Big idea", options: {} }], balance: true }],
          o: {
            size: 64,
            mono: true,
            bold: true,
            color: "19283A",
            tracking: -0.04,
            line: 1.05,
            align: "center",
          },
          w: 12,
          gap: 0,
        },
      ],
    },
    {
      label: "kicker, standalone crossedOut claim, and highlighted 48 pt line",
      slide: {
        type: "statement",
        kicker: "Note",
        crossedOut: "Old way",
        highlighted: "New",
        lines: ["New way"],
      },
      expected: [
        {
          paras: [{ runs: [{ text: "Note", options: { color: "155B6A", lang: "x-caps" } }] }],
          o: {
            size: 16,
            mono: true,
            color: "155B6A",
            tracking: 0.06,
            line: 1.4,
            align: "center",
          },
          w: 12,
          gap: 0,
        },
        {
          paras: [
            { runs: [{ text: "Old way", options: { strike: "sngStrike", color: "545861" } }] },
          ],
          o: { size: 24, mono: true, bold: true, color: "545861", align: "center", line: 1.25 },
          w: 12,
          gap: 0.2962916666666666,
        },
        {
          paras: [
            {
              runs: [
                { text: "New", options: { color: "1A7285" } },
                { text: " way", options: {} },
              ],
              balance: true,
            },
          ],
          o: {
            size: 48,
            mono: true,
            bold: true,
            color: "19283A",
            tracking: -0.04,
            line: 1.05,
            align: "center",
          },
          w: 12,
          gap: 0.2962916666666666,
        },
      ],
    },
  ])("centredHeadingParts builds $label", ({ slide, expected }) => {
    expect(centredHeadingParts(look, slide, 12)).toEqual(expected);
  });

  it("centredSupportParts builds subtitle, points, and closing in order", () => {
    expect(
      centredSupportParts(
        { type: "statement", lines: ["X"], subtitle: "Sub", points: ["One"], closing: "End" },
        day,
        12,
      ),
    ).toEqual<CentredPart[]>([
      {
        paras: [{ runs: [{ text: "Sub", options: { color: "545861" } }], balance: true }],
        o: { size: 24, color: "545861", line: 1.375, align: "center" },
        w: 9.481333333333332,
        gap: 0.2962916666666666,
      },
      {
        paras: [
          {
            runs: [
              {
                text: "01\u00a0",
                options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono", fontSize: 20 },
              },
              { text: "One", options: { color: "545861" } },
            ],
            after: 13.333124999999997,
          },
        ],
        o: { size: 18, color: "545861", line: 1.375 },
        w: 1.04446533203125,
        gap: 0.5185104166666665,
      },
      {
        paras: [{ runs: [{ text: "End", options: {} }], bold: true, balance: true }],
        o: { size: 24, color: "19283A", line: 1.375, align: "center" },
        w: 8.296166666666664,
        gap: 0.3703645833333333,
      },
    ]);
  });
});

describe("centredStatementLayout and drawCentredStatement", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{ label: string; slide: StatementSlide; expected: CentredStatementLayout }>([
    {
      label: "a simple statement centred across the full slide width",
      slide: { type: "statement", lines: ["Big idea"] },
      expected: {
        boxes: [
          {
            paras: [{ runs: [{ text: "Big idea", options: {} }], balance: true }],
            o: {
              size: 64,
              mono: true,
              bold: true,
              color: "19283A",
              tracking: -0.04,
              line: 1.05,
              align: "center",
            },
            area: {
              x: 0.5925833333333328,
              y: 2.8562499999999997,
              w: 12.147833333333335,
              h: 0.9333333333333333,
            },
          },
        ],
        foot: { h: 0 },
      },
    },
    {
      label: "a statement with a footer constrained to CW above the footer band",
      slide: { type: "statement", lines: ["Big idea"], footer: "Source 2026" },
      expected: {
        boxes: [
          {
            paras: [{ runs: [{ text: "Big idea", options: {} }], balance: true }],
            o: {
              size: 64,
              mono: true,
              bold: true,
              color: "19283A",
              tracking: -0.04,
              line: 1.05,
              align: "center",
            },
            area: {
              x: 0.666666666666667,
              y: 2.90625,
              w: 11.999666666666666,
              h: 0.9333333333333333,
            },
          },
        ],
        foot: { text: "Source 2026", h: 0.6125 },
      },
    },
  ])("lays out $label", ({ slide, expected }) => {
    expect(centredStatementLayout(look, slide)).toEqual(expected);
  });

  it("drawCentredStatement renders the boxes and footer in order", async () => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const sheet = new Sheet(look, pptx.addSlide(), {
      pptx,
      assets: "",
      warnings: [],
      charts: new Map(),
    });
    drawCentredStatement(sheet, { type: "statement", lines: ["Big idea"], footer: "Source 2026" });
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const file = zip.file("ppt/slides/slide1.xml");
    assert(file, "slide1.xml");
    const shapes = shapesOf(await file.async("string"));
    expect(
      shapes.map(({ prst, x, y, w, h, fill, texts }) => ({
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
        x: 0.6067,
        y: 2.9063,
        w: 12.1197,
        h: 0.9333,
        fill: "19283A",
        texts: ["Big idea"],
      },
      {
        prst: "line",
        x: 0.6667,
        y: 6.0833,
        w: 11.9997,
        h: 0.001,
        fill: "D0D2D8",
        texts: [],
      },
      {
        prst: "rect",
        x: 0.6667,
        y: 6.1833,
        w: 12.1197,
        h: 0.4625,
        fill: "19283A",
        texts: ["Source 2026"],
      },
    ]);
  });
});
