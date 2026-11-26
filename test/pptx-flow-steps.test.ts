import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  drawConnector,
  drawLoop,
  drawStep,
  drawSteps,
  measureStepBoxes,
  stepBodyItems,
  stepBoxWidth,
  stepLayout,
  stepMarks,
  stepsLayout,
  stepsRow,
  stepsTypography,
  stepTone,
  type FlowStep,
  type FlowStepLayout,
  type StepBox,
  type StepsRow,
  type StepTone,
} from "../scripts/pptx/flow-steps";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import type { StackItem } from "../scripts/pptx/stack";
import type { BoxOpts } from "../scripts/pptx/text";
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
    rot: [...sh.xml.matchAll(/rot="(\d+)"/g)].map((m) => Number(m[1])),
    texts: sh.texts,
  };
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
  const day = palette(false);
  const textO: BoxOpts = { size: 18, color: "19283A", line: 1.375, align: "center" };

  it.each<{ label: string; step: FlowStep; expected: StackItem[] }>([
    {
      label: "a dimmed step with subtitle, body text and badge",
      step: { title: "Step", subtitle: "Sub", text: "Body", badge: "Tag", dim: true },
      expected: [
        {
          text: {
            runs: [{ text: "Sub", options: { color: "545861" } }],
            bold: true,
            balance: true,
          },
          o: textO,
          gap: 0.07407291666666665,
        },
        {
          text: { runs: [{ text: "Body", options: { color: "545861" } }] },
          o: textO,
          gap: 0.11110937499999998,
        },
        {
          text: { runs: [{ text: "Tag", options: { color: "545861" } }], bold: true },
          o: textO,
          gap: 0.11110937499999998,
        },
      ],
    },
    {
      label: "a plain step with teal accent and ink body text",
      step: { title: "Step", subtitle: "Sub", text: "Body", badge: "Tag" },
      expected: [
        {
          text: {
            runs: [{ text: "Sub", options: { color: "1A7285" } }],
            bold: true,
            balance: true,
          },
          o: textO,
          gap: 0.07407291666666665,
        },
        {
          text: { runs: [{ text: "Body", options: { color: "19283A" } }] },
          o: textO,
          gap: 0.11110937499999998,
        },
        {
          text: { runs: [{ text: "Tag", options: { color: "1A7285" } }], bold: true },
          o: textO,
          gap: 0.11110937499999998,
        },
      ],
    },
    {
      label: "a title-only step with no body items",
      step: { title: "Only" },
      expected: [],
    },
  ])("builds stack items for $label", ({ step, expected }) => {
    expect(stepBodyItems(step, day, 1)).toEqual(expected);
  });
});

describe("stepsTypography", () => {
  const day = palette(false);
  const many = (n: number): FlowStep[] => Array.from({ length: n }, (_, i) => ({ title: `S${i}` }));
  const labelO: BoxOpts = {
    size: 18,
    color: "19283A",
    mono: true,
    tracking: 0.06,
    line: 1.4,
    align: "center",
  };
  const titleBase: Omit<BoxOpts, "size"> = {
    mono: true,
    bold: true,
    color: "19283A",
    line: 1.25,
    tracking: -0.015,
    align: "center",
    balance: true,
  };
  const markOpts: Omit<BoxOpts, "size"> = {
    mono: true,
    bold: true,
    color: "19283A",
    align: "center",
    valign: "middle",
    line: 1,
    floor: 0.5,
  };

  it.each<{
    label: string;
    input: { steps: FlowStep[]; dense?: boolean };
    expected: { titleO: BoxOpts; labelO: BoxOpts; markBase: BoxOpts };
  }>([
    {
      label: "a normal 3-step row",
      input: { steps: many(3) },
      expected: {
        titleO: { size: 24, ...titleBase },
        labelO,
        markBase: { size: 24, ...markOpts },
      },
    },
    {
      label: "a narrow 6-step row",
      input: { steps: many(6) },
      expected: {
        titleO: { size: 18, ...titleBase },
        labelO,
        markBase: { size: 24, ...markOpts },
      },
    },
    {
      label: "a dense 3-step row",
      input: { steps: many(3), dense: true },
      expected: {
        titleO: { size: 18, ...titleBase },
        labelO,
        markBase: { size: 17.33, ...markOpts },
      },
    },
  ])("builds typography styles for $label", ({ input, expected }) => {
    expect(stepsTypography(day, input, 1)).toEqual(expected);
  });
});

