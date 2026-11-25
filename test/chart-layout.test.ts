import { expect, it } from "vitest";
import {
  angledLabelMetrics,
  CHART_CATEGORY_SPACING,
  trendCategoryPadding,
  wrappedLabelMetrics,
} from "../components/slides/ChartCategoryLabels";
import { trendTimeline } from "../components/slides/TrendSeries";

const font = {
  sizes: [10, 8, 7],
  widthAt: (text: string, step: number): number => text.length * font.sizes[step],
};

it("reserves the height and end widths of wrapped category labels", () => {
  const layout = { step: 0, angled: false, lines: [["Long", "a"], ["End"]] };
  expect(wrappedLabelMetrics(layout, font)).toEqual({
    ...layout,
    height: 34,
    overhang: 0,
    edges: [40, 30],
  });
});

it.each([
  { kind: "bars", overhang: 78.995 },
  { kind: "points", overhang: 11.246 },
] as const)("accounts for the first label's angled overhang on $kind", ({ kind, overhang }) => {
  const layout = { step: 2, angled: true, lines: [["01234567890123456789"], ["End"]] };
  const spacing = CHART_CATEGORY_SPACING[kind];
  const metrics = angledLabelMetrics(layout, font, (reach) =>
    spacing.overhang(reach, 80, layout.lines.length),
  );
  expect(metrics).toEqual({
    ...layout,
    height: expect.closeTo(103.99, 2),
    overhang: expect.closeTo(overhang, 2),
    edges: [0, 0],
  });
});

it("pads both ends of a trend axis for labels wider than its margins", () => {
  expect(trendCategoryPadding([215, 85])).toEqual({ left: 36, right: 13 });
});

it("treats both trend series as measured when the named marker is absent", () => {
  expect(trendTimeline([{ name: "A", value: 1, value2: 2 }], "Missing")).toStrictEqual({
    marked: -1,
    rows: [{ name: "A", value: 1, value2: 2, plan: undefined, plan2: undefined }],
  });
});
