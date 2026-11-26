import PptxGenJS from "pptxgenjs";
import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { drawLane, laneBands, lanesBody } from "../scripts/pptx/slides/lanes";
import type { Area } from "../scripts/pptx/stage";
import type { LanesSlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const slide: LanesSlide = {
  type: "lanes",
  headline: "Flow",
  lanes: [
    { label: "First", stages: [] },
    { label: "Next", stages: [] },
  ],
};
const round = ({ x, y, w, h }: Area) => ({
  x: +x.toFixed(4),
  y: +y.toFixed(4),
  w: +w.toFixed(4),
  h: +h.toFixed(4),
});

it("reserves a code box and its gap before allocating lane height", () => {
  const layout = lanesBody(day, { ...slide, codeSnippet: { language: "text", code: "a\nb" } }, 1);
  assert(layout.snippet, "The body contains the two-line snippet");
  expect({
    top: +layout.top.toFixed(4),
    room: +layout.room.toFixed(4),
    snippet: layout.snippet.block,
    area: round(layout.snippet.slot.area),
    footer: layout.foot,
  }).toEqual({
    top: 2.1278,
    room: 4.3181,
    snippet: { type: "code", language: "text", code: "a\nb" },
    area: { x: 0.6667, y: 1, w: 11.9997, h: 0.9278 },
    footer: { text: undefined, h: 0 },
  });
});

it("positions two lane frames and labels with the row gap", () => {
  const layout = lanesBody(day, slide, 1);
  expect(
    laneBands(layout, 0.47).map(({ lane, first, area, label }) => ({
      lane: lane.label,
      first,
      area: round(area),
      label: round(label),
    })),
  ).toEqual([
    {
      lane: "First",
      first: true,
      area: { x: 0.6667, y: 1, w: 11.9997, h: 0.47 },
      label: { x: 0.9167, y: 1, w: 1.6, h: 0.47 },
    },
    {
      lane: "Next",
      first: false,
      area: { x: 0.6667, y: 1.59, w: 11.9997, h: 0.47 },
      label: { x: 0.9167, y: 1.59, w: 1.6, h: 0.47 },
    },
  ]);
});

it("draws the first lane's highlighted frame before its label", () => {
  const pptx = new PptxGenJS();
  const sheet = new Sheet(day, pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  const events: unknown[] = [];
  vi.spyOn(sheet, "rounded").mockImplementation((area, surface, radius) => {
    events.push({ area: round(area), surface, radius });
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area, o) => {
    events.push({ text, area: round(area), o });
  });
  drawLane(sheet, laneBands(lanesBody(day, slide, 1), 0.47)[0]);
  expect(events).toEqual([
    {
      area: { x: 0.6667, y: 1, w: 11.9997, h: 0.47 },
      surface: { fill: day.c.purpleTint, line: day.c.purple },
      radius: 0.08,
    },
    {
      text: { runs: [{ text: "First" }] },
      area: { x: 0.9167, y: 1, w: 1.6, h: 0.47 },
      o: { size: 16, mono: true, bold: true, color: day.c.purple, valign: "middle" },
    },
  ]);
});
