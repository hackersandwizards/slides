import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import { cardMark, cardsLayout, drawCards, type CardMark } from "../scripts/pptx/blocks/cards";
import { rowGrid } from "../scripts/pptx/blocks/grid";
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

describe("rowGrid", () => {
  const spec = { cols: 2, cw: 3, gapX: 0.5, gapY: 0.25 };

  it.each<{
    label: string;
    items: { id: string; h: number }[];
    expected: {
      cells: { id: string; h: number; x: number; y: number; rowH: number }[];
      rowH: number[];
      h: number;
    };
  }>([
    { label: "no items", items: [], expected: { cells: [], rowH: [], h: 0 } },
    {
      label: "two rows sized to their tallest item",
      items: [
        { id: "a", h: 1 },
        { id: "b", h: 2 },
        { id: "c", h: 1.5 },
      ],
      expected: {
        cells: [
          { id: "a", h: 1, x: 0, y: 0, rowH: 2 },
          { id: "b", h: 2, x: 3.5, y: 0, rowH: 2 },
          { id: "c", h: 1.5, x: 0, y: 2.25, rowH: 1.5 },
        ],
        rowH: [2, 1.5],
        h: 3.75,
      },
    },
  ])("places $label", ({ items, expected }) => {
    expect(rowGrid(items, spec)).toEqual(expected);
  });
});

describe("cardMark", () => {
  const day = palette(false);

  it.each<{
    label: string;
    block: Block<"cards">;
    index: number;
    expected: CardMark | undefined;
  }>([
    {
      label: "a numbered card starting from numberFrom",
      block: {
        type: "cards",
        numbered: true,
        numberFrom: 3,
        items: [{ title: "First" }, { title: "Second" }],
      },
      index: 1,
      expected: { kind: "number", label: "4" },
    },
    {
      label: "an icon card without highlight",
      block: { type: "cards", items: [{ title: "Icon", icon: "shield" }] },
      index: 0,
      expected: { kind: "tile", fill: "EFF5F6" },
    },
    {
      label: "a highlighted icon card",
      block: { type: "cards", highlight: 0, items: [{ title: "Icon", icon: "shield" }] },
      index: 0,
      expected: { kind: "tile", fill: "1A7285" },
    },
    {
      label: "a plain non-dense card",
      block: { type: "cards", items: [{ title: "Plain" }] },
      index: 0,
      expected: { kind: "rule" },
    },
    {
      label: "a plain dense card",
      block: { type: "cards", dense: true, items: [{ title: "Dense" }] },
      index: 0,
      expected: undefined,
    },
  ])("picks the mark for $label", ({ block, index, expected }) => {
    expect(cardMark(block, index, day)).toEqual(expected);
  });
});

describe("cardsLayout", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{
    scale: string;
    block: Block<"cards">;
    expected: {
      cols: number;
      gap: number;
      padX: number;
      padY: number;
      inGap: number;
      titleSize: number;
      textColor: string;
      textLine: number;
      h: number;
    };
  }>([
    {
      scale: "normal",
      block: {
        type: "cards",
        items: [
          { title: "One", text: "Alpha" },
          { title: "Two", items: ["A", "B"] },
        ],
      },
      expected: {
        cols: 2,
        gap: 0.22221874999999996,
        padX: 0.333328125,
        padY: 0.2962916666666666,
        inGap: 0.18518229166666664,
        titleSize: 24,
        textColor: "19283A",
        textLine: 1.375,
        h: 2.2337786458333335,
      },
    },
    {
      scale: "dense",
      block: {
        type: "cards",
        dense: true,
        items: [
          { title: "One", text: "Alpha" },
          { title: "Two", text: "Beta" },
        ],
      },
      expected: {
        cols: 2,
        gap: 0.18518229166666664,
        padX: 0.22221874999999996,
        padY: 0.22221874999999996,
        inGap: 0.03703645833333333,
        titleSize: 18,
        textColor: "545861",
        textLine: 1.5,
        h: 1.2064739583333333,
      },
    },
    {
      scale: "wide",
      block: {
        type: "cards",
        columns: 4,
        items: [1, 2, 3, 4].map((n) => ({ title: `T${n}`, text: "X" })),
      },
      expected: {
        cols: 4,
        gap: 0.22221874999999996,
        padX: 0.22221874999999996,
        padY: 0.22221874999999996,
        inGap: 0.18518229166666664,
        titleSize: 20,
        textColor: "19283A",
        textLine: 1.375,
        h: 1.5613289930555556,
      },
    },
    {
      scale: "denseWide",
      block: {
        type: "cards",
        dense: true,
        columns: 4,
        items: [1, 2, 3, 4].map((n) => ({ title: `T${n}`, text: "X" })),
      },
      expected: {
        cols: 4,
        gap: 0.18518229166666664,
        padX: 0.18518229166666664,
        padY: 0.18518229166666664,
        inGap: 0.03703645833333333,
        titleSize: 17.33,
        textColor: "545861",
        textLine: 1.5,
        h: 1.1226788194444444,
      },
    },
  ])("computes the $scale card metrics and height", ({ block, expected }) => {
    const layout = cardsLayout(look, block, { w: 10, k: 1 });
    expect({
      cols: layout.cols,
      gap: layout.gap,
      padX: layout.padX,
      padY: layout.padY,
      inGap: layout.inGap,
      titleSize: layout.titleO.size,
      textColor: layout.textO.color,
      textLine: layout.textO.line,
      h: layout.h,
    }).toEqual(expected);
  });
});

describe("drawCards", () => {
  it("draws numbered cards with lit highlight surface and offset tile labels", async () => {
    const shapes = await drawOnSheet((sheet) => {
      const layout = cardsLayout(
        sheet,
        {
          type: "cards",
          numbered: true,
          numberFrom: 5,
          highlight: 1,
          items: [
            { title: "Start", text: "First step" },
            { title: "Finish", text: "Second step" },
          ],
        },
        { w: 10, k: 1 },
      );
      drawCards(sheet, layout, { x: 1, y: 1.5 });
    });
    const round = (n: number) => Number(n.toFixed(4));
    const cards = shapes.filter((sh) => sh.prst === "round2DiagRect");
    const tiles = shapes.filter((sh) => sh.prst === "roundRect");
    const numbers = shapes.filter((sh) => ["5", "6"].includes(sh.texts.join("")));
    expect({
      cards: cards.map(({ x, y, fill }) => ({ x: round(x), y: round(y), fill })),
      tileFills: tiles.map((sh) => sh.fill),
      numbers: numbers.map((sh) => sh.texts.join("")),
    }).toEqual({
      cards: [
        { x: 1, y: 1.5, fill: "FFFFFF" },
        { x: 6.1111, y: 1.5, fill: "DCE9EC" },
      ],
      tileFills: ["1A7285", "1A7285"],
      numbers: ["5", "6"],
    });
  });
});
