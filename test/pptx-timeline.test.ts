import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import type { Block } from "../scripts/pptx/blocks/kind";
import {
  drawTimelineEvent,
  drawTimelineLabels,
  drawTimelineLine,
  eventParas,
  timelineLayout,
  type TimelineLayout,
  type TimelineLineLayout,
} from "../scripts/pptx/blocks/timeline";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import type { Para } from "../scripts/pptx/text";
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

describe("eventParas", () => {
  const day = palette(false);

  it.each<{
    label: string;
    event: Block<"timeline">["events"][number];
    hi: boolean;
    expected: Para[];
  }>([
    {
      label: "a highlighted event with text and negative figure",
      event: { title: "Launch", text: "Live", figure: "-5%" },
      hi: true,
      expected: [
        {
          runs: [{ text: "Launch", options: { color: "1A7285" } }],
          mono: true,
          bold: true,
          after: 4,
        },
        { runs: [{ text: "Live", options: { color: "545861" } }], rel: 0.9, after: 16 },
        {
          runs: [{ text: "−5%", options: { color: "1A7285" } }],
          mono: true,
          bold: true,
          rel: 2.2222222222222223,
        },
      ],
    },
    {
      label: "a plain event without text or figure",
      event: { title: "Plan" },
      hi: false,
      expected: [
        {
          runs: [{ text: "Plan", options: { color: "19283A" } }],
          mono: true,
          bold: true,
          after: 4,
        },
        { runs: [], rel: 0.9, after: 8 },
      ],
    },
  ])("builds paragraphs for $label", ({ event, hi, expected }) => {
    expect(eventParas(event, day, hi)).toEqual(expected);
  });
});

