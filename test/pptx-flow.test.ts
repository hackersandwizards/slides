import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  drawFlowFooter,
  drawFlowFrame,
  drawFlowNotes,
  flowFrameLayout,
  flowNotes,
  type FramedFlow,
} from "../scripts/pptx/blocks/flow";
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

describe("flowNotes", () => {
  const look = new Look(palette(false), "en", false);

  it.each<{ label: string; notes: string[]; w: number; expected: { w: number; h: number } }>([
    { label: "no notes", notes: [], w: 12, expected: { w: 0, h: 0 } },
    {
      label: "a short note fitted to its width",
      notes: ["Fast"],
      w: 12,
      expected: { w: 0.7226453993055556, h: 0.3222222222222222 },
    },
    {
      label: "a long note capped at one third of the frame width",
      notes: ["A very long note that definitely exceeds one third of the frame width by a lot"],
      w: 9,
      expected: { w: 3, h: 1.2888888888888888 },
    },
  ])("measures $label", ({ notes, w, expected }) => {
    const out = flowNotes(look, notes, { w, k: 1 });
    expect({ w: out.w, h: out.h }).toEqual(expected);
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
      surface: { fill: string; line?: string };
      labelH: number;
      stepsW: number;
      rowH: number;
      footH: number;
      h: number;
    };
  }>([
    {
      label: "an unlabelled frame without notes or footer",
      block: { type: "flow", steps, frame: {} },
      expected: {
        surface: { fill: "FFFFFF", line: "C0D7DD" },
        labelH: 0,
        stepsW: 11.5555625,
        rowH: 1.5647968749999999,
        footH: 0,
        h: 2.0092343749999997,
      },
    },
    {
      label: "a labelled frame with side notes and footer",
      block: fullBlock,
      expected: {
        surface: { fill: "E8F0F2", line: "1A7285" },
        labelH: 0.25919444444444445,
        stepsW: 9.542538845486112,
        rowH: 1.5647968749999999,
        footH: 0.3222222222222222,
        h: 2.998052083333333,
      },
    },
  ])("lays out $label", ({ block, expected }) => {
    const layout = flowFrameLayout(look, block, { w: 12, k: 1 });
    expect({
      surface: layout.surface,
      labelH: layout.labelH,
      stepsW: layout.stepsW,
      rowH: layout.rowH,
      footH: layout.footH,
      h: layout.h,
    }).toEqual(expected);
  });

  it("draws the side divider rule and notes column via drawFlowNotes", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowNotes(sheet, fullLayout, { x: 9, y: 2 });
    });
    expect({
      prsts: shapes.map((sh) => sh.prst),
      texts: shapes.flatMap((sh) => sh.texts),
      noteRightOfRule: shapes[1].x > shapes[0].x,
    }).toEqual({
      prsts: ["line", "rect"],
      texts: ["Daily review"],
      noteRightOfRule: true,
    });
  });

  it("draws the horizontal divider rule and footer text via drawFlowFooter", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowFooter(sheet, fullLayout, { x: 1, y: 4 });
    });
    expect({
      prsts: shapes.map((sh) => sh.prst),
      texts: shapes.flatMap((sh) => sh.texts),
      footerBelowRule: shapes[1].y > shapes[0].y,
    }).toEqual({
      prsts: ["line", "rect"],
      texts: ["Updated weekly"],
      footerBelowRule: true,
    });
  });

  it("draws the dashed frame, teal label marker, notes and footer via drawFlowFrame", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawFlowFrame(sheet, fullLayout, { x: 0.5, y: 1 });
    });
    const frame = shapes.find((sh) => sh.prst === "round2DiagRect");
    assert(frame, "frame");
    expect({
      frameFill: frame.fill,
      frameDash: frame.dash,
      hasMarker: shapes.map((sh) => sh.fill).includes("1A7285"),
      texts: shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      frameFill: "E8F0F2",
      frameDash: "dash",
      hasMarker: true,
      texts: ["Delivery", "Plan", "1", "Ship", "2", "Daily review", "Updated weekly"],
    });
  });
});
