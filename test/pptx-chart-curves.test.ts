import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { chartKind } from "../scripts/pptx/slides/chart";
import { drawCycle } from "../scripts/pptx/slides/chart-cycle";
import { curve, drawGraph, graphCaptions, graphMarker } from "../scripts/pptx/slides/chart-graph";
import type { ChartSlide } from "../types/slide";
import { onlySlide, shapesOf } from "./fixtures/rendered-deck";

const area = { x: 1, y: 1, w: 8, h: 4 };
const look = new Look(palette(false), "en", false);

function curveSheet() {
  const pptx = new PptxGenJS();
  return new Sheet(look, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it("uses a graph for empty native series and unsupported variants", () => {
  const slides: ChartSlide[] = [
    { type: "chart", variant: "trend" },
    { type: "chart", variant: "bar", data: [] },
    { type: "chart", variant: "constructor" as "graph" },
  ];
  expect(slides.map(chartKind)).toEqual(["graph", "graph", "graph"]);
});

it("samples both endpoints and closes only the tinted curve polygon", () => {
  const sheet = curveSheet();
  const shapes = vi.spyOn(sheet.slide, "addShape").mockReturnValue(sheet.slide);
  curve(sheet, area, (t) => t);
  expect(
    shapes.mock.calls.map(([preset, box]) => ({
      preset,
      count: box?.points?.length,
      first: box?.points?.[0],
      last: box?.points?.at(-1),
    })),
  ).toEqual([
    { preset: "custGeom", count: 103, first: { x: 0, y: 4, moveTo: true }, last: { close: true } },
    { preset: "custGeom", count: 100, first: { x: 0, y: 4, moveTo: true }, last: { x: 8, y: 0 } },
  ]);
});

it("draws a divider before the first share but none after the last share", () => {
  const sheet = curveSheet();
  const calls: (string | { text: string; bold: boolean | undefined })[] = [];
  vi.spyOn(sheet.slide, "addShape").mockImplementation((preset) => {
    calls.push(preset);
    return sheet.slide;
  });
  vi.spyOn(sheet, "box").mockImplementation((content) => {
    const text = content as { runs: { text: string }[]; bold?: boolean }[];
    calls.push(...text.map((p) => ({ text: p.runs[0].text, bold: p.bold })));
  });
  drawCycle(
    sheet,
    {
      type: "chart",
      variant: "cycle",
      currentSegmentIndex: 1,
      segments: [
        { label: "First", percentage: 25 },
        { label: "Second", percentage: 75 },
      ],
    },
    area,
  );
  expect(calls).toEqual([
    "custGeom",
    "custGeom",
    "line",
    { text: "First", bold: false },
    { text: "25%", bold: undefined },
    { text: "Second", bold: true },
    { text: "75%", bold: undefined },
  ]);
});

it("positions the point at sample 60 and its label to the upper left", () => {
  const { point, label } = graphMarker({ x: 1, y: 2, w: 9.9, h: 4 });
  expect({
    point: Object.values(point).map((v) => +v.toFixed(4)),
    label: Object.values(label).map((v) => +v.toFixed(4)),
  }).toEqual({
    point: [6.91, 4.6831, 0.18, 0.18],
    label: [5.4, 4.3731, 1.5, 0.3],
  });
});

it("adds graph captions before the dot and its label", () => {
  const sheet = curveSheet();
  const calls: string[] = [];
  vi.spyOn(sheet.slide, "addShape").mockImplementation((preset) => {
    calls.push(preset);
    return sheet.slide;
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    calls.push(String(text));
  });
  drawGraph(
    sheet,
    {
      type: "chart",
      variant: "graph",
      xLabel: "X",
      yLabel: "Y",
      futureNote: "Soon",
      currentMarker: "Now",
    },
    area,
  );
  expect(calls).toEqual([
    "custGeom",
    "custGeom",
    "line",
    "line",
    "X",
    "Y",
    "Soon",
    "ellipse",
    "Now",
  ]);
});

it("places the vertical axis caption at the body edge and the note over half the plot", () => {
  const d: ChartSlide = { type: "chart", variant: "graph", yLabel: "Value", futureNote: "Later" };
  expect(graphCaptions(d, area, { x: 3, y: 2.3, w: 6, h: 4 })).toEqual([
    {
      text: undefined,
      area: { x: 3, y: 6.3999999999999995, w: 6, h: 0.3 },
      options: { align: "center" },
    },
    {
      text: "Value",
      area: { x: 1, y: 4, w: 1.4, h: 0.6 },
      options: { align: "right", valign: "middle" },
    },
    { text: "Later", area: { x: 3.1, y: 2.3, w: 3, h: 0.3 }, options: {} },
  ]);
});

it("writes the annotation for a graph", async () => {
  const xml = await onlySlide({
    type: "chart",
    variant: "graph",
    annotation: "Illustrative only.",
  });
  expect(
    shapesOf(xml)
      .flatMap((shape) => shape.texts)
      .filter((text) => text === "Illustrative only."),
  ).toEqual(["Illustrative only."]);
});
