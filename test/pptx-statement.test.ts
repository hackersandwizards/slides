import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { statementKind, type StatementKind } from "../scripts/pptx/slides/statement";
import {
  centredClosingPart,
  centredHeadingParts,
  centredPointsPart,
  centredStatementLayout,
  centredSupportParts,
  drawCentredStatement,
  isSimpleStatement,
  lineRuns,
  type CentredPart,
  type CentredStatementLayout,
} from "../scripts/pptx/slides/statement-centred";
import {
  drawQrStatement,
  qrStatementLayout,
  qrStatementParts,
  type QrStatementLayout,
  type QrStatementPart,
} from "../scripts/pptx/slides/statement-qr";
import {
  drawSideStatement,
  sideBodyParas,
  sideClosingPara,
  sideHeadingParas,
  sideMedia,
  sideStatementLayout,
  sideSupportParas,
  type SideMedia,
  type SideStatementLayout,
} from "../scripts/pptx/slides/statement-side";
import type { Para, Run } from "../scripts/pptx/text";
import type { StatementSlide } from "../types/slide";
import { linksOf, picsOf, shapesOf } from "./fixtures/rendered-deck";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const r4 = (n: number) => Number(n.toFixed(4));

async function drawStatementOnSheet(assets: string, draw: (sheet: Sheet) => void) {
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
  const rels = zip.file("ppt/slides/_rels/slide1.xml.rels");
  assert(rels, "slide1.xml.rels");
  const xml = await file.async("string");
  const relsXml = await rels.async("string");
  return {
    shapes: shapesOf(xml).map(({ prst, x, y, w, h, fill, texts, xml: shapeXml }) => ({
      prst,
      x: r4(x),
      y: r4(y),
      w: r4(w),
      h: r4(h),
      fill,
      texts,
      links: linksOf(shapeXml, relsXml),
    })),
    pics: picsOf(xml, relsXml).map(({ x, y, w, h, alt, href }) => ({
      x: r4(x),
      y: r4(y),
      w: r4(w),
      h: r4(h),
      alt,
      href,
    })),
    warnings,
  };
}

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

