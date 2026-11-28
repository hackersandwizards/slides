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
  drawDecisionBody,
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
        "155B6A",
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

  it("measureDecisionBranch returns label, distinct border colour, team-tinted stacked items, and measured inner height", () => {
    expect(
      measureDecisionBranch(
        look,
        { label: "Yes", team: "platform", title: "Infra", text: "Own deploys" },
        2.5,
      ),
    ).toEqual<MeasuredBranch>({
      label: "Yes",
      lineColor: "1A7285",
      items: [
        {
          text: { runs: [{ text: "Infra", options: { color: "155B6A" } }] },
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
          text: { runs: [{ text: "Own deploys", options: {} }] },
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

describe("decisionLayout, drawDecisionBranch, and drawDecisionBody", () => {
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
  const bold = { size: 18, bold: true, color: "19283A", line: 1.25 };
  const labelO = { size: 18, mono: true, color: "545861", tracking: 0.06, line: 1.4 };
  const titleO = {
    size: 18,
    mono: true,
    bold: true,
    color: "19283A",
    line: 1.25,
    tracking: -0.015,
  };
  const textO = { size: 18, color: "19283A", line: 1.375 };
  const literalCols: DecisionColumns = {
    x: [0.6667, 2.8889, 3.4815, 5.5555, 6.6666, 9.6297, 10.1482],
    w: [2.2222, 0.5926, 2.074, 1.1111, 2.9631, 0.5185, 2.5185],
  };

  it.each<{ label: string; input: DecisionSlide; expected: DecisionLayout }>([
    {
      label: "equal-height branches, endpoint nodes, connectors, and caption",
      input: slide,
      expected: {
        cols: {
          x: [
            0.6666666666666666, 2.888854166666666, 3.4814374999999993, 5.555479166666665,
            6.666572916666666, 9.629677083333332, 10.148187499999999,
          ],
          w: [
            2.2221874999999995, 0.5925833333333332, 2.074041666666666, 1.1110937499999998,
            2.9631041666666675, 0.5185104166666665, 2.5184791666666664,
          ],
        },
        need: {
          card: {
            x: 0.6666666666666666,
            y: 3.3146116898148144,
            w: 2.2221874999999995,
            h: 0.6087916666666666,
          },
          box: {
            x: 0.8518489583333333,
            y: 3.4627575231481478,
            w: 1.8518229166666662,
            h: 0.3125,
          },
          text: "Need CI",
          o: bold,
        },
        question: {
          card: {
            x: 3.4814374999999993,
            y: 3.277575231481481,
            w: 2.074041666666666,
            h: 0.6828645833333333,
          },
          box: {
            x: 3.666619791666666,
            y: 3.4627575231481478,
            w: 1.7036770833333328,
            h: 0.31250000000000006,
          },
          text: { runs: [{ text: "Shared?", options: {} }], align: "center" },
          o: { ...bold, align: "center" },
        },
        outcome: {
          card: {
            x: 10.148187499999999,
            y: 3.3146116898148144,
            w: 2.5184791666666664,
            h: 0.6087916666666666,
          },
          box: {
            x: 10.333369791666666,
            y: 3.4627575231481478,
            w: 2.1481145833333333,
            h: 0.3125,
          },
          text: "Faster delivery",
          o: bold,
        },
        rowH: 1.1006875,
        mid: 3.6190075231481478,
        forkX: 5.851770833333332,
        joinX: 9.851895833333332,
        labelO,
        branches: [
          {
            label: "Yes",
            lineColor: "1A7285",
            items: [
              {
                text: { runs: [{ text: "Platform", options: { color: "155B6A" } }] },
                o: titleO,
                gap: 0,
              },
              {
                text: { runs: [{ text: "Run CI", options: {} }] },
                o: textO,
                gap: 0.07407291666666665,
              },
            ],
            innerH: 0.7303229166666667,
            by: 2.2590648148148147,
            cy: 2.809408564814815,
            labelArea: {
              x: 5.962880208333332,
              y: 2.364971064814815,
              w: 0.7036927083333332,
              h: 0.35,
            },
          },
          {
            label: "No",
            lineColor: "9333EA",
            items: [
              {
                text: { runs: [{ text: "Enabling", options: { color: "9333EA" } }] },
                o: titleO,
                gap: 0,
              },
              {
                text: { runs: [{ text: "Coach team", options: {} }] },
                o: textO,
                gap: 0.07407291666666665,
              },
            ],
            innerH: 0.7303229166666667,
            by: 3.878262731481481,
            cy: 4.428606481481481,
            labelArea: {
              x: 5.962880208333332,
              y: 4.523043981481481,
              w: 0.7036927083333332,
              h: 0.35,
            },
          },
        ],
        caption: {
          text: "Revisit each quarter",
          area: {
            x: 0.6666666666666666,
            y: 5.201168981481481,
            w: 12,
            h: 0.35000000000000003,
          },
          o: { size: 18, color: "545861", line: 1.4, align: "center" },
        },
      },
    },
    {
      label: "the same grid centred without a caption",
      input: { ...slide, caption: undefined },
      expected: {
        cols: {
          x: [
            0.6666666666666666, 2.888854166666666, 3.4814374999999993, 5.555479166666665,
            6.666572916666666, 9.629677083333332, 10.148187499999999,
          ],
          w: [
            2.2221874999999995, 0.5925833333333332, 2.074041666666666, 1.1110937499999998,
            2.9631041666666675, 0.5185104166666665, 2.5184791666666664,
          ],
        },
        need: {
          card: {
            x: 0.6666666666666666,
            y: 3.568931134259259,
            w: 2.2221874999999995,
            h: 0.6087916666666666,
          },
          box: {
            x: 0.8518489583333333,
            y: 3.7170769675925923,
            w: 1.8518229166666662,
            h: 0.3125,
          },
          text: "Need CI",
          o: bold,
        },
        question: {
          card: {
            x: 3.4814374999999993,
            y: 3.5318946759259258,
            w: 2.074041666666666,
            h: 0.6828645833333333,
          },
          box: {
            x: 3.666619791666666,
            y: 3.7170769675925923,
            w: 1.7036770833333328,
            h: 0.31250000000000006,
          },
          text: { runs: [{ text: "Shared?", options: {} }], align: "center" },
          o: { ...bold, align: "center" },
        },
        outcome: {
          card: {
            x: 10.148187499999999,
            y: 3.568931134259259,
            w: 2.5184791666666664,
            h: 0.6087916666666666,
          },
          box: {
            x: 10.333369791666666,
            y: 3.7170769675925923,
            w: 2.1481145833333333,
            h: 0.3125,
          },
          text: "Faster delivery",
          o: bold,
        },
        rowH: 1.1006875,
        mid: 3.8733269675925923,
        forkX: 5.851770833333332,
        joinX: 9.851895833333332,
        labelO,
        branches: [
          {
            label: "Yes",
            lineColor: "1A7285",
            items: [
              {
                text: { runs: [{ text: "Platform", options: { color: "155B6A" } }] },
                o: titleO,
                gap: 0,
              },
              {
                text: { runs: [{ text: "Run CI", options: {} }] },
                o: textO,
                gap: 0.07407291666666665,
              },
            ],
            innerH: 0.7303229166666667,
            by: 2.5133842592592592,
            cy: 3.0637280092592594,
            labelArea: {
              x: 5.962880208333332,
              y: 2.6192905092592595,
              w: 0.7036927083333332,
              h: 0.35,
            },
          },
          {
            label: "No",
            lineColor: "9333EA",
            items: [
              {
                text: { runs: [{ text: "Enabling", options: { color: "9333EA" } }] },
                o: titleO,
                gap: 0,
              },
              {
                text: { runs: [{ text: "Coach team", options: {} }] },
                o: textO,
                gap: 0.07407291666666665,
              },
            ],
            innerH: 0.7303229166666667,
            by: 4.132582175925926,
            cy: 4.682925925925925,
            labelArea: {
              x: 5.962880208333332,
              y: 4.777363425925926,
              w: 0.7036927083333332,
              h: 0.35,
            },
          },
        ],
        caption: undefined,
      },
    },
  ])("decisionLayout measures $label", ({ input, expected }) => {
    expect(decisionLayout(look, input, area)).toEqual(expected);
  });

  it("drawDecisionBranch draws fork/join lines, arrowhead, caps label, card, and stacked text", async () => {
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
      labelArea: { x: 5.9611, y: 2.36, w: 0.7037, h: 0.35 },
    };
    const layout: DecisionLayout = {
      cols: literalCols,
      need: {
        card: { x: 0.6667, y: 3.31, w: 2.22, h: 0.61 },
        box: { x: 0.85, y: 3.46, w: 1.85, h: 0.31 },
        text: "Need",
        o: bold,
      },
      question: {
        card: { x: 3.48, y: 3.28, w: 2.07, h: 0.68 },
        box: { x: 3.67, y: 3.46, w: 1.7, h: 0.31 },
        text: { runs: [{ text: "Q?" }], align: "center" },
        o: { ...bold, align: "center" },
      },
      outcome: {
        card: { x: 10.15, y: 3.31, w: 2.52, h: 0.61 },
        box: { x: 10.33, y: 3.46, w: 2.15, h: 0.31 },
        text: "Done",
        o: bold,
      },
      rowH: 1.12,
      mid: 3.62,
      forkX: 5.85,
      joinX: 9.85,
      labelO,
      branches: [branch],
    };
    const shapes = await drawOnSheet((sheet) => {
      drawDecisionBranch(sheet, layout, branch);
    });
    expect(
      shapes.map(({ prst, x, y, w, h, fill, line, lineW, texts }) => ({
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
    ).toEqual([
      {
        prst: "line",
        x: 5.85,
        y: 2.8,
        w: 0,
        h: 0.82,
        fill: "1A7285",
        line: "1A7285",
        lineW: 2,
        texts: [],
      },
      {
        prst: "line",
        x: 5.85,
        y: 2.8,
        w: 0.8166,
        h: 0,
        fill: "1A7285",
        line: "1A7285",
        lineW: 2,
        texts: [],
      },
      {
        prst: "triangle",
        x: 6.511,
        y: 2.7333,
        w: 0.1778,
        h: 0.1333,
        fill: "1A7285",
        line: undefined,
        lineW: undefined,
        texts: [],
      },
      {
        prst: "rect",
        x: 5.9611,
        y: 2.36,
        w: 0.7107,
        h: 0.35,
        fill: "545861",
        line: undefined,
        lineW: undefined,
        texts: ["Yes"],
      },
      {
        prst: "roundRect",
        x: 6.6666,
        y: 2.24,
        w: 2.9631,
        h: 1.12,
        fill: "DDEAED",
        line: "1A7285",
        lineW: 1,
        texts: [],
      },
      {
        prst: "rect",
        x: 6.8888,
        y: 2.4255,
        w: 2.5438,
        h: 0.3125,
        fill: "155B6A",
        line: undefined,
        lineW: undefined,
        texts: ["Platform"],
      },
      {
        prst: "rect",
        x: 6.8888,
        y: 2.812,
        w: 2.5438,
        h: 0.3438,
        fill: "19283A",
        line: undefined,
        lineW: undefined,
        texts: ["Run CI"],
      },
      {
        prst: "line",
        x: 9.6297,
        y: 2.8,
        w: 0.2203,
        h: 0,
        fill: "1A7285",
        line: "1A7285",
        lineW: 2,
        texts: [],
      },
      {
        prst: "line",
        x: 9.85,
        y: 2.8,
        w: 0,
        h: 0.82,
        fill: "1A7285",
        line: "1A7285",
        lineW: 2,
        texts: [],
      },
    ]);
  });

  const baseBodyLayout: DecisionLayout = {
    cols: literalCols,
    need: {
      card: { x: 0.6667, y: 3.31, w: 2.2222, h: 0.61 },
      box: { x: 0.8519, y: 3.4581, w: 1.8518, h: 0.3137 },
      text: "Need CI",
      o: bold,
    },
    question: {
      card: { x: 3.4815, y: 3.28, w: 2.074, h: 0.68 },
      box: { x: 3.6667, y: 3.4652, w: 1.7036, h: 0.3096 },
      text: { runs: [{ text: "Shared?" }], align: "center" },
      o: { ...bold, align: "center" },
    },
    outcome: {
      card: { x: 10.1482, y: 3.31, w: 2.5185, h: 0.61 },
      box: { x: 10.3334, y: 3.4581, w: 2.1481, h: 0.3137 },
      text: "Faster delivery",
      o: bold,
    },
    rowH: 1.12,
    mid: 3.62,
    forkX: 5.85,
    joinX: 9.85,
    labelO,
    branches: [],
  };
  const bodyCoreShapes = [
    {
      prst: "round2DiagRect",
      x: 0.6667,
      y: 3.31,
      w: 2.2222,
      h: 0.61,
      fill: "EFF5F6",
      line: "A3C7CE",
      lineW: 1,
      texts: [],
    },
    {
      prst: "rect",
      x: 0.8519,
      y: 3.4581,
      w: 1.8703,
      h: 0.3137,
      fill: "19283A",
      line: undefined,
      lineW: undefined,
      texts: ["Need CI"],
    },
    {
      prst: "rect",
      x: 2.8889,
      y: 3.6015,
      w: 0.5926,
      h: 0.037,
      fill: "1A7285",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "triangle",
      x: 3.3259,
      y: 3.5533,
      w: 0.1778,
      h: 0.1333,
      fill: "1A7285",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "round2DiagRect",
      x: 3.4815,
      y: 3.28,
      w: 2.074,
      h: 0.68,
      fill: "FFFFFF",
      line: "1A7285",
      lineW: 1,
      texts: [],
    },
    {
      prst: "rect",
      x: 3.6582,
      y: 3.4652,
      w: 1.7206,
      h: 0.3096,
      fill: "19283A",
      line: undefined,
      lineW: undefined,
      texts: ["Shared?"],
    },
    {
      prst: "rect",
      x: 5.5555,
      y: 3.6015,
      w: 0.2963,
      h: 0.037,
      fill: "1A7285",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "rect",
      x: 9.85,
      y: 3.6015,
      w: 0.2982,
      h: 0.037,
      fill: "1A7285",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "triangle",
      x: 9.9926,
      y: 3.5533,
      w: 0.1778,
      h: 0.1333,
      fill: "1A7285",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "round2DiagRect",
      x: 10.1482,
      y: 3.31,
      w: 2.5185,
      h: 0.61,
      fill: "E7EAED",
      line: undefined,
      lineW: undefined,
      texts: [],
    },
    {
      prst: "rect",
      x: 10.3334,
      y: 3.4581,
      w: 2.1696,
      h: 0.3137,
      fill: "19283A",
      line: undefined,
      lineW: undefined,
      texts: ["Faster delivery"],
    },
  ];

  it.each<{ label: string; layout: DecisionLayout; expected: typeof bodyCoreShapes }>([
    {
      label: "with a caption",
      layout: {
        ...baseBodyLayout,
        caption: {
          text: "Revisit each quarter",
          area: { x: 0.6667, y: 5.2, w: 12, h: 0.35 },
          o: { size: 18, color: "545861", line: 1.4, align: "center" },
        },
      },
      expected: [
        ...bodyCoreShapes,
        {
          prst: "rect",
          x: 0.6067,
          y: 5.2,
          w: 12.12,
          h: 0.35,
          fill: "545861",
          line: undefined,
          lineW: undefined,
          texts: ["Revisit each quarter"],
        },
      ],
    },
    {
      label: "without a caption",
      layout: baseBodyLayout,
      expected: bodyCoreShapes,
    },
  ])(
    "drawDecisionBody draws need, question, outcome nodes and connector bars/heads $label",
    async ({ layout, expected }) => {
      const shapes = await drawOnSheet((sheet) => {
        drawDecisionBody(sheet, layout);
      });
      expect(
        shapes.map(({ prst, x, y, w, h, fill, line, lineW, texts }) => ({
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
      ).toEqual(expected);
    },
  );
});
