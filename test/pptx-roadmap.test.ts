import PptxGenJS from "pptxgenjs";
import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { columnGroups, roadmapColumn, roadmapParas } from "../scripts/pptx/slides/roadmap";
import type { RoadmapColumn } from "../types/slide";

const day = new Look(palette(false), "en", false);
const column: RoadmapColumn = { label: "A", title: "Path", accent: "ingredients" };

it("lets an explicitly empty phase list override flat roadmap items", () => {
  expect(columnGroups(day, { ...column, phases: [], items: [{ title: "Flat" }] })).toEqual({
    tone: day.c.teal,
    groups: [],
  });
});

it("prefers the current row tone to a deprecated class and keeps the numbered marker", () => {
  const group = {
    hue: day.c.purple,
    items: [
      { title: "Current", tone: "success", dotColor: "bg-primary" },
      { title: "Numbered", number: 8, tone: "success" },
    ],
  } as const;
  const paras = roadmapParas(day, column, [{ hue: group.hue, items: [...group.items] }]);
  expect(
    paras.slice(1).map(({ runs }) => runs.map(({ text, options }) => [text, options])),
  ).toEqual([
    [
      ["•  ", { color: day.c.green }],
      ["Current", { bold: true, fontFace: "JetBrains Mono" }],
    ],
    [
      ["8  ", { color: day.c.purple, bold: true, fontFace: "JetBrains Mono" }],
      ["Numbered", { bold: true, fontFace: "JetBrains Mono" }],
    ],
  ]);
});

it("places the accent rule above the inset roadmap text", () => {
  const pptx = new PptxGenJS();
  const sheet = new Sheet(day, pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  const rule = vi.spyOn(sheet, "rect");
  const text = vi.spyOn(sheet, "box");
  roadmapColumn(sheet, column, { x: 1, y: 2, w: 4, h: 3 });
  const call = text.mock.calls.at(-1);
  assert(call, "The roadmap column has a text box");
  expect({ rule: rule.mock.calls[0], text: call[1] }).toEqual({
    rule: [{ x: 1.15, y: 2, w: 3.7, h: 0.05 }, day.c.teal],
    text: { x: 1.25, y: 2.65, w: 3.5, h: 2.2 },
  });
});