describe("stepsRow", () => {
  const day = palette(false);

  it.each<{
    label: string;
    input: { steps: FlowStep[]; loop?: string; dense?: boolean };
    measure: { w: number; k: number };
    expected: { colW: number; inner: number; tile: number; loopH: number };
  }>([
    {
      label: "a dense 6-step row with an unlabelled loop",
      input: {
        steps: Array.from({ length: 6 }, (_, i) => ({ title: `S${i + 1}` })),
        loop: "",
        dense: true,
      },
      measure: { w: 10, k: 1 },
      expected: {
        colW: 1.6666666666666667,
        inner: 1.5185208333333335,
        tile: 0.3703645833333333,
        loopH: 0.66665625,
      },
    },
    {
      label: "a scaled 3-step row without a loop",
      input: { steps: [{ title: "A" }, { title: "B" }, { title: "C" }] },
      measure: { w: 12, k: 0.8 },
      expected: {
        colW: 4,
        inner: 3.703708333333333,
        tile: 0.7111,
        loopH: 0,
      },
    },
  ])(
    "computes column, inner, tile, and loopH metrics for $label",
    ({ input, measure, expected }) => {
      const { colW, inner, tile, loopH } = stepsRow(day, input, measure);
      expect({ colW, inner, tile, loopH }).toEqual(expected);
    },
  );
});

describe("stepLayout", () => {
  const look = new Look(palette(false), "en", false);
  const titleO: BoxOpts = {
    size: 24,
    mono: true,
    bold: true,
    color: "19283A",
    line: 1.25,
    tracking: -0.015,
    align: "center",
    balance: true,
  };
  const labelO: BoxOpts = {
    size: 18,
    color: "19283A",
    mono: true,
    tracking: 0.06,
    line: 1.4,
    align: "center",
  };
  const markBase: BoxOpts = {
    size: 24,
    mono: true,
    bold: true,
    color: "19283A",
    align: "center",
    valign: "middle",
    line: 1,
    floor: 0.5,
  };

  it.each<{ label: string; row: StepsRow; index: number; expected: FlowStepLayout }>([
    {
      label: "a highlighted step with an above-tile label",
      row: {
        input: { steps: [{ title: "Ship", label: "Phase 1" }], highlight: 0 },
        k: 1,
        colW: 4,
        inner: 3.6,
        tile: 0.8,
        loopH: 0.5,
        marks: { inTile: false, marks: [undefined] },
        type: { titleO, labelO, markBase },
      },
      index: 0,
      expected: {
        cx: 2,
        tileY: 0.5,
        tile: 0.8,
        tileFill: "1A7285",
        tileBorder: undefined,
        mark: undefined,
        markO: { ...markBase, color: "FFFFFF" },
        boxes: [
          {
            text: { runs: [{ text: "Phase 1", options: { color: "1A7285", lang: "x-caps" } }] },
            o: labelO,
            y: 1.4851822916666666,
            w: 3.6,
            h: 0.35,
          },
          {
            text: { runs: [{ text: "Ship", options: { color: "1A7285" } }] },
            o: titleO,
            y: 1.9462916666666665,
            w: 3.6,
            h: 0.4166666666666667,
          },
        ],
      },
    },
    {
      label: "a plain dense step with an in-tile mark",
      row: {
        input: { steps: [{ title: "One" }, { title: "Two" }], dense: true },
        k: 1,
        colW: 4,
        inner: 3.6,
        tile: 0.4,
        loopH: 0,
        marks: { inTile: true, marks: ["1", "2"] },
        type: { titleO, labelO, markBase },
      },
      index: 1,
      expected: {
        cx: 6,
        tileY: 0,
        tile: 0.4,
        tileFill: "F7F9FA",
        tileBorder: { color: "545861", width: 2 },
        mark: "2",
        markO: { ...markBase, color: "19283A" },
        boxes: [
          {
            text: { runs: [{ text: "Two", options: { color: "19283A" } }] },
            o: titleO,
            y: 0.4740729166666667,
            w: 3.6,
            h: 0.4166666666666667,
          },
        ],
      },
    },
    {
      label: "a plain non-dense step without a label",
      row: {
        input: { steps: [{ title: "Plain" }] },
        k: 1,
        colW: 4,
        inner: 3.6,
        tile: 0.8,
        loopH: 0,
        marks: { inTile: false, marks: [undefined] },
        type: { titleO, labelO, markBase },
      },
      index: 0,
      expected: {
        cx: 2,
        tileY: 0,
        tile: 0.8,
        tileFill: "F7F9FA",
        tileBorder: { color: "545861", width: 2 },
        mark: undefined,
        markO: { ...markBase, color: "19283A" },
        boxes: [
          {
            text: { runs: [{ text: "Plain", options: { color: "19283A" } }] },
            o: titleO,
            y: 1.0592552083333333,
            w: 3.6,
            h: 0.4166666666666667,
          },
        ],
      },
    },
  ])("places $label", ({ row, index, expected }) => {
    expect(stepLayout(look, row, index)).toEqual(expected);
  });
});

