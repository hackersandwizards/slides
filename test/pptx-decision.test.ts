import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  decisionBranchItems,
  decisionColumns,
  decisionLayout,
  decisionTeamColors,
  drawDecisionBar,
  drawDecisionBranch,
  drawDecisionHead,
  measureDecisionBranch,
  type DecisionBranchLayout,
  type DecisionColumns,
  type DecisionLayout,
  type DecisionTeamColors,
  type MeasuredBranch,
} from "../scripts/pptx/slides/decision";
import type { StackItem } from "../scripts/pptx/stack";
import type { Area } from "../scripts/pptx/stage";
import type { DecisionSlide } from "../types/slide";
import { shapesOf } from "./fixtures/rendered-deck";

const r4 = (n: number) => Number(n.toFixed(4));

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
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = zip.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  return shapesOf(await file.async("string"));
}

describe("decisionColumns", () => {
  it("computes the seven fixed and flexible branch column offsets and widths", () => {
    const area: Area = { x: 1, y: 2, w: 12, h: 4 };
    const cols = decisionColumns(area);
    expect({
      x: cols.x.map(r4),
      w: cols.w.map(r4),
    }).toEqual<DecisionColumns>({
      x: [1, 3.2222, 3.8148, 5.8888, 6.9999, 9.963, 10.4815],
      w: [2.2222, 0.5926, 2.074, 1.1111, 2.9631, 0.5185, 2.5185],
    });
  });
});

describe("decisionTeamColors", () => {
  const day = palette(false);

  it.each<{ label: string; team: string; expected: DecisionTeamColors }>([
    { label: "enabling team", team: "enabling", expected: { tone: "9333EA", line: "9333EA" } },
    { label: "platform team", team: "platform", expected: { tone: "155B6A", line: "1A7285" } },
    {
      label: "stream-aligned fallback",
      team: "stream",
      expected: { tone: "A3402A", line: "A3402A" },
    },
    {
      label: "prototype key fallback",
      team: "constructor",
      expected: { tone: "A3402A", line: "A3402A" },
    },
  ])("resolves colours for $label", ({ team, expected }) => {
    expect(decisionTeamColors(team, day)).toEqual(expected);
  });
});

describe("decisionBranchItems and measureDecisionBranch", () => {
  const look = new Look(palette(false), "en", false);
  const day = look.c;

  it("decisionBranchItems builds the team-coloured title item followed by the spaced body text item", () => {
    expect(
      decisionBranchItems(
        { label: "Yes", team: "platform", title: "Platform team", text: "Provide API" },
        day,
      ),
    ).toEqual<StackItem[]>([
      {
        text: { runs: [{ text: "Platform team", options: { color: "155B6A" } }] },
        o: {
          size: 18,
          mono: true,
          bold: true,
          color: "19283A",
          line: 1.25,
          tracking: -0.015,
        },
        gap: 0,
      },
      {
        text: { runs: [{ text: "Provide API", options: {} }] },
        o: { size: 18, color: "19283A", line: 1.375 },
        gap: 0.07407291666666665,
      },
    ]);
  });

  it("measureDecisionBranch returns label, border colour, stacked items, and measured inner height", () => {
    expect(
      measureDecisionBranch(
        look,
        { label: "Yes", team: "platform", title: "Platform", text: "Run CI" },
        2.5,
      ),
    ).toEqual<MeasuredBranch>({
      label: "Yes",
      lineColor: "1A7285",
      items: [
        {
          text: { runs: [{ text: "Platform", options: { color: "155B6A" } }] },
          o: {
            size: 18,
            mono: true,
            bold: true,
            color: "19283A",
            line: 1.25,
            tracking: -0.015,
          },
          gap: 0,
        },
        {
          text: { runs: [{ text: "Run CI", options: {} }] },
          o: { size: 18, color: "19283A", line: 1.375 },
          gap: 0.07407291666666665,
        },
      ],
      innerH: 0.7303229166666667,
    });
  });
});

describe("drawDecisionBar and drawDecisionHead", () => {
  it("drawDecisionBar draws a horizontal teal connector bar centred vertically on y", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawDecisionBar(sheet, { x: 2, y: 3 }, 1.5);
    });
    expect(
      shapes.map(({ prst, x, y, w, h, fill }) => ({
        prst,
        x: r4(x),
        y: r4(y),
        w: r4(w),
        h: r4(h),
        fill,
      })),
    ).toEqual([{ prst: "rect", x: 2, y: 2.9815, w: 1.5, h: 0.037, fill: "1A7285" }]);
  });

  it("drawDecisionHead draws a 90-degree rotated teal triangle pointing to tip", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawDecisionHead(sheet, { x: 4, y: 3 });
    });
    assert(shapes.length === 1, "one arrowhead shape");
    const rot = /rot="(\d+)"/.exec(shapes[0].xml);
    assert(rot, "triangle rotation");
    expect({
      prst: shapes[0].prst,
      x: r4(shapes[0].x),
      y: r4(shapes[0].y),
      w: r4(shapes[0].w),
      h: r4(shapes[0].h),
      fill: shapes[0].fill,
      rot: rot[1],
    }).toEqual({
      prst: "triangle",
      x: 3.8444,
      y: 2.9333,
      w: 0.1778,
      h: 0.1333,
      fill: "1A7285",
      rot: "5400000",
    });
  });
});

