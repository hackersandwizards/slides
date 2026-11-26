import PptxGenJS from "pptxgenjs";
import { assert, expect, it, vi } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { guidanceExample } from "../scripts/pptx/slides/guidance";
import type { Area } from "../scripts/pptx/stage";

it("places contrasting guidance cards and preserves a blank code line", () => {
  const pptx = new PptxGenJS();
  const day = palette(false);
  const sheet = new Sheet(new Look(day, "en", false), pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  const cards = vi.spyOn(sheet, "card").mockImplementation(() => {});
  const boxes = vi.spyOn(sheet, "box").mockImplementation(() => {});
  guidanceExample(
    sheet,
    { title: "Pair", bad: "One\n\nTwo", good: "Three" },
    { x: 1, y: 2, w: 8, h: 2 },
  );
  const round = ({ x, y, w, h }: Area) => ({
    x: +x.toFixed(4),
    y: +y.toFixed(4),
    w: +w.toFixed(4),
    h: +h.toFixed(4),
  });
  expect({
    cards: cards.mock.calls.map(([area, surface]) => ({ area: round(area), surface })),
    boxes: boxes.mock.calls.map(([text, area]) => {
      assert(typeof text === "object", "The example has structured paragraphs");
      const paras = [text].flat();
      return { lines: paras.map((para) => para.runs.map((r) => r.text)), area: round(area) };
    }),
  }).toEqual({
    cards: [
      { area: { x: 1, y: 2.35, w: 3.875, h: 1.65 }, surface: { fill: day.redTint, line: day.red } },
      {
        area: { x: 5.125, y: 2.35, w: 3.875, h: 1.65 },
        surface: { fill: day.greenTint, line: day.green },
      },
    ],
    boxes: [
      { lines: [["Pair"]], area: { x: 1, y: 2, w: 8, h: 0.3 } },
      { lines: [["Bad"], ["One"], [" "], ["Two"]], area: { x: 1.2, y: 2.5, w: 3.475, h: 1.4 } },
      { lines: [["Good"], ["Three"]], area: { x: 5.325, y: 2.5, w: 3.475, h: 1.4 } },
    ],
  });
});
