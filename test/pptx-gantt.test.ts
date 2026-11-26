import PptxGenJS from "pptxgenjs";
import { expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  ganttGrid,
  ganttRow,
  ganttSchedule,
  ganttSpan,
  ganttSpace,
  milestones,
  monthRow,
} from "../scripts/pptx/slides/gantt";
import type { Area } from "../scripts/pptx/stage";
import type { GanttSlide } from "../types/slide";

const day = new Look(palette(false), "en", false);
const fixture: GanttSlide = {
  type: "gantt",
  headline: "Plan",
  columns: ["May", "June", "July"],
  rows: [{ label: "Build", bars: [{ label: "Pilot", start: 2, span: 2 }] }],
  milestonesLabel: "Checkpoints",
  milestones: [
    { label: "Later first", column: 3 },
    { label: "Early", column: 1 },
    { label: "Later again", column: 3 },
  ],
};

function ganttSheet() {
  const pptx = new PptxGenJS();
  return new Sheet(day, pptx.addSlide(), { pptx, assets: "", warnings: [], charts: new Map() });
}

it("reserves the tallest milestone stack and keeps groups in first-seen order", () => {
  const { groups, gx, colW, top, room } = ganttGrid(day, fixture, 1);
  expect({
    groups: [...groups].map(([column, entries]) => [column, entries.map(({ label }) => label)]),
    grid: [gx, colW, top, room].map((value) => +value.toFixed(4)),
  }).toEqual({
    groups: [
      [3, ["Later first", "Later again"]],
      [1, ["Early"]],
    ],
    grid: [3.7777, 2.9382, 1.406, 4.6646],
  });
});

it("keeps an out-of-range one-indexed span on the same column pitch", () => {
  const { x, w } = ganttSpan(ganttGrid(day, fixture, 1), 0, 2);
  expect([+x.toFixed(4), +w.toFixed(4)]).toEqual([0.8025, 5.9134]);
});

it("shares a squeezed row between the label and the track", () => {
  const { bands, milestoneY } = ganttSchedule(ganttGrid(day, fixture, 1), 0.16);
  expect({
    bands: bands.map(({ row, y, h, barY, barH }) => [
      row.label,
      ...[y, h, barY, barH].map((v) => +v.toFixed(4)),
    ]),
    milestoneY: +milestoneY.toFixed(4),
  }).toEqual({ bands: [["Build", 1.406, 0.12, 1.466, 0.06]], milestoneY: 1.6371 });
});

const twoColumns = { ...fixture, columns: ["May", "June"] };
const round = ({ x, y, w, h }: Area) => ({
  x: +x.toFixed(4),
  y: +y.toFixed(4),
  w: +w.toFixed(4),
  h: +h.toFixed(4),
});

it("writes a caps time label before its matching rule", () => {
  const sheet = ganttSheet();
  const events: unknown[] = [];
  vi.spyOn(sheet, "box").mockImplementation((text, area) => {
    events.push({ text, box: round(area) });
  });
  vi.spyOn(sheet, "rect").mockImplementation((area) => {
    events.push({ rule: round(area) });
  });
  monthRow(sheet, ganttGrid(day, twoColumns, 1));
  expect(events).toEqual([
    {
      text: { runs: [{ text: "May", options: { lang: "x-caps" } }] },
      box: { x: 3.7777, y: 1, w: 4.4258, h: 0.2625 },
    },
    { rule: { x: 3.7777, y: 1.3181, w: 4.4258, h: 0.0139 } },
    {
      text: { runs: [{ text: "June", options: { lang: "x-caps" } }] },
      box: { x: 8.2405, y: 1, w: 4.4258, h: 0.2625 },
    },
    { rule: { x: 8.2405, y: 1.3181, w: 4.4258, h: 0.0139 } },
  ]);
});

it("draws background tracks before the labelled work bar", () => {
  const sheet = ganttSheet();
  const grid = ganttGrid(
    day,
    { ...twoColumns, rows: [{ label: "Build", bars: [{ label: "Pilot", start: 1, span: 2 }] }] },
    1,
  );
  const events: unknown[] = [];
  vi.spyOn(sheet, "rounded").mockImplementation((area) => {
    events.push({ rounded: round(area) });
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area) => {
    events.push({ text, box: round(area) });
  });
  ganttRow(sheet, grid, ganttSchedule(grid, 0.3).bands[0]);
  expect(events).toEqual([
    { text: [{ runs: [{ text: "Build" }] }], box: { x: 0.6667, y: 1.406, w: 2.9629, h: 0.2259 } },
    { rounded: { x: 3.7777, y: 1.519, w: 4.4258, h: 0.113 } },
    { rounded: { x: 8.2405, y: 1.519, w: 4.4258, h: 0.113 } },
    { rounded: { x: 3.7777, y: 1.519, w: 8.8886, h: 0.113 } },
    { text: "Pilot", box: { x: 3.7777, y: 1.406, w: 8.8886, h: 0.2344 } },
  ]);
});

it("converts four Gantt spacing steps to one rem", () => {
  expect(+ganttSpace(4).toFixed(6)).toEqual(0.148146);
});

it("draws one rule for each milestone group and stacks the labels", () => {
  const sheet = ganttSheet();
  const grid = ganttGrid(day, fixture, 1);
  const events: unknown[] = [];
  vi.spyOn(sheet, "rect").mockImplementation((area) => {
    events.push(+area.x.toFixed(4));
  });
  vi.spyOn(sheet, "box").mockImplementation((text, area) => {
    events.push([text, +area.y.toFixed(4)]);
  });
  milestones(sheet, grid, 2);
  expect(events).toEqual([
    [{ runs: [{ text: "Checkpoints", options: { lang: "x-caps" } }] }, 2],
    9.7282,
    ["Later first", 2.0694],
    ["Later again", 2.3038],
    3.7777,
    ["Early", 2.0694],
  ]);
});