describe("measureStepBoxes", () => {
  it("stacks measured boxes below loopH + tile and expands wide words up to colW", () => {
    const look = new Look(palette(false), "en", false);
    const o: BoxOpts = { size: 18, color: "19283A", line: 1.375, align: "center" };
    const items: StackItem[] = [
      { text: { runs: [{ text: "Short" }] }, o, gap: 0.1 },
      { text: { runs: [{ text: "scripts/pptx/flow-steps.ts" }] }, o, gap: 0.2 },
    ];
    expect(measureStepBoxes(look, items, { colW: 4, inner: 2, loopH: 0.5, tile: 0.8 })).toEqual<
      StepBox[]
    >([
      { text: { runs: [{ text: "Short" }] }, o, y: 1.4000000000000001, w: 2, h: 0.34375 },
      {
        text: { runs: [{ text: "scripts/pptx/flow-steps.ts" }] },
        o,
        y: 1.94375,
        w: 2.1434130859375,
        h: 0.6875,
      },
    ]);
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
  const plainLayout = stepsLayout(
    look,
    { steps: [{ title: "One" }, { title: "Two" }] },
    { w: 10, k: 1 },
  );

  it("measures a highlighted looped flow with above-tile labels", () => {
    expect({
      k: layout.k,
      colW: layout.colW,
      tile: layout.tile,
      loopH: layout.loopH,
      loop: layout.loop,
      h: layout.h,
      steps: layout.steps.map(({ cx, tileY, tileFill, tileBorder, mark, markO, boxes }) => ({
        cx,
        tileY,
        tileFill,
        tileBorder,
        mark,
        markColor: markO.color,
        boxes: boxes.map(({ y, w, h }) => ({ y: r4(y), w: r4(w), h: r4(h) })),
      })),
    }).toEqual({
      k: 1,
      colW: 5,
      tile: 0.8888749999999999,
      loopH: 0.9629479166666666,
      loop: "Iterate",
      h: 4.242322916666666,
      steps: [
        {
          cx: 2.5,
          tileY: 0.9629479166666666,
          tileFill: "F7F9FA",
          tileBorder: { color: "545861", width: 2 },
          mark: undefined,
          markColor: "19283A",
          boxes: [
            { y: 2.037, w: 4.6296, h: 0.35 },
            { y: 2.4981, w: 4.6296, h: 0.4167 },
            { y: 2.9889, w: 4.6296, h: 0.3438 },
            { y: 3.4437, w: 4.6296, h: 0.3438 },
            { y: 3.8986, w: 4.6296, h: 0.3438 },
          ],
        },
        {
          cx: 7.5,
          tileY: 0.9629479166666666,
          tileFill: "1A7285",
          tileBorder: undefined,
          mark: undefined,
          markColor: "FFFFFF",
          boxes: [
            { y: 2.037, w: 4.6296, h: 0.35 },
            { y: 2.4981, w: 4.6296, h: 0.4167 },
          ],
        },
      ],
    });
  });

  it.each<{
    label: string;
    step: (typeof layout.steps)[number];
    expected: ReturnType<typeof shapeGeometry>[];
  }>([
    {
      label: "a numbered step with tile border and mark",
      step: plainLayout.steps[0],
      expected: [
        {
          prst: "rect",
          x: 1.162,
          y: 2.1481,
          w: 4.6759,
          h: 0.4167,
          fill: "19283A",
          dash: undefined,
          rot: [],
          texts: ["One"],
        },
        {
          prst: "roundRect",
          x: 3.0556,
          y: 1,
          w: 0.8889,
          h: 0.8889,
          fill: "F7F9FA",
          dash: "solid",
          rot: [],
          texts: [],
        },
        {
          prst: "rect",
          x: 3.0511,
          y: 1,
          w: 0.8978,
          h: 0.8889,
          fill: "19283A",
          dash: undefined,
          rot: [],
          texts: ["1"],
        },
      ],
    },
    {
      label: "a highlighted step with above-tile label and teal tile",
      step: layout.steps[1],
      expected: [
        {
          prst: "rect",
          x: 6.162,
          y: 3.037,
          w: 4.6759,
          h: 0.35,
          fill: "1A7285",
          dash: undefined,
          rot: [],
          texts: ["Phase 2"],
        },
        {
          prst: "rect",
          x: 6.162,
          y: 3.4981,
          w: 4.6759,
          h: 0.4167,
          fill: "1A7285",
          dash: undefined,
          rot: [],
          texts: ["Build"],
        },
        {
          prst: "roundRect",
          x: 8.0556,
          y: 1.9629,
          w: 0.8889,
          h: 0.8889,
          fill: "1A7285",
          dash: undefined,
          rot: [],
          texts: [],
        },
      ],
    },
  ])("draws $label via drawStep", async ({ step, expected }) => {
    const shapes = await drawOnSheet((sheet) => {
      drawStep(sheet, step, { x: 1, y: 1 });
    });
    expect(shapes.map(shapeGeometry)).toEqual(expected);
  });

  it("draws a step connector line and 90-degree arrowhead via drawConnector", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawConnector(sheet, layout, { x: 3.5, y: 2 });
    });
    expect(shapes.map(shapeGeometry)).toEqual([
      {
        prst: "line",
        x: 3.9444,
        y: 2,
        w: 3.7408,
        h: 0,
        fill: "545861",
        dash: "solid",
        rot: [],
        texts: [],
      },
      {
        prst: "triangle",
        x: 7.6667,
        y: 1.8889,
        w: 0.2593,
        h: 0.2222,
        fill: "545861",
        dash: undefined,
        rot: [5400000],
        texts: [],
      },
    ]);
  });

  it("draws the return loop, 180-degree arrowhead and label via drawLoop", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawLoop(sheet, layout, { x: 1, y: 1 });
    });
    expect(shapes.map(shapeGeometry)).toEqual([
      {
        prst: "line",
        x: 3.5,
        y: 1.2222,
        w: 5,
        h: 0,
        fill: "545861",
        dash: "solid",
        rot: [],
        texts: [],
      },
      {
        prst: "line",
        x: 8.5,
        y: 1.2222,
        w: 0,
        h: 0.6667,
        fill: "545861",
        dash: "solid",
        rot: [],
        texts: [],
      },
      {
        prst: "line",
        x: 3.5,
        y: 1.2222,
        w: 0,
        h: 0.5185,
        fill: "545861",
        dash: "solid",
        rot: [],
        texts: [],
      },
      {
        prst: "triangle",
        x: 3.3704,
        y: 1.6667,
        w: 0.2593,
        h: 0.2222,
        fill: "545861",
        dash: undefined,
        rot: [10800000],
        texts: [],
      },
      {
        prst: "rect",
        x: 5.3747,
        y: 1.0472,
        w: 1.2505,
        h: 0.35,
        fill: "F7F9FA",
        dash: undefined,
        rot: [],
        texts: ["Iterate"],
      },
    ]);
  });

  it("preserves non-throwing loop output when steps is empty", async () => {
    const empty = stepsLayout(look, { steps: [], loop: "" }, { w: 10, k: 1 });
    const shapes = await drawOnSheet((sheet) => {
      drawLoop(sheet, empty, { x: 1, y: 1 });
    });
    expect(
      shapes.map((sh) => ({
        prst: sh.prst,
        fill: sh.fill,
        rot: [...sh.xml.matchAll(/rot="(\d+)"/g)].map((m) => Number(m[1])),
      })),
    ).toEqual([
      { prst: "line", fill: "545861", rot: [] },
      { prst: "line", fill: "545861", rot: [] },
      { prst: "line", fill: "545861", rot: [] },
      { prst: "triangle", fill: "545861", rot: [10800000] },
    ]);
  });

  it("places step 0, connector, step 1 and loop in order at their offsets via drawSteps", async () => {
    const shapes = await drawOnSheet((sheet) => {
      drawSteps(sheet, layout, { x: 1, y: 1 });
    });
    expect(shapes.map((sh) => ({ prst: sh.prst, x: r4(sh.x), y: r4(sh.y) }))).toEqual([
      { prst: "rect", x: 1.162, y: 3.037 },
      { prst: "rect", x: 1.162, y: 3.4981 },
      { prst: "rect", x: 1.162, y: 3.9889 },
      { prst: "rect", x: 1.162, y: 4.4437 },
      { prst: "rect", x: 1.162, y: 4.8986 },
      { prst: "roundRect", x: 3.0556, y: 1.9629 },
      { prst: "line", x: 3.9444, y: 2.4074 },
      { prst: "triangle", x: 7.6667, y: 2.2963 },
      { prst: "rect", x: 6.162, y: 3.037 },
      { prst: "rect", x: 6.162, y: 3.4981 },
      { prst: "roundRect", x: 8.0556, y: 1.9629 },
      { prst: "line", x: 3.5, y: 1.2222 },
      { prst: "line", x: 8.5, y: 1.2222 },
      { prst: "line", x: 3.5, y: 1.2222 },
      { prst: "triangle", x: 3.3704, y: 1.6667 },
      { prst: "rect", x: 5.3747, y: 1.0472 },
    ]);
  });
});
