import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  drawFlowFooter,
  drawFlowFrame,
  drawFlowNotes,
  flowFrameLayout,
  flowNotes,
  type FlowNotesLayout,
  type FramedFlow,
} from "../scripts/pptx/blocks/flow";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
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
  const out = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = out.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  return shapesOf(await file.async("string"));
}

function shapeGeometry(sh: ReturnType<typeof shapesOf>[number]) {
  return {
    prst: sh.prst,
    x: r4(sh.x),
    y: r4(sh.y),
    w: r4(sh.w),
    h: r4(sh.h),
    fill: sh.fill,
    dash: sh.dash,
    texts: sh.texts,
  };
}

describe("flowNotes", () => {
  const look = new Look(palette(false), "en", false);
  const noteO = { size: 16, color: "545861", line: 1.45 };
  const afterPt = 3.9999374999999993;

  it.each<{ label: string; notes: string[]; w: number; expected: FlowNotesLayout }>([
    { label: "no notes", notes: [], w: 12, expected: { paras: [], o: noteO, w: 0, h: 0 } },
    {
      label: "a short note fitted to its width",
      notes: ["Fast"],
      w: 12,
      expected: {
        paras: [{ runs: [{ text: "Fast", options: {} }], bullet: true, after: afterPt }],
        o: noteO,
        w: 0.7226453993055556,
        h: 0.3222222222222222,
      },
    },
    {
      label: "a long note capped at one third of the frame width",
      notes: ["A very long note that definitely exceeds one third of the frame width by a lot"],
      w: 9,
      expected: {
        paras: [
          {
            runs: [
              {
                text: "A very long note that definitely exceeds one third of the frame width by a lot",
                options: {},
              },
            ],
            bullet: true,
            after: afterPt,
          },
        ],
        o: noteO,
        w: 3,
        h: 1.2888888888888888,
      },
    },
  ])("measures $label", ({ notes, w, expected }) => {
    expect(flowNotes(look, notes, { w, k: 1 })).toEqual(expected);
  });
});

describe("flowFrameLayout and drawing", () => {
  const look = new Look(palette(false), "en", false);
  const steps = [{ title: "Plan" }, { title: "Ship" }];
  const fullBlock: FramedFlow = {
    type: "flow",
    steps,
    frame: { label: "Delivery", notes: ["Daily review"], footer: "Updated weekly" },
  };
  const fullLayout = flowFrameLayout(look, fullBlock, { w: 12, k: 1 });

  it.each<{
    label: string;
    block: FramedFlow;
    expected: {
      k: number;
      w: number;
      pad: number;
      tint: string;
      surface: { fill: string; line?: string };
      label: string | undefined;
      labelH: number;
      stepsW: number;
      rowH: number;
      footer: string | undefined;
      footH: number;
      h: number;
    };
  }>([
    {
      label: "an unlabelled frame without notes or footer",
      block: { type: "flow", steps, frame: {} },
      expected: {
        k: 1,
        w: 12,
        pad: 0.22221874999999996,
        tint: "C0D7DD",
        surface: { fill: "FFFFFF", line: "C0D7DD" },
        label: undefined,
        labelH: 0,
        stepsW: 11.5555625,
        rowH: 1.5647968749999999,
        footer: undefined,
        footH: 0,
        h: 2.0092343749999997,
      },
    },
    {
      label: "a labelled frame with side notes and footer",
      block: fullBlock,
      expected: {
        k: 1,
        w: 12,
        pad: 0.22221874999999996,
        tint: "C0D7DD",
        surface: { fill: "E8F0F2", line: "1A7285" },
        label: "Delivery",
        labelH: 0.25919444444444445,
        stepsW: 9.542538845486112,
        rowH: 1.5647968749999999,
        footer: "Updated weekly",
        footH: 0.3222222222222222,
        h: 2.998052083333333,
      },
    },
  ])("lays out $label", ({ block, expected }) => {
    const layout = flowFrameLayout(look, block, { w: 12, k: 1 });
    expect({
      k: layout.k,
      w: layout.w,
      pad: layout.pad,
      tint: layout.tint,
      surface: layout.surface,
      label: layout.label,
      labelH: layout.labelH,
      stepsW: layout.stepsW,
      rowH: layout.rowH,
      footer: layout.footer,
      footH: layout.footH,
      h: layout.h,
    }).toEqual(expected);
  });

  it("draws the side divider rule and notes column via drawFlowNotes", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowNotes(sheet, fullLayout, { x: 9, y: 2 });
    });
    expect(shapes.map(shapeGeometry)).toEqual([
      {
        prst: "line",
        x: 9.2222,
        y: 2.4861,
        w: 0,
        h: 0.5926,
        fill: "C0D7DD",
        dash: "solid",
        texts: [],
      },
      {
        prst: "rect",
        x: 9.4444,
        y: 2.6213,
        w: 1.5843,
        h: 0.3222,
        fill: "545861",
        dash: undefined,
        texts: ["Daily review"],
      },
    ]);
  });

  it("draws the horizontal divider rule and footer text via drawFlowFooter", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowFooter(sheet, fullLayout, { x: 1, y: 4 });
    });
    expect(shapes.map(shapeGeometry)).toEqual([
      {
        prst: "line",
        x: 1,
        y: 4.1481,
        w: 11.5556,
        h: 0,
        fill: "C0D7DD",
        dash: "solid",
        texts: [],
      },
      {
        prst: "rect",
        x: 1,
        y: 4.2593,
        w: 11.6711,
        h: 0.3222,
        fill: "545861",
        dash: undefined,
        texts: ["Updated weekly"],
      },
    ]);
  });

  it("draws the dashed frame, label header and hands offsets to steps, notes and footer via drawFlowFrame", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowFrame(sheet, fullLayout, { x: 0.5, y: 1 });
    });
    expect({
      count: shapes.length,
      header: shapes.slice(0, 3).map(shapeGeometry),
      delegatedOffsets: [shapes[4], shapes[11], shapes[13]].map((sh) => ({
        prst: sh.prst,
        x: r4(sh.x),
        y: r4(sh.y),
      })),
    }).toEqual({
      count: 15,
      header: [
        {
          prst: "round2DiagRect",
          x: 0.5,
          y: 1,
          w: 12,
          h: 2.9981,
          fill: "E8F0F2",
          dash: "dash",
          texts: [],
        },
        {
          prst: "rect",
          x: 0.7222,
          y: 1.3171,
          w: 0.0694,
          h: 0.0694,
          fill: "1A7285",
          dash: undefined,
          texts: [],
        },
        {
          prst: "rect",
          x: 0.8657,
          y: 1.2222,
          w: 11.6711,
          h: 0.2592,
          fill: "1A7285",
          dash: undefined,
          texts: ["Delivery"],
        },
      ],
      delegatedOffsets: [
        { prst: "roundRect", x: 2.6634, y: 1.6296 },
        { prst: "line", x: 10.487, y: 2.1157 },
        { prst: "line", x: 0.7222, y: 3.3425 },
      ],
    });
  });
});
