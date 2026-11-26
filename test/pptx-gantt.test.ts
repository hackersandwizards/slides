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
  milestones,
  monthRow,
} from "../scripts/pptx/slides/gantt";
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

it("writes a caps time label before its matching rule", () => {
  const sheet = ganttSheet();
  const events: unknown[] = [];
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    events.push(text);
  });
  vi.spyOn(sheet, "rect").mockImplementation((area) => {
    events.push(+area.h.toFixed(4));
  });
  monthRow(sheet, ganttGrid(day, { ...fixture, columns: ["May"] }, 1));
  expect(events).toEqual([{ runs: [{ text: "May", options: { lang: "x-caps" } }] }, 0.0139]);
});

it("draws background tracks before the labelled work bar", () => {
  const sheet = ganttSheet();
  const grid = ganttGrid(day, fixture, 1);
  const events: unknown[] = [];
  vi.spyOn(sheet, "rounded").mockImplementation((area) => {
    events.push(+area.w.toFixed(4));
  });
  vi.spyOn(sheet, "box").mockImplementation((text) => {
    events.push(text);
  });
  ganttRow(sheet, grid, ganttSchedule(grid, 0.3).bands[0]);
  expect(events).toEqual([
    [{ runs: [{ text: "Build" }] }],
    2.9382,
    2.9382,
    2.9382,
    5.9134,
    "Pilot",
  ]);
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
