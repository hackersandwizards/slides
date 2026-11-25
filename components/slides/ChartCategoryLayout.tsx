import { useLayoutEffect, useRef, useState } from "react";
import { NARROW } from "../../lib/slide-utils";
import type { TickLayout } from "./ChartPlots";

export const CHART_TICK_ANGLE = 40;
export const CHART_TICK_LINE_HEIGHT = 1.2;
export const CHART_TICK_STEPS = ["var(--text-base)", "var(--text-sm)", "var(--text-xs)"];

// Recharts takes this share of each band from either side of its bar; a label's band keeps
// one side's share of the gap between two bars.
export const CHART_BAR_GAP = 0.1;
export const TREND_VALUE_AXIS_WIDTH = 64;
/** The room a trend's x axis keeps before its first point. */
const TREND_POINT_PADDING = 24;
export const CHART_SIDE_MARGINS = { left: 8, right: 30 };

const POINTS_LEFT = CHART_SIDE_MARGINS.left + TREND_VALUE_AXIS_WIDTH;

interface ChartCategorySpacing {
  left: number;
  right: number;
  bandCount: (categoryCount: number) => number;
  gapShare: number;
  overhang: (reach: number, category: number, count: number) => number;
}

export const CHART_CATEGORY_SPACING = {
  bars: {
    ...CHART_SIDE_MARGINS,
    bandCount: (categoryCount) => categoryCount,
    gapShare: CHART_BAR_GAP,
    // A bar's overhang narrows every band by its share, so the first one is measured narrowed.
    overhang: (reach, category, count) =>
      Math.max(0, (reach - category / 2 - CHART_SIDE_MARGINS.left) / (1 - 1 / (2 * count))),
  },
  points: {
    left: POINTS_LEFT,
    right: CHART_SIDE_MARGINS.right,
    bandCount: (categoryCount) => categoryCount - 1,
    // Points have no bar between their labels: a gap's share on either side keeps them apart.
    gapShare: 2 * CHART_BAR_GAP,
    // A first point stands the axis's padding in from the plot's edge.
    overhang: (reach) => Math.max(0, reach - POINTS_LEFT - TREND_POINT_PADDING),
  } satisfies ChartCategorySpacing,
} satisfies Record<"bars" | "points", ChartCategorySpacing>;

type WidthAt = (text: string, step: number) => number;
type WrapCategoryLabels = (labels: string[], band: number, widthAt: WidthAt) => TickLayout;

export interface MeasuredChartLabels extends TickLayout {
  height: number;
  overhang: number;
  edges: [number, number];
  narrow: boolean;
}

interface ChartLabelFont {
  sizes: number[];
  widthAt: WidthAt;
}

function canvasLabelFont(el: HTMLElement, ctx: CanvasRenderingContext2D): ChartLabelFont {
  const { fontFamily, fontWeight } = getComputedStyle(el);
  // The steps scale with the stage, so they are read again on every resize, in one pass.
  const probes = CHART_TICK_STEPS.map((size) => {
    const probe = el.appendChild(document.createElement("span"));
    probe.style.fontSize = size;
    return probe;
  });
  const sizes = probes.map((probe) => parseFloat(getComputedStyle(probe).fontSize));
  for (const probe of probes) probe.remove();
  return {
    sizes,
    widthAt: (text, step) => {
      ctx.font = `${fontWeight} ${sizes[step]}px ${fontFamily}`;
      return ctx.measureText(text).width;
    },
  };
}

export function wrappedLabelMetrics(
  layout: TickLayout,
  font: ChartLabelFont,
): Omit<MeasuredChartLabels, "narrow"> {
  const { lines, step } = layout;
  const size = font.sizes[step];
  const widest = (label: string[] = []) =>
    Math.max(0, ...label.map((line) => font.widthAt(line, step)));
  return {
    ...layout,
    height: Math.max(...lines.map((label) => label.length)) * size * CHART_TICK_LINE_HEIGHT + size,
    overhang: 0,
    // The widest line of the first and the last label, which a plot of points centres on its ends.
    edges: [widest(lines[0]), widest(lines[lines.length - 1])],
  };
}

export function angledLabelMetrics(
  layout: TickLayout,
  font: ChartLabelFont,
  overhangAt: (reach: number) => number,
): Omit<MeasuredChartLabels, "narrow"> {
  const { lines, step } = layout;
  const size = font.sizes[step];
  const angle = (CHART_TICK_ANGLE * Math.PI) / 180;
  const widths = lines.map(([line]) => font.widthAt(line, step));
  const reach = (widths[0] ?? 0) * Math.cos(angle);
  return {
    ...layout,
    height: Math.max(...widths) * Math.sin(angle) + size * 2,
    // An angled first label runs left of its bar or point: the plot moves right to keep it whole.
    overhang: overhangAt(reach),
    edges: [0, 0],
  };
}

export function trendCategoryPadding([first, last]: [number, number] = [0, 0]) {
  // A point's label centres on it, so the first and last labels overhang the plot by half their
  // width: the axis pads each end by what the margin beside it leaves over.
  return {
    left: Math.max(
      TREND_POINT_PADDING,
      Math.ceil(first / 2 - TREND_VALUE_AXIS_WIDTH - CHART_SIDE_MARGINS.left),
    ),
    right: Math.max(8, Math.ceil(last / 2 - CHART_SIDE_MARGINS.right)),
  };
}

/** The tick layout for the plot's width, measured in the browser; one line at the first step
 *  until then. */
export function useChartCategoryLabels(
  labels: string[],
  spacing: ChartCategorySpacing,
  wrap: WrapCategoryLabels,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<MeasuredChartLabels>();
  const key = JSON.stringify(labels);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const names: unknown = JSON.parse(key);
    if (!Array.isArray(names) || !names.every((name: unknown) => typeof name === "string")) return;
    const update = () => {
      const font = canvasLabelFont(el, ctx);
      const width =
        (el.clientWidth - spacing.left - spacing.right) /
        Math.max(1, spacing.bandCount(names.length));
      const next = wrap(names, width * (1 - spacing.gapShare), font.widthAt);
      const metrics = next.angled
        ? angledLabelMetrics(next, font, (reach) =>
            spacing.overhang(reach, width, next.lines.length),
          )
        : wrappedLabelMetrics(next, font);
      const measured = {
        ...metrics,
        narrow: !!window.matchMedia?.(NARROW).matches,
      };
      setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(measured) ? prev : measured));
    };
    // The observer reports the element's size once as it starts, which lays the labels out.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // A web font still loading measures wider once it arrives.
    if (document.fonts?.status === "loading") void document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [key, spacing, wrap]);
  return { ref, layout };
}