describe("isSimpleStatement", () => {
  it.each<{ label: string; slide: StatementSlide; expected: boolean }>([
    { label: "a bare statement", slide: { type: "statement", lines: ["Big"] }, expected: true },
    {
      label: "a statement with only a kicker and empty points",
      slide: { type: "statement", kicker: "Intro", lines: ["Big"], points: [] },
      expected: true,
    },
    {
      label: "a statement with points",
      slide: { type: "statement", lines: ["Big"], points: ["One"] },
      expected: false,
    },
    {
      label: "a statement with a closing",
      slide: { type: "statement", lines: ["Big"], closing: "End" },
      expected: false,
    },
    {
      label: "a statement with a subtitle",
      slide: { type: "statement", lines: ["Big"], subtitle: "Sub" },
      expected: false,
    },
    {
      label: "a statement with a highlighted phrase",
      slide: { type: "statement", lines: ["Big"], highlighted: "Big" },
      expected: false,
    },
    {
      label: "a statement with a crossedOut phrase",
      slide: { type: "statement", lines: ["Big"], crossedOut: "Old" },
      expected: false,
    },
  ])("returns $expected for $label", ({ slide, expected }) => {
    expect(isSimpleStatement(slide)).toBe(expected);
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

describe("QR statement layout and drawing", () => {
  const look = new Look(palette(false), "en", false);
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-statement-qr-"));
    writeFileSync(join(assetsDir, "qr.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{ label: string; slide: StatementSlide; expected: QrStatementPart[] }>([
    {
      label: "only display lines with zero leading gap",
      slide: { type: "statement", lines: ["Scan me"] },
      expected: [
        {
          paras: [{ runs: [{ text: "Scan me", options: {} }], balance: true }],
          o: {
            size: 48,
            mono: true,
            bold: true,
            color: "19283A",
            tracking: -0.04,
            line: 1.05,
          },
          gap: 0,
        },
      ],
    },
    {
      label: "kicker, lines, subtitle, numbered points, and quoted closing",
      slide: {
        type: "statement",
        kicker: "Access",
        lines: ["Try it"],
        subtitle: "Open the deck",
        points: ["First step"],
        closing: "Bookmark it",
        closingStyle: "quote",
      },
      expected: [
        {
          paras: [{ runs: [{ text: "Access", options: { color: "155B6A", lang: "x-caps" } }] }],
          o: { size: 16, mono: true, color: "155B6A", tracking: 0.06, line: 1.4 },
          gap: 0,
        },
        {
          paras: [{ runs: [{ text: "Try it", options: {} }], balance: true }],
          o: {
            size: 48,
            mono: true,
            bold: true,
            color: "19283A",
            tracking: -0.04,
            line: 1.05,
          },
          gap: 0.22221874999999996,
        },
        {
          paras: [{ runs: [{ text: "Open the deck", options: {} }] }],
          o: { size: 24, color: "19283A", line: 1.375 },
          gap: 0.22221874999999996,
        },
        {
          paras: [
            {
              runs: [
                {
                  text: "01  ",
                  options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono" },
                },
                { text: "First step", options: { color: "545861" } },
              ],
              after: 13.333124999999997,
            },
          ],
          o: { size: 18, color: "545861", line: 1.375 },
          gap: 0.2962916666666666,
        },
        {
          paras: [{ runs: [{ text: "“Bookmark it”", options: {} }], bold: true }],
          o: { size: 24, color: "19283A", line: 1.375 },
          gap: 0.22221874999999996,
        },
      ],
    },
  ])("qrStatementParts builds $label", ({ slide, expected }) => {
    expect(qrStatementParts(look, slide)).toEqual(expected);
  });

  it.each<{ label: string; slide: StatementSlide; expected: QrStatementLayout | undefined }>([
    {
      label: "returns undefined when qr is absent",
      slide: { type: "statement", lines: ["No code"] },
      expected: undefined,
    },
    {
      label: "measures text boxes, QR card, picture inset, link label, and footer",
      slide: {
        type: "statement",
        lines: ["Scan"],
        qr: { src: "qr.png", href: "https://example.com/demo" },
        footer: "Notes",
      },
      expected: {
        src: "qr.png",
        alt: "QR code: example.com/demo",
        href: "https://example.com/demo",
        boxes: [
          {
            paras: [{ runs: [{ text: "Scan", options: {} }], balance: true }],
            o: {
              size: 48,
              mono: true,
              bold: true,
              color: "19283A",
              tracking: -0.04,
              line: 1.05,
            },
            area: {
              x: 0.6666666666666666,
              y: 1.1769687500000003,
              w: 7.3776875,
              h: 0.7000000000000001,
            },
          },
        ],
        card: {
          x: 8.785083333333334,
          y: 1.1769687500000003,
          w: 3.8812499999999996,
          h: 3.8812499999999996,
        },
        picture: {
          x: 9.155447916666668,
          y: 1.5473333333333337,
          w: 3.140520833333333,
          h: 3.140520833333333,
        },
        label: "↗ example.com/demo",
        labelArea: {
          x: 8.785083333333334,
          y: 5.206364583333333,
          w: 3.8812499999999996,
          h: 0.3625,
        },
        foot: { text: "Notes", h: 0.6125 },
      },
    },
  ])("qrStatementLayout $label", ({ slide, expected }) => {
    expect(qrStatementLayout(look, slide)).toEqual(expected);
  });

  it("drawQrStatement renders the text box, white QR card, linked picture with alt text, linked label, and footer", async () => {
    const out = await drawStatementOnSheet(assetsDir, (sheet) => {
      drawQrStatement(sheet, {
        type: "statement",
        lines: ["Scan"],
        qr: { src: "qr.png", href: "https://example.com/demo" },
        footer: "Notes",
      });
    });
    expect(out).toEqual({
      warnings: [],
      pics: [
        {
          x: 9.1554,
          y: 1.5473,
          w: 3.1405,
          h: 3.1405,
          alt: "QR code: example.com/demo",
          href: "https://example.com/demo",
        },
      ],
      shapes: [
        {
          prst: "rect",
          x: 0.6667,
          y: 1.177,
          w: 7.4515,
          h: 0.7,
          fill: "19283A",
          texts: ["Scan"],
          links: [],
        },
        {
          prst: "roundRect",
          x: 8.7851,
          y: 1.177,
          w: 3.8813,
          h: 3.8813,
          fill: "FFFFFF",
          texts: [],
          links: [],
        },
        {
          prst: "rect",
          x: 8.7657,
          y: 5.2064,
          w: 3.9201,
          h: 0.3625,
          fill: "1A7285",
          texts: ["↗ example.com/demo"],
          links: ["https://example.com/demo"],
        },
        {
          prst: "line",
          x: 0.6667,
          y: 6.0833,
          w: 11.9997,
          h: 0.001,
          fill: "D0D2D8",
          texts: [],
          links: [],
        },
        {
          prst: "rect",
          x: 0.6667,
          y: 6.1833,
          w: 12.1197,
          h: 0.4625,
          fill: "19283A",
          texts: ["Notes"],
          links: [],
        },
      ],
    });
  });

  it("drawQrStatement draws nothing when qr is absent", async () => {
    const out = await drawStatementOnSheet(assetsDir, (sheet) => {
      drawQrStatement(sheet, { type: "statement", lines: ["No code"] });
    });
    expect({ shapes: out.shapes, pics: out.pics, warnings: out.warnings }).toEqual({
      shapes: [],
      pics: [],
      warnings: [],
    });
  });
});

describe("side statement parts, layout, and drawing", () => {
  const look = new Look(palette(false), "en", false);
  const day = look.c;
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-statement-side-"));
    writeFileSync(join(assetsDir, "portrait.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{ label: string; slide: StatementSlide; expected: SideMedia | undefined }>([
    {
      label: "imageSrc without attribution yields non-round media",
      slide: { type: "statement", lines: ["A"], imageSrc: "shot.png", imageAlt: "Shot" },
      expected: { src: "shot.png", alt: "Shot", href: undefined, round: false },
    },
    {
      label: "imageSrc with attribution yields a round portrait",
      slide: {
        type: "statement",
        lines: ["A"],
        imageSrc: "portrait.png",
        imageAlt: "Ada",
        attribution: "Ada, CTO",
      },
      expected: { src: "portrait.png", alt: "Ada", href: undefined, round: true },
    },
    {
      label: "linkedImage yields non-round linked media",
      slide: {
        type: "statement",
        lines: ["A"],
        linkedImage: { src: "shot.png", alt: "Shot", href: "https://example.com" },
      },
      expected: { src: "shot.png", alt: "Shot", href: "https://example.com", round: false },
    },
    {
      label: "no image fields yields undefined",
      slide: { type: "statement", lines: ["A"], attribution: "Ada" },
      expected: undefined,
    },
  ])("sideMedia for $label", ({ slide, expected }) => {
    expect(sideMedia(slide)).toEqual(expected);
  });

  it.each<{ label: string; slide: StatementSlide; expected: Para[] }>([
    {
      label: "kicker, standalone crossedOut claim, and two lines",
      slide: {
        type: "statement",
        kicker: "Myth",
        crossedOut: "Old",
        lines: ["Line 1", "Line 2"],
      },
      expected: [
        {
          runs: [{ text: "Myth", options: { color: "1A7285", lang: "x-caps" } }],
          mono: true,
          bold: true,
          rel: 0.75,
          after: 16,
        },
        {
          runs: [{ text: "Old", options: { strike: "sngStrike", color: "545861" } }],
          mono: true,
          bold: true,
          rel: 1.3333333333333333,
          after: 16,
        },
        {
          runs: [{ text: "Line 1", options: {} }],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 0,
        },
        {
          runs: [{ text: "Line 2", options: {} }],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 16,
        },
      ],
    },
    {
      label: "crossedOut already present inside a line adds no standalone paragraph",
      slide: { type: "statement", crossedOut: "slow", lines: ["Not slow today"] },
      expected: [
        {
          runs: [
            { text: "Not ", options: {} },
            { text: "slow", options: { strike: "sngStrike", color: "545861" } },
            { text: " today", options: {} },
          ],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 16,
        },
      ],
    },
  ])("sideHeadingParas builds $label", ({ slide, expected }) => {
    expect(sideHeadingParas(look, slide)).toEqual(expected);
  });

  it("sideSupportParas builds subtitle and numbered points", () => {
    expect(
      sideSupportParas(
        { type: "statement", lines: ["X"], subtitle: "Context", points: ["First", "Second"] },
        day,
      ),
    ).toEqual<Para[]>([
      {
        runs: [{ text: "Context", options: { color: "545861" } }],
        rel: 1.1111111111111112,
        after: 16,
      },
      {
        runs: [
          { text: "01  ", options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono" } },
          { text: "First", options: {} },
        ],
        rel: 1.1111111111111112,
        after: 6,
      },
      {
        runs: [
          { text: "02  ", options: { color: "1A7285", bold: true, fontFace: "JetBrains Mono" } },
          { text: "Second", options: {} },
        ],
        rel: 1.1111111111111112,
        after: 6,
      },
    ]);
  });

  it.each<{
    label: string;
    slide: Pick<StatementSlide, "closing" | "closingStyle">;
    expected: Para[];
  }>([
    { label: "no closing", slide: {}, expected: [] },
    {
      label: "a quoted closing in italics",
      slide: { closing: "Ship small", closingStyle: "quote" },
      expected: [
        {
          runs: [{ text: "“Ship small”", options: { italic: true } }],
          bold: false,
          rel: 1.1111111111111112,
          after: 4,
        },
      ],
    },
    {
      label: "a plain bold closing",
      slide: { closing: "Move fast" },
      expected: [
        {
          runs: [{ text: "Move fast", options: {} }],
          bold: true,
          rel: 1.1111111111111112,
          after: 4,
        },
      ],
    },
  ])("sideClosingPara builds $label", ({ slide, expected }) => {
    expect(sideClosingPara(slide, day)).toEqual(expected);
  });

  it.each<{ label: string; slide: StatementSlide; expected: Para[] }>([
    {
      label: "attribution places quoted closing before the name and own subtitle after it",
      slide: {
        type: "statement",
        lines: ["Quote"],
        subtitle: "Takeaway",
        closing: "More words",
        closingStyle: "quote",
        attribution: "Ada, CTO",
      },
      expected: [
        {
          runs: [{ text: "Quote", options: {} }],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 16,
        },
        {
          runs: [{ text: "“More words”", options: { italic: true } }],
          bold: false,
          rel: 1.1111111111111112,
          after: 4,
        },
        {
          runs: [
            { text: "Ada", options: { bold: true } },
            { text: ", CTO", options: { color: "545861" } },
          ],
          after: 16,
        },
        {
          runs: [{ text: "Takeaway", options: { color: "545861" } }],
          rel: 1.1111111111111112,
          after: 16,
        },
      ],
    },
    {
      label: "attribution without own text omits trailing spacing on attribution",
      slide: { type: "statement", lines: ["Quote"], attribution: "Ada" },
      expected: [
        {
          runs: [{ text: "Quote", options: {} }],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 16,
        },
        {
          runs: [
            { text: "Ada", options: { bold: true } },
            { text: "", options: { color: "545861" } },
          ],
        },
      ],
    },
    {
      label: "unattributed slide places support then closing",
      slide: { type: "statement", lines: ["Headline"], subtitle: "Sub", closing: "End" },
      expected: [
        {
          runs: [{ text: "Headline", options: {} }],
          mono: true,
          bold: true,
          rel: 2.6666666666666665,
          after: 16,
        },
        {
          runs: [{ text: "Sub", options: { color: "545861" } }],
          rel: 1.1111111111111112,
          after: 16,
        },
        {
          runs: [{ text: "End", options: {} }],
          bold: true,
          rel: 1.1111111111111112,
          after: 4,
        },
      ],
    },
  ])("sideBodyParas for $label", ({ slide, expected }) => {
    expect(sideBodyParas(look, slide)).toEqual(expected);
  });

  it.each<{ label: string; slide: StatementSlide; expected: SideStatementLayout }>([
    {
      label: "an attributed quotation with a round portrait avatar",
      slide: {
        type: "statement",
        lines: ["Quote"],
        attribution: "Ada",
        imageSrc: "portrait.png",
        imageAlt: "Ada",
      },
      expected: {
        paras: [
          {
            runs: [{ text: "Quote", options: {} }],
            mono: true,
            bold: true,
            rel: 2.6666666666666665,
            after: 16,
          },
          {
            runs: [
              { text: "Ada", options: { bold: true } },
              { text: "", options: { color: "545861" } },
            ],
          },
        ],
        area: { x: 0.6666666666666666, y: 0.8125, w: 7.039793333333333, h: 5.833333333333333 },
        o: { size: 18, color: "19283A", align: "left", valign: "middle", line: 1.2, floor: 0.5 },
        foot: { h: 0 },
        side: {
          kind: "avatar",
          media: { src: "portrait.png", alt: "Ada", href: undefined, round: true },
          disc: {
            x: 9.053063333333334,
            y: 2.395833333333333,
            d: 2.6666666666666665,
          },
        },
      },
    },
    {
      label: "a linked image beside centred statement text",
      slide: {
        type: "statement",
        lines: ["Look"],
        linkedImage: { src: "portrait.png", alt: "Shot", href: "https://example.com" },
      },
      expected: {
        paras: [
          {
            runs: [{ text: "Look", options: {} }],
            mono: true,
            bold: true,
            rel: 2.6666666666666665,
            after: 16,
          },
        ],
        area: { x: 0.6666666666666666, y: 0.8125, w: 7.039793333333333, h: 5.833333333333333 },
        o: { size: 18, color: "19283A", align: "center", valign: "middle", line: 1.2, floor: 0.5 },
        foot: { h: 0 },
        side: {
          kind: "picture",
          media: { src: "portrait.png", alt: "Shot", href: "https://example.com", round: false },
          area: {
            x: 8.10646,
            y: 0.8125,
            w: 4.559873333333333,
            h: 5.833333333333333,
          },
        },
      },
    },
    {
      label: "an attributed quotation without a picture uses full content width",
      slide: { type: "statement", lines: ["Quote"], attribution: "Ada" },
      expected: {
        paras: [
          {
            runs: [{ text: "Quote", options: {} }],
            mono: true,
            bold: true,
            rel: 2.6666666666666665,
            after: 16,
          },
          {
            runs: [
              { text: "Ada", options: { bold: true } },
              { text: "", options: { color: "545861" } },
            ],
          },
        ],
        area: { x: 0.6666666666666666, y: 0.8125, w: 11.999666666666666, h: 5.833333333333333 },
        o: { size: 18, color: "19283A", align: "left", valign: "middle", line: 1.2, floor: 0.5 },
        foot: { h: 0 },
      },
    },
  ])("sideStatementLayout for $label", ({ slide, expected }) => {
    expect(sideStatementLayout(look, slide)).toEqual(expected);
  });

  it.each<{
    label: string;
    slide: StatementSlide;
    expected: {
      warnings: string[];
      pics: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
        alt: string | undefined;
        href: string | undefined;
      }>;
      shapes: Array<{
        prst: string | undefined;
        x: number;
        y: number;
        w: number;
        h: number;
        fill: string | undefined;
        texts: string[];
        links: string[];
      }>;
    };
  }>([
    {
      label: "draws a round portrait avatar with alt text beside an attributed statement box",
      slide: {
        type: "statement",
        lines: ["Quote"],
        attribution: "Ada",
        imageSrc: "portrait.png",
        imageAlt: "Ada",
      },
      expected: {
        warnings: [],
        pics: [{ x: 9.0531, y: 2.3958, w: 2.6667, h: 2.6667, alt: "Ada", href: undefined }],
        shapes: [
          {
            prst: "rect",
            x: 0.6667,
            y: 0.8125,
            w: 7.1102,
            h: 5.8333,
            fill: "19283A",
            texts: ["Quote", "Ada"],
            links: [],
          },
        ],
      },
    },
    {
      label: "draws a linked side picture with alt text, hyperlink, and footer",
      slide: {
        type: "statement",
        lines: ["Look"],
        linkedImage: { src: "portrait.png", alt: "Shot", href: "https://example.com" },
        footer: "Source 2026",
      },
      expected: {
        warnings: [],
        pics: [
          {
            x: 8.1065,
            y: 1.143,
            w: 4.5599,
            h: 4.5599,
            alt: "Shot",
            href: "https://example.com",
          },
        ],
        shapes: [
          {
            prst: "rect",
            x: 0.6315,
            y: 0.8125,
            w: 7.1102,
            h: 5.2208,
            fill: "19283A",
            texts: ["Look"],
            links: [],
          },
          {
            prst: "line",
            x: 0.6667,
            y: 6.0833,
            w: 11.9997,
            h: 0.001,
            fill: "D0D2D8",
            texts: [],
            links: [],
          },
          {
            prst: "rect",
            x: 0.6667,
            y: 6.1833,
            w: 12.1197,
            h: 0.4625,
            fill: "19283A",
            texts: ["Source 2026"],
            links: [],
          },
        ],
      },
    },
  ])("drawSideStatement $label", async ({ slide, expected }) => {
    const out = await drawStatementOnSheet(assetsDir, (sheet) => {
      drawSideStatement(sheet, slide);
    });
    expect(out).toEqual(expected);
  });
});