describe("timelineLayout", () => {
  const look = new Look(palette(false), "en", false);
  const area = { x: 1, y: 2, w: 9, h: 3 };

  it.each<{
    label: string;
    block: Block<"timeline">;
    expected: TimelineLayout;
  }>([
    {
      label:
        "a highlighted event, suppressed first segment, kept second segment, and mid-timeline now",
      block: {
        type: "timeline",
        events: [
          { title: "Start", segment: "ignored", when: "Q1" },
          { title: "Ship", text: "Cut release", segment: "2 weeks", when: "Q2", figure: "-5%" },
          { title: "Scale", when: "Q3" },
        ],
        highlight: 1,
        now: 1,
      },
      expected: {
        line: { y: 2.35, from: 2.5, to: 8.5, dashFrom: 5.5 },
        events: [
          {
            x: 1,
            w: 3,
            dot: { fill: "FFFFFF", line: "545861" },
            segment: undefined,
            when: "Q1",
            paras: [
              {
                runs: [{ text: "Start", options: { color: "19283A" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              { runs: [], rel: 0.9, after: 8 },
            ],
          },
          {
            x: 4,
            w: 3,
            dot: { fill: "1A7285", line: "1A7285" },
            segment: "2 weeks",
            when: "Q2",
            paras: [
              {
                runs: [{ text: "Ship", options: { color: "1A7285" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              {
                runs: [{ text: "Cut release", options: { color: "545861" } }],
                rel: 0.9,
                after: 16,
              },
              {
                runs: [{ text: "−5%", options: { color: "1A7285" } }],
                mono: true,
                bold: true,
                rel: 2.2222222222222223,
              },
            ],
          },
          {
            x: 7,
            w: 3,
            dot: { fill: "FFFFFF", line: "545861" },
            segment: undefined,
            when: "Q3",
            paras: [
              {
                runs: [{ text: "Scale", options: { color: "19283A" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              { runs: [], rel: 0.9, after: 8 },
            ],
          },
        ],
      },
    },
    {
      label: "a continued timeline with now before the first event",
      block: {
        type: "timeline",
        events: [{ title: "A" }, { title: "B" }],
        continues: "both",
        now: -1,
      },
      expected: {
        line: { y: 2.35, from: 0, to: 13.333, dashFrom: 0 },
        events: [
          {
            x: 1,
            w: 4.5,
            dot: { fill: "FFFFFF", line: "545861" },
            segment: undefined,
            when: undefined,
            paras: [
              {
                runs: [{ text: "A", options: { color: "19283A" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              { runs: [], rel: 0.9, after: 8 },
            ],
          },
          {
            x: 5.5,
            w: 4.5,
            dot: { fill: "FFFFFF", line: "545861" },
            segment: undefined,
            when: undefined,
            paras: [
              {
                runs: [{ text: "B", options: { color: "19283A" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              { runs: [], rel: 0.9, after: 8 },
            ],
          },
        ],
      },
    },
    {
      label: "a completed timeline without continuation or dashed run-out",
      block: { type: "timeline", events: [{ title: "Done" }] },
      expected: {
        line: { y: 2.35, from: 5.5, to: 5.5, dashFrom: undefined },
        events: [
          {
            x: 1,
            w: 9,
            dot: { fill: "FFFFFF", line: "545861" },
            segment: undefined,
            when: undefined,
            paras: [
              {
                runs: [{ text: "Done", options: { color: "19283A" } }],
                mono: true,
                bold: true,
                after: 4,
              },
              { runs: [], rel: 0.9, after: 8 },
            ],
          },
        ],
      },
    },
  ])("computes layout for $label", ({ block, expected }) => {
    expect(timelineLayout(look, block, area)).toEqual(expected);
  });
});

describe("drawTimelineLabels", () => {
  it("draws the label column rows and returns the remaining area to its right", async () => {
    let rest = { x: 0, y: 0, w: 0, h: 0 };
    const shapes = await drawOnSheet((sheet) => {
      rest = drawTimelineLabels(
        sheet,
        { when: "Year", title: "Phase", text: "Note" },
        { area: { x: 1, y: 2, w: 10, h: 3 }, k: 1 },
      );
    });
    expect({ rest, shapes: shapes.map(shapeGeometry) }).toEqual({
      rest: { x: 2.2, y: 2, w: 8.8, h: 3 },
      shapes: [
        {
          prst: "rect",
          x: 0.989,
          y: 2,
          w: 1.111,
          h: 0.25,
          fill: "545861",
          dash: undefined,
          texts: ["Year"],
        },
        {
          prst: "rect",
          x: 0.989,
          y: 2.55,
          w: 1.111,
          h: 0.25,
          fill: "545861",
          dash: undefined,
          texts: ["Phase"],
        },
        {
          prst: "rect",
          x: 0.989,
          y: 2.8,
          w: 1.111,
          h: 0.25,
          fill: "545861",
          dash: undefined,
          texts: ["Note"],
        },
      ],
    });
  });
});

describe("drawTimelineLine", () => {
  it.each<{
    label: string;
    line: TimelineLineLayout;
    expected: ReturnType<typeof shapeGeometry>[];
  }>([
    {
      label: "a base line with a mid-timeline dashed overlay",
      line: { y: 2.35, from: 2.5, to: 8.5, dashFrom: 5.5 },
      expected: [
        {
          prst: "line",
          x: 2.5,
          y: 2.35,
          w: 6,
          h: 0.001,
          fill: "D0D2D8",
          dash: "solid",
          texts: [],
        },
        {
          prst: "line",
          x: 5.5,
          y: 2.35,
          w: 3,
          h: 0.001,
          fill: "F7F9FA",
          dash: "dash",
          texts: [],
        },
        {
          prst: "line",
          x: 5.5,
          y: 2.35,
          w: 3,
          h: 0.001,
          fill: "545861",
          dash: "dash",
          texts: [],
        },
      ],
    },
    {
      label: "a completed solid line with no dashed overlay",
      line: { y: 2.35, from: 2.5, to: 8.5, dashFrom: undefined },
      expected: [
        {
          prst: "line",
          x: 2.5,
          y: 2.35,
          w: 6,
          h: 0.001,
          fill: "D0D2D8",
          dash: "solid",
          texts: [],
        },
      ],
    },
  ])("draws $label", async ({ line, expected }) => {
    const shapes = await drawOnSheet((sheet) => {
      drawTimelineLine(sheet, line);
    });
    expect(shapes.map(shapeGeometry)).toEqual(expected);
  });
});

describe("drawTimelineEvent", () => {
  it("draws the highlighted dot, segment pill, when heading and body text", async () => {
    const look = new Look(palette(false), "en", false);
    const area = { x: 1, y: 2, w: 9, h: 3 };
    const layout = timelineLayout(
      look,
      {
        type: "timeline",
        events: [
          { title: "Start", when: "Q1" },
          { title: "Ship", text: "Cut release", segment: "2 weeks", when: "Q2", figure: "-5%" },
          { title: "Scale", when: "Q3" },
        ],
        highlight: 1,
        now: 1,
      },
      area,
    );
    const shapes = await drawOnSheet((sheet) => {
      drawTimelineEvent(sheet, layout.events[1], { area, k: 1, centered: false });
    });
    expect(shapes.map(shapeGeometry)).toEqual([
      {
        prst: "ellipse",
        x: 5.41,
        y: 2.26,
        w: 0.18,
        h: 0.18,
        fill: "1A7285",
        dash: "solid",
        texts: [],
      },
      {
        prst: "rect",
        x: 3.5223,
        y: 2.24,
        w: 0.9554,
        h: 0.22,
        fill: "F7F9FA",
        dash: undefined,
        texts: ["2 weeks"],
      },
      {
        prst: "rect",
        x: 4.0355,
        y: 2,
        w: 2.929,
        h: 0.22,
        fill: "545861",
        dash: undefined,
        texts: ["Q2"],
      },
      {
        prst: "rect",
        x: 4.0557,
        y: 2.55,
        w: 2.8886,
        h: 2.45,
        fill: "1A7285",
        dash: undefined,
        texts: ["Ship", "Cut release", "−5%"],
      },
    ]);
  });
});
