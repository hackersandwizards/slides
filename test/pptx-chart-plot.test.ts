import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  axisLabels,
  barTicks,
  drawNativePlot,
  drawPlot,
  plotFrame,
  plotLayout,
  plotSeries,
  trendFill,
  trendNames,
  trendScale,
} from "../scripts/pptx/slides/chart-plot";
import type { ChartSlide } from "../types/slide";

const look = new Look(palette(false), "en", false);
const body = { x: 0, y: 1, w: 12, h: 2 };
const trend = { type: "chart", variant: "trend" } as const;
const bar = { type: "chart", variant: "bar" } as const;
const scale = { g: { x: 1, y: 2, w: 4, h: 2 }, lo: 0, hi: 10, majorUnit: 5 };

it("splits duplicate marker names at the first occurrence and retains missing second values", () => {
  const data = [
    { name: "Now", value: 2 },
    { name: "Now", value: 4, value2: 3 },
  ];
  expect(
    plotSeries(
      { ...trend, currentMarker: "Now", data, yLabel: "Units", series2Label: "Other" },
      "plan",
    ),
  ).toEqual({
    data,
    labels: ["Now", "Now"],
    now: 0,
    two: true,
    series: [
      { name: "Units", labels: ["Now", "Now"], values: [2, null] },
      { name: "Units (plan)", labels: ["Now", "Now"], values: [2, 4] },
      { name: "Other", labels: ["Now", "Now"], values: [null, null] },
      { name: "Other (plan)", labels: ["Now", "Now"], values: [null, 3] },
    ],
    unnamed: [0],
  });
});

it("reserves a second annotation line when the plot card is height constrained", () => {
  const frame = plotFrame({ ...trend, annotation: "Note", seriesLabel: "Total" }, body);
  expect({
    card: Object.values(frame.card).map((value) => +value.toFixed(4)),
    annotation: Object.values(frame.annotation).map((value) => +value.toFixed(4)),
    legend: frame.legend,
  }).toEqual({
    card: [1.9269, 1.6377, 9.4792, 0.6297],
    annotation: [1.9269, 2.4896, 9.4792, 0.6806],
    legend: true,
  });
});

it("uses the padded card edges when axis labels are absent", () => {
  const axes = axisLabels(look, bar, {
    card: { x: 0.5, y: 1, w: 4, h: 2 },
    legend: false,
    annotation: { x: 0, y: 0, w: 0, h: 0 },
  });
  expect({
    labels: axes.labels.map(({ text, o }) => [text, o.align]),
    plot: Object.values(axes.plot).map((value) => +value.toFixed(4)),
    chart: Object.values(axes.chart).map((value) => +value.toFixed(4)),
  }).toEqual({
    labels: [
      [undefined, "left"],
      [undefined, "right"],
      [undefined, "center"],
    ],
    plot: [0.7963, 1.2963, 3.4074, 1.4074],
    chart: [0.7963, 1.2963, 3.4074, 1.4074],
  });
});

it("uses minimum end padding when category names are empty", () => {
  const series = plotSeries(
    {
      ...trend,
      data: [
        { name: "", value: 0 },
        { name: "", value: 10 },
      ],
    },
    "plan",
  );
  const { g, ...ticks } = trendScale({ x: 0, y: 0, w: 4, h: 2 }, series);
  expect({ ...ticks, area: Object.values(g).map((value) => +value.toFixed(4)) }).toEqual({
    lo: 0,
    hi: 12,
    majorUnit: 3,
    area: [0.6667, 0.0833, 3.0694, 1.4722],
  });
});

it("places a marker guide under the dot and centres empty names on the end points", () => {
  const series = plotSeries(
    {
      ...trend,
      currentMarker: "",
      data: [
        { name: "", value: 5 },
        { name: "", value: 10 },
      ],
    },
    "plan",
  );
  const { guide, names } = trendNames(scale, series);
  expect({
    guide: Object.values(guide).map((value) => +value.toFixed(4)),
    names: names.map(({ name, bold, area }) => [
      name,
      bold,
      ...Object.values(area).map((value) => +value.toFixed(4)),
    ]),
  }).toEqual({
    guide: [1, 3.0764, 0.001, 0.9236],
    names: [
      ["", true, 0.95, 4.0833, 0.1, 0.3194],
      ["", false, 4.95, 4.0833, 0.1, 0.3194],
    ],
  });
});

it("closes the measured polygon at zero before the planned point", () => {
  const series = plotSeries(
    {
      ...trend,
      currentMarker: "B",
      data: [
        { name: "A", value: 5 },
        { name: "B", value: 10 },
        { name: "C", value: 0 },
      ],
    },
    "plan",
  );
  expect(trendFill(scale, series)).toEqual([
    { x: 0, y: 2, moveTo: true },
    { x: 0, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { close: true },
  ]);
});

it("fits the middle font size for a one-character category in a narrow band", () => {
  const series = plotSeries({ ...bar, data: [{ name: "M", value: 4 }] }, "plan");
  expect(barTicks({ x: 0, y: 0, w: 0.198, h: 1 }, series)).toEqual(13.33);
});

function chartSlide() {
  const pptx = new PptxGenJS();
  return new Sheet(look, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it("registers the bar on the next native chart number", () => {
  const sheet = chartSlide();
  sheet.out.charts.set(1, { now: -1, unnamed: [] });
  const drawing = vi.spyOn(sheet.slide, "addChart");
  const d: ChartSlide = { ...bar, data: [{ name: "M", value: 4 }] };
  drawNativePlot(sheet, plotLayout(sheet, d, body));
  expect({ registry: [...sheet.out.charts], type: drawing.mock.calls[0][0] }).toEqual({
    registry: [
      [1, { now: -1, unnamed: [] }],
      [2, { level: true }],
    ],
    type: "bar",
  });
});

it("draws the card, annotation, axis text, fill and native chart in stacking order", () => {
  const sheet = chartSlide();
  const draw: string[] = [];
  vi.spyOn(sheet, "card").mockImplementation(() => {
    draw.push("card");
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    draw.push(String(text));
  });
  vi.spyOn(sheet.slide, "addShape").mockImplementation((preset) => {
    draw.push(preset);
    return sheet.slide;
  });
  vi.spyOn(sheet.slide, "addChart").mockImplementation((type) => {
    draw.push(String(type));
    return sheet.slide;
  });
  drawPlot(
    sheet,
    {
      ...trend,
      data: [
        { name: "A", value: 5 },
        { name: "B", value: 10 },
      ],
      yLabel: "YAxis",
      xLabel: "XAxis",
      annotation: "Note",
    },
    { x: 0, y: 1, w: 12, h: 5 },
  );
  expect(draw).toEqual(["card", "Note", "YAxis", "XAxis", "custGeom", "line"]);
});

it("extends a single-point named trend above its plot without a fill or guide", () => {
  const d: ChartSlide = { ...trend, data: [{ name: "A", value: 7 }], seriesLabel: "Total" };
  const { axes, frame, points, marking } = plotLayout(look, d, body);
  expect({
    legend: frame.legend,
    legendTop: +axes.chart.y.toFixed(4),
    plotTop: +axes.plot.y.toFixed(4),
    points,
    marking,
  }).toEqual({
    legend: true,
    legendTop: 1,
    plotTop: 1.7639,
    points: undefined,
    marking: undefined,
  });
});
