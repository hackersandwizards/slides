import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  drawConnector,
  drawLoop,
  drawStep,
  drawSteps,
  stepBodyItems,
  stepBoxWidth,
  stepMarks,
  stepsLayout,
  stepsTypography,
  stepTone,
  type FlowStep,
  type StepTone,
} from "../scripts/pptx/flow-steps";
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

describe("stepMarks", () => {
  it.each<{
    label: string;
    steps: FlowStep[];
    expected: { inTile: boolean; marks: (string | undefined)[] };
  }>([
    {
      label: "plain steps skipping numbered: false",
      steps: [{ title: "A" }, { title: "B", numbered: false }, { title: "C" }],
      expected: { inTile: true, marks: ["1", undefined, "2"] },
    },
    {
      label: "short labels fitting inside tiles",
      steps: [
        { title: "A", label: "01" },
        { title: "B", label: "GO" },
      ],
      expected: { inTile: true, marks: ["01", "GO"] },
    },
    {
      label: "long labels containing digits suppress numbering",
      steps: [
        { title: "A", label: "Phase 1" },
        { title: "B", label: "Phase 2" },
      ],
      expected: { inTile: false, marks: [undefined, undefined] },
    },
    {
      label: "long labels without digits keep sequential numbers",
      steps: [
        { title: "A", label: "Alpha" },
        { title: "B", label: "Bravo" },
      ],
      expected: { inTile: false, marks: ["1", "2"] },
    },
  ])("computes tile marks for $label", ({ steps, expected }) => {
    expect(stepMarks(steps)).toEqual(expected);
  });
});

describe("stepTone", () => {
  const day = palette(false);

  it.each<{ label: string; step: FlowStep; active: boolean; expected: StepTone }>([
    {
      label: "an inactive plain step",
      step: { title: "A" },
      active: false,
      expected: { tone: "19283A", accent: "1A7285", titleColor: "19283A", textColor: "19283A" },
    },
    {
      label: "an active highlighted step",
      step: { title: "A" },
      active: true,
      expected: { tone: "19283A", accent: "1A7285", titleColor: "1A7285", textColor: "19283A" },
    },
    {
      label: "a green-toned step",
      step: { title: "A", tone: "green" },
      active: false,
      expected: { tone: "15803D", accent: "1A7285", titleColor: "15803D", textColor: "19283A" },
    },
    {
      label: "a dimmed step overriding tone",
      step: { title: "A", dim: true, tone: "green" },
      active: false,
      expected: { tone: "545861", accent: "545861", titleColor: "545861", textColor: "545861" },
    },
  ])("resolves colours for $label", ({ step, active, expected }) => {
    expect(stepTone(step, active, day)).toEqual(expected);
  });
});

describe("stepBoxWidth", () => {
  const day = palette(false);
  const item = (text: string) => ({
    text: { runs: [{ text }] },
    o: { size: 18, color: day.ink },
    gap: 0,
  });

  it.each<{ label: string; text: string; colW: number; expected: number }>([
    { label: "a short word staying at inner width", text: "Hi", colW: 4, expected: 2 },
    {
      label: "a wide path expanding past inner width",
      text: "scripts/pptx/flow-steps.ts",
      colW: 4,
      expected: 2.1434130859375,
    },
    {
      label: "a wide path clamped to column width",
      text: "scripts/pptx/flow-steps.ts",
      colW: 2.05,
      expected: 2.05,
    },
  ])("computes box width for $label", ({ text, colW, expected }) => {
    expect(stepBoxWidth(item(text), 2, colW)).toBe(expected);
  });
});

describe("stepBodyItems", () => {
  it("builds muted subtitle, body text and badge stack items for a dimmed step", () => {
    const day = palette(false);
    const items = stepBodyItems(
      { title: "Step", subtitle: "Sub", text: "Body", badge: "Tag", dim: true },
      day,
      1,
    );
    expect(
      items.map((item) => ({
        text: item.text.runs[0].text,
        color: item.text.runs[0].options?.color,
        bold: item.text.bold,
        gap: item.gap,
      })),
    ).toEqual([
      { text: "Sub", color: "545861", bold: true, gap: 0.07407291666666665 },
      { text: "Body", color: "545861", bold: undefined, gap: 0.11110937499999998 },
      { text: "Tag", color: "545861", bold: true, gap: 0.11110937499999998 },
    ]);
  });
});

