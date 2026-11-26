import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  wheelColumn,
  wheelColumnLayout,
  wheelHub,
  wheelLayout,
  wheelMeasure,
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

it("assigns the vertical segment to the right on a tie", () => {
  expect(wheelSides(wheel.segments)).toEqual({ centres: [-30, 90, 210], left: [2], right: [0, 1] });
});

it("measures the row at the common width and keeps the ring diameter", () => {
  const { dia, tile, colW, textW, heights } = wheelMeasure(wheelLook(), wheel, 12);
  expect({
    dia: +dia.toFixed(4),
    tile: +tile.toFixed(4),
    colW: +colW.toFixed(4),
    textW: +textW.toFixed(4),
    heights: heights.map((h) => +h.toFixed(4)),
  }).toEqual({
    dia: 3.5555,
    tile: 0.3704,
    colW: 3.926,
    textW: 3.4445,
    heights: [1.037, 1.037, 1.037],
  });
});

it("reserves the caption under the centred ring", () => {
  const { cx, cy, caption, right } = wheelLayout(wheelLook(), wheel, room);
  expect({
    cx,
    cy: +cy.toFixed(4),
    caption: roundedArea(caption.area),
    right: { ...right, x: +right.x.toFixed(4), w: +right.w.toFixed(4) },
  }).toEqual({
    cx: 7,
    cy: 3.5761,
    caption: { x: 1, y: 5.502, w: 12, h: 0.5 },
    right: { indices: [0, 1], x: 9.074, w: 3.4445 },
  });
});

it("writes each numbered arc with its clockwise gap", () => {
  const sheet = wheelSheet();
  const shapes = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  const boxes = vi.spyOn(sheet, "box").mockImplementation(() => {});
  wheelRing(sheet, wheelLayout(wheelLook(), wheel, room));
  expect({
    arcs: shapes.mock.calls.map(([shape, options]) => [shape, options?.angleRange]),
    numbers: boxes.mock.calls.map(([text]) => text),
  }).toEqual({
    arcs: [
      ["blockArc", [271.5, 28.5]],
      ["blockArc", [31.5, 148.5]],
      ["blockArc", [151.5, 268.5]],
    ],
    numbers: [{ runs: [{ text: "1" }] }, { runs: [{ text: "2" }] }, { runs: [{ text: "3" }] }],
  });
});

it("insets the hub label equally on both axes", () => {
  const sheet = wheelSheet();
  const shapes = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  const boxes = vi.spyOn(sheet, "box").mockImplementation(() => {});
  wheelHub(sheet, "Goal", wheelLayout(wheelLook(), wheel, room));
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
  const look = wheelLook();
  const layout = wheelLayout(look, wheel, room);
  const column = wheelColumnLayout(look, layout, layout.right);
  expect(
    column.items.map(({ number, titleArea, textArea }) => ({
      number,
      title: roundedArea(titleArea),
      text: roundedArea(textArea),
    })),
  ).toEqual([
    {
      number: "1",
      title: { x: 9.5555, y: 2.4095, w: 3.4445, h: 0.5 },
      text: { x: 9.5555, y: 2.9465, w: 3.4445, h: 0.5 },
    },
    {
      number: "2",
      title: { x: 9.5555, y: 3.7058, w: 3.4445, h: 0.5 },
      text: { x: 9.5555, y: 4.2428, w: 3.4445, h: 0.5 },
    },
  ]);
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
  wheelColumn(sheet, wheelColumnLayout(look, layout, layout.left));
  expect(events).toEqual(["tile", { runs: [{ text: "3" }] }, "C", "Third"]);
});