describe("decisionLayout and drawDecisionBranch", () => {
  const look = new Look(palette(false), "en", false);
  const area: Area = { x: 0.6666666666666666, y: 1.5, w: 12, h: 5 };
  const slide: DecisionSlide = {
    type: "decision",
    headline: "Build or enable",
    need: "Need CI",
    question: "Shared?",
    yes: { label: "Yes", team: "platform", title: "Platform", text: "Run CI" },
    no: { label: "No", team: "enabling", title: "Enabling", text: "Coach team" },
    outcome: "Faster delivery",
    caption: "Revisit each quarter",
  };

  it("decisionLayout measures equal-height branches, endpoint boxes, connectors, and caption", () => {
    const layout = decisionLayout(look, slide, area);
    const roundArea = (box: Area) => ({
      x: r4(box.x),
      y: r4(box.y),
      w: r4(box.w),
      h: r4(box.h),
    });
    expect({
      need: roundArea(layout.need),
      question: roundArea(layout.question),
      outcome: roundArea(layout.outcome),
      rowH: r4(layout.rowH),
      gridH: r4(layout.gridH),
      capH: r4(layout.capH),
      top: r4(layout.top),
      mid: r4(layout.mid),
      forkX: r4(layout.forkX),
      joinX: r4(layout.joinX),
      branches: layout.branches.map(({ label, lineColor, innerH, by, cy, labelY }) => ({
        label,
        lineColor,
        innerH: r4(innerH),
        by: r4(by),
        cy: r4(cy),
        labelY: r4(labelY),
      })),
    }).toEqual({
      need: { x: 0.6667, y: 3.3146, w: 2.2222, h: 0.6088 },
      question: { x: 3.4814, y: 3.2776, w: 2.074, h: 0.6829 },
      outcome: { x: 10.1482, y: 3.3146, w: 2.5185, h: 0.6088 },
      rowH: 1.1007,
      gridH: 2.7199,
      capH: 0.5722,
      top: 2.2591,
      mid: 3.619,
      forkX: 5.8518,
      joinX: 9.8519,
      branches: [
        {
          label: "Yes",
          lineColor: "1A7285",
          innerH: 0.7303,
          by: 2.2591,
          cy: 2.8094,
          labelY: 2.365,
        },
        {
          label: "No",
          lineColor: "9333EA",
          innerH: 0.7303,
          by: 3.8783,
          cy: 4.4286,
          labelY: 4.523,
        },
      ],
    });
  });

  it("drawDecisionBranch draws fork/join lines, arrowhead, caps label, card, and stacked text", async () => {
    const cols = decisionColumns(area);
    const branch: DecisionBranchLayout = {
      label: "Yes",
      lineColor: "1A7285",
      items: [
        {
          text: { runs: [{ text: "Platform", options: { color: "155B6A" } }] },
          o: { size: 18, mono: true, bold: true, color: "19283A", line: 1.25 },
          gap: 0,
        },
        {
          text: { runs: [{ text: "Run CI", options: {} }] },
          o: { size: 18, color: "19283A", line: 1.375 },
          gap: 0.074,
        },
      ],
      innerH: 0.749,
      by: 2.24,
      cy: 2.8,
      labelY: 2.36,
    };
    const layout: DecisionLayout = {
      cols,
      need: { x: 0.6667, y: 3.31, w: 2.22, h: 0.61 },
      question: { x: 3.48, y: 3.28, w: 2.07, h: 0.68 },
      outcome: { x: 10.15, y: 3.31, w: 2.52, h: 0.61 },
      rowH: 1.12,
      gridH: 2.76,
      capH: 0,
      top: 2.24,
      mid: 3.62,
      forkX: 5.85,
      joinX: 9.85,
      branches: [branch, branch],
    };
    const shapes = await drawOnSheet((sheet) => {
      drawDecisionBranch(sheet, layout, branch);
    });
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
      { prst: "line", x: 5.85, y: 2.8, w: 0, h: 0.82, fill: "1A7285", texts: [] },
      { prst: "line", x: 5.85, y: 2.8, w: 0.8166, h: 0, fill: "1A7285", texts: [] },
      { prst: "triangle", x: 6.511, y: 2.7333, w: 0.1778, h: 0.1333, fill: "1A7285", texts: [] },
      { prst: "rect", x: 5.9611, y: 2.36, w: 0.7107, h: 0.35, fill: "545861", texts: ["Yes"] },
      { prst: "round2DiagRect", x: 6.6666, y: 2.24, w: 2.9631, h: 1.12, fill: "DDEAED", texts: [] },
      {
        prst: "rect",
        x: 6.8888,
        y: 2.4255,
        w: 2.5439,
        h: 0.3125,
        fill: "155B6A",
        texts: ["Platform"],
      },
      {
        prst: "rect",
        x: 6.8888,
        y: 2.812,
        w: 2.5439,
        h: 0.3438,
        fill: "19283A",
        texts: ["Run CI"],
      },
      { prst: "line", x: 9.6297, y: 2.8, w: 0.2203, h: 0, fill: "1A7285", texts: [] },
      { prst: "line", x: 9.85, y: 2.8, w: 0, h: 0.82, fill: "1A7285", texts: [] },
    ]);
  });
});