describe("stepsTypography", () => {
  const day = palette(false);
  const many = (n: number): FlowStep[] => Array.from({ length: n }, (_, i) => ({ title: `S${i}` }));

  it.each<{
    label: string;
    input: { steps: FlowStep[]; dense?: boolean };
    expected: { titleSize: number; markSize: number };
  }>([
    {
      label: "a normal 3-step row",
      input: { steps: many(3) },
      expected: { titleSize: 24, markSize: 24 },
    },
    {
      label: "a narrow 6-step row",
      input: { steps: many(6) },
      expected: { titleSize: 18, markSize: 24 },
    },
    {
      label: "a dense 3-step row",
      input: { steps: many(3), dense: true },
      expected: { titleSize: 18, markSize: 17.33 },
    },
  ])("picks title and tile mark sizes for $label", ({ input, expected }) => {
    const { titleO, markBase } = stepsTypography(day, input, 1);
    expect({ titleSize: titleO.size, markSize: markBase.size }).toEqual(expected);
  });
});

describe("stepsLayout and drawing", () => {
  const look = new Look(palette(false), "en", false);
  const loopedInput = {
    steps: [
      { title: "Plan", label: "Phase 1", subtitle: "Scope", text: "List goals", badge: "Day 1" },
      { title: "Build", label: "Phase 2" },
    ],
    highlight: 1,
    loop: "Iterate",
  };
  const layout = stepsLayout(look, loopedInput, { w: 10, k: 1 });

  it("measures a highlighted looped flow with above-tile labels", () => {
    expect({
      colW: layout.colW,
      tile: layout.tile,
      loopH: layout.loopH,
      h: layout.h,
      steps: layout.steps.map(({ cx, tileFill, mark, boxes }) => ({
        cx,
        tileFill,
        mark,
        boxCount: boxes.length,
      })),
    }).toEqual({
      colW: 5,
      tile: 0.8888749999999999,
      loopH: 0.9629479166666666,
      h: 4.242322916666666,
      steps: [
        { cx: 2.5, tileFill: "F7F9FA", mark: undefined, boxCount: 5 },
        { cx: 7.5, tileFill: "1A7285", mark: undefined, boxCount: 2 },
      ],
    });
  });

  it("draws one step's texts and tile via drawStep", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawStep(sheet, layout.steps[1], { x: 1, y: 1 });
    });
    expect({
      texts: shapes.filter((sh) => sh.texts.length > 0).map((sh) => sh.texts.join("")),
      tileFills: shapes.filter((sh) => sh.prst === "roundRect").map((sh) => sh.fill),
    }).toEqual({
      texts: ["Phase 2", "Build"],
      tileFills: ["1A7285"],
    });
  });

  it("draws a step connector line and 90-degree arrowhead via drawConnector", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawConnector(sheet, layout, { x: 3.5, y: 2 });
    });
    expect(
      shapes.map((sh) => ({ prst: sh.prst, hasRot90: sh.xml.includes('rot="5400000"') })),
    ).toEqual([
      { prst: "line", hasRot90: false },
      { prst: "triangle", hasRot90: true },
    ]);
  });

  it("draws the return loop, 180-degree arrowhead and label via drawLoop", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawLoop(sheet, layout, { x: 1, y: 1 });
    });
    expect({
      lines: shapes.filter((sh) => sh.prst === "line").length,
      triangles: shapes
        .filter((sh) => sh.prst === "triangle")
        .map((sh) => sh.xml.includes('rot="10800000"')),
      labels: shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      lines: 3,
      triangles: [true],
      labels: ["Iterate"],
    });
  });

  it("draws all steps, connectors and loop together via drawSteps", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawSteps(sheet, layout, { x: 1, y: 1 });
    });
    expect({
      tiles: shapes.filter((sh) => sh.prst === "roundRect").map((sh) => sh.fill),
      arrows: shapes.filter((sh) => sh.prst === "triangle").length,
      hasLoopLabel: shapes.some((sh) => sh.texts.includes("Iterate")),
    }).toEqual({
      tiles: ["F7F9FA", "1A7285"],
      arrows: 2,
      hasLoopLabel: true,
    });
  });
});
