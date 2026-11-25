import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import type { Block } from "../scripts/pptx/blocks/kind";
import {
  drawTimelineEvent,
  drawTimelineLabels,
  drawTimelineLine,
  eventParas,
} from "../scripts/pptx/blocks/timeline";
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

describe("eventParas", () => {
  const day = palette(false);

  it.each<{
    label: string;
    event: Block<"timeline">["events"][number];
    hi: boolean;
    expected: {
      count: number;
      titleColor: string | undefined;
      textAfter: number | undefined;
      figure: string | undefined;
    };
  }>([
    {
      label: "a highlighted event with text and negative figure",
      event: { title: "Launch", text: "Live", figure: "-5%" },
      hi: true,
      expected: { count: 3, titleColor: "1A7285", textAfter: 16, figure: "−5%" },
    },
    {
      label: "a plain event without text or figure",
      event: { title: "Plan" },
      hi: false,
      expected: { count: 2, titleColor: "19283A", textAfter: 8, figure: undefined },
    },
  ])("builds paragraphs for $label", ({ event, hi, expected }) => {
    const paras = eventParas(event, day, hi);
    expect({
      count: paras.length,
      titleColor: paras[0].runs[0].options?.color,
      textAfter: paras[1].after,
      figure: paras[2]?.runs[0].text,
    }).toEqual(expected);
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
    expect({
      rest,
      labels: shapes.map(({ y, texts }) => ({ y, text: texts.join("") })),
    }).toEqual({
      rest: { x: 2.2, y: 2, w: 8.8, h: 3 },
      labels: [
        { y: 2, text: "Year" },
        { y: 2.55, text: "Phase" },
        { y: 2.8, text: "Note" },
      ],
    });
  });
});

describe("drawTimelineLine", () => {
  const threeEvents = [{ title: "A" }, { title: "B" }, { title: "C" }];

  it.each<{
    label: string;
    block: Block<"timeline">;
    expected: { x: number; w: number; dash: string | undefined }[];
  }>([
    {
      label: "a mid-timeline now splitting solid and dashed segments",
      block: { type: "timeline", events: threeEvents, now: 1 },
      expected: [
        { x: 2.5, w: 6, dash: "solid" },
        { x: 5.5, w: 3, dash: "dash" },
        { x: 5.5, w: 3, dash: "dash" },
      ],
    },
    {
      label: "a continued timeline with now before the first event",
      block: {
        type: "timeline",
        events: threeEvents,
        continues: "both",
        now: -1,
      },
      expected: [
        { x: 0, w: 13.33299978127734, dash: "solid" },
        { x: 0, w: 13.33299978127734, dash: "dash" },
        { x: 0, w: 13.33299978127734, dash: "dash" },
      ],
    },
  ])("draws base and dashed overlay lines for $label", async ({ block, expected }) => {
    const shapes = await drawOnSheet((sheet) => {
      drawTimelineLine(sheet, block, { x: 1, y: 2, w: 9, h: 3 });
    });
    expect(shapes.map(({ x, w, dash }) => ({ x, w, dash }))).toEqual(expected);
  });
});

describe("drawTimelineEvent", () => {
  it("draws the highlighted dot, segment pill, when heading and body text", async () => {
    const day = palette(false);
    const shapes = await drawOnSheet((sheet) => {
      drawTimelineEvent(
        sheet,
        {
          x: 4,
          w: 3,
          dot: { fill: day.teal, line: day.teal },
          segment: "2 weeks",
          when: "Q2",
          paras: eventParas({ title: "Ship", text: "Cut release" }, day, true),
        },
        { area: { x: 1, y: 2, w: 9, h: 3 }, k: 1, centered: false },
      );
    });
    const dot = shapes.find((sh) => sh.prst === "ellipse");
    const segment = shapes.find((sh) => sh.texts.includes("2 weeks"));
    const when = shapes.find((sh) => sh.texts.includes("Q2"));
    assert(dot, "dot");
    assert(segment, "segment");
    assert(when, "when");
    expect({
      dot: { fill: dot.fill, x: Number(dot.x.toFixed(4)), y: Number(dot.y.toFixed(4)) },
      segmentFill: segment.fill,
      whenY: when.y,
      allTexts: shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      dot: { fill: "1A7285", x: 5.41, y: 2.26 },
      segmentFill: "F7F9FA",
      whenY: 2,
      allTexts: ["2 weeks", "Q2", "Ship", "Cut release"],
    });
  });
});
