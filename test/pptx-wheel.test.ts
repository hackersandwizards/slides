import PptxGenJS from "pptxgenjs";
import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  wheelColumn,
  wheelColumnLayout,
  wheelHub,
  wheelLayout,
  wheelColumnHeight,
  wheelLeftWidth,
  wheelRowHeights,
  wheelRing,
  wheelSides,
} from "../scripts/pptx/slides/wheel";
import type { Area } from "../scripts/pptx/stage";
import type { WheelSlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const room = { x: 1, y: 1, w: 12, h: 6 };
const wheel: WheelSlide = {
  type: "wheel",
  headline: "Plan",
  center: "Goal",
  caption: "Caption",
  segments: [
    { title: "A", text: "First" },
    { title: "B", text: "Second" },
    { title: "C", text: "Third" },
  ],
};
const roundedArea = ({ x, y, w, h }: Area) => ({
  x: +x.toFixed(4),
  y: +y.toFixed(4),
  w: +w.toFixed(4),
  h: +h.toFixed(4),
});

function wheelLook() {
  const look = new Look(day.c, "en", false);
  vi.spyOn(look, "need").mockReturnValue(0.5);
  return look;
}

function wheelSheet() {
  const pptx = new PptxGenJS();
  return new Sheet(day, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it.each([
  {
    label: "right tie",
    segments: wheel.segments,
    expected: { centres: [-30, 90, 210], left: [2], right: [0, 1] },
  },
  {
    label: "even ring",
    segments: [...wheel.segments, { title: "D", text: "Fourth" }],
    expected: { centres: [-45, 45, 135, 225], left: [3, 2], right: [0, 1] },
  },
])("assigns the sides for $label", ({ segments, expected }) => {
  expect(wheelSides(segments)).toEqual(expected);
});

const titleO = { size: 18, mono: true, bold: true, color: day.c.ink, line: 1.25, tracking: -0.015 };
const textO = { size: 16, color: day.c.muted, line: 1.375 };
const style = { title: titleO, body: textO };

it.each([
  { label: "text height", width: 3.4445, measured: 0.5, expected: 1.037 },
  { label: "tile floor", width: 2, measured: 0.05, expected: 0.3704 },
])("measures common-width rows with $label", ({ width, measured, expected }) => {
  const look = new Look(day.c, "en", false);
  const need = vi.spyOn(look, "need").mockReturnValue(measured);
  expect({
    heights: wheelRowHeights(look, wheel.segments, { ...style, width }).map((h) => +h.toFixed(4)),
    calls: need.mock.calls,
  }).toEqual({
    heights: [expected, expected, expected],
    calls: [
      ["A", width, titleO],
      ["First", width, textO],
      ["B", width, titleO],
      ["Second", width, textO],
      ["C", width, titleO],
      ["Third", width, textO],
    ],
  });
});

const wide = {
  ...wheel,
  segments: [
    ...wheel.segments.slice(0, 2),
    { title: "A wide title for the left column", text: "Third" },
  ],
};
it.each([
  { label: "short content", slide: wheel, expected: 1.0554 },
  { label: "long content", slide: wide, expected: 5.3495 },
])("measures the natural left width for $label", ({ slide, expected }) => {
  expect(+wheelLeftWidth(slide.segments, [2]).toFixed(4)).toEqual(expected);
});

it.each([
  { label: "an empty column", heights: [], expected: 0 },
  { label: "two rows", heights: [0.5, 1], expected: 1.7593 },
])("measures the height of $label", ({ heights, expected }) => {
  expect(+wheelColumnHeight(heights).toFixed(4)).toEqual(expected);
});

function roundColumn(column: ReturnType<typeof wheelColumnLayout>) {
  return {
    ...column,
    items: column.items.map((item) => ({
      ...item,
      tile: roundedArea(item.tile),
      titleArea: roundedArea(item.titleArea),
      textArea: roundedArea(item.textArea),
    })),
  };
}

const right = {
  titleO,
  textO,
  items: [
    {
      number: "1",
      title: "A",
      text: "First",
      tile: { x: 9.074, y: 2.4095, w: 0.3704, h: 0.3704 },
      titleArea: { x: 9.5555, y: 2.4095, w: 3.4445, h: 0.5 },
      textArea: { x: 9.5555, y: 2.9465, w: 3.4445, h: 0.5 },
    },
    {
      number: "2",
      title: "B",
      text: "Second",
      tile: { x: 9.074, y: 3.7058, w: 0.3704, h: 0.3704 },
      titleArea: { x: 9.5555, y: 3.7058, w: 3.4445, h: 0.5 },
      textArea: { x: 9.5555, y: 4.2428, w: 3.4445, h: 0.5 },
    },
  ],
};
it.each([
  {
    label: "fitted left column",
    slide: wheel,
    item: {
      number: "3",
      title: "C",
      text: "Third",
      tile: { x: 3.8706, y: 3.0576, w: 0.3704, h: 0.3704 },
      titleArea: { x: 4.3521, y: 3.0576, w: 0.5739, h: 0.5 },
      textArea: { x: 4.3521, y: 3.5946, w: 0.5739, h: 0.5 },
    },
  },
  {
    label: "capped left column",
    slide: wide,
    item: {
      number: "3",
      title: "A wide title for the left column",
      text: "Third",
      tile: { x: 1, y: 3.0576, w: 0.3704, h: 0.3704 },
      titleArea: { x: 1.4815, y: 3.0576, w: 3.4445, h: 0.5 },
      textArea: { x: 1.4815, y: 3.5946, w: 3.4445, h: 0.5 },
    },
  },
])("lays out the whole wheel with a $label", ({ slide, item }) => {
  const layout = wheelLayout(wheelLook(), slide, room);
  expect({
    ring: { ...layout.ring, dia: +layout.ring.dia.toFixed(4), cy: +layout.ring.cy.toFixed(4) },
    hub: { ...layout.hub, dia: +layout.hub.dia.toFixed(4), cy: +layout.hub.cy.toFixed(4) },
    columns: layout.columns.map(roundColumn),
    caption: { ...layout.caption, area: roundedArea(layout.caption.area) },
  }).toEqual({
    ring: { dia: 3.5555, cx: 7, cy: 3.5761, centres: [-30, 90, 210] },
    hub: { dia: 3.5555, cx: 7, cy: 3.5761 },
    columns: [{ titleO, textO, items: [item] }, right],
    caption: {
      area: { x: 1, y: 5.502, w: 12, h: 0.5 },
      o: { size: 16, color: day.c.muted, line: 1.45 },
    },
  });
});

it("places each numbered arc at the stated coordinates", () => {
  const sheet = wheelSheet();
  const shapes = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  const boxes = vi.spyOn(sheet, "box").mockImplementation(() => {});
  wheelRing(sheet, wheelLayout(wheelLook(), wheel, room).ring);
  const arc = { x: 5.2223, y: 1.7984, w: 3.5555, h: 3.5555 };
  expect({
    arcs: shapes.mock.calls.map(([type, o]) => {
      assert(o, "The arc has options");
      return {
        type,
        area: roundedArea({ x: Number(o.x), y: Number(o.y), w: Number(o.w), h: Number(o.h) }),
        angles: o.angleRange,
      };
    }),
    numbers: boxes.mock.calls.map(([text, area]) => ({ text, area: roundedArea(area) })),
  }).toEqual({
    arcs: [
      { type: "blockArc", area: arc, angles: [271.5, 28.5] },
      { type: "blockArc", area: arc, angles: [31.5, 148.5] },
      { type: "blockArc", area: arc, angles: [151.5, 268.5] },
    ],
    numbers: [
      { text: { runs: [{ text: "1" }] }, area: { x: 8.0009, y: 2.7328, w: 0.4, h: 0.3 } },
      { text: { runs: [{ text: "2" }] }, area: { x: 6.8, y: 4.8128, w: 0.4, h: 0.3 } },
      { text: { runs: [{ text: "3" }] }, area: { x: 5.5991, y: 2.7328, w: 0.4, h: 0.3 } },
    ],
  });
});

it("insets the hub label equally on both axes", () => {
  const sheet = wheelSheet();
  const shapes = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  const boxes = vi.spyOn(sheet, "box").mockImplementation(() => {});
  wheelHub(sheet, "Goal", wheelLayout(wheelLook(), wheel, room).hub);
  const [shape, hub] = shapes.mock.calls[0];
  const [, box, style] = boxes.mock.calls[0];
  expect({
    shape,
    inset: +(box.x - Number(hub?.x)).toFixed(4),
    top: +(box.y - Number(hub?.y)).toFixed(4),
    box: roundedArea(box),
    align: style.align,
  }).toEqual({
    shape: "ellipse",
    inset: 0.1481,
    top: 0.1481,
    box: { x: 6.1526, y: 2.7287, w: 1.6948, h: 1.6948 },
    align: "center",
  });
});

it("places column text below its title and advances by the reserved row height", () => {
  const column = wheelColumnLayout(
    wheelLook(),
    [
      { segment: { title: "A", text: "First" }, number: 1, height: 1.0370364583333334 },
      { segment: { title: "B", text: "Second" }, number: 2, height: 1.0370364583333334 },
    ],
    { x: 9.074, y: 2.4095, w: 3.4445, style },
  );
  expect(roundColumn(column)).toEqual(right);
});

it("draws the tile, number, title and body in the measured left column", () => {
  const sheet = wheelSheet();
  const events: unknown[] = [];
  vi.spyOn(sheet, "rounded").mockImplementation(() => {
    events.push("tile");
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    events.push(text);
  });
  const look = wheelLook();
  const layout = wheelLayout(look, wheel, room);
  wheelColumn(sheet, layout.columns[0]);
  expect(events).toEqual(["tile", { runs: [{ text: "3" }] }, "C", "Third"]);
});
