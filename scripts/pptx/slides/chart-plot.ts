import type PptxGenJS from "pptxgenjs";
import { trendTicks } from "../../../components/slides/ChartPlots";
import type { ChartSlide } from "../../../types/slide";
import { MONO, SANS } from "../faces";
import { textWidth } from "../fit";
import type { Look } from "../look";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { W, PT, LEADING, REM, type Area } from "../stage";
import type { BoxOpts } from "../text";

/** A trend or bar chart as the print route draws it (`ChartFrame`, `Axes` and recharts' margins in
 *  `ChartPlots`): the card, its padding, a 16 pt label's line and the gaps round it, the legend's
 *  row over the card, the annotation under it, and the plot's edges inside its container. */
const CHART = {
  w: 1365 / 144,
  h: 560 / 144,
  pad: 42.67 / 144,
  line: 46 / 144,
  underHead: 10.67 / 144,
  overFoot: 5.33 / 144,
  legend: (46 + 21.33) / 144,
  note: 32 / 144,
  noteLine: 49 / 144,
  left: (8 + 64) / 144,
  right: 30 / 144,
  top: 12 / 144,
  /** recharts' `tickMargin`, `TICK_GAP` in `ChartPlots`. */
  tick: 12 / 144,
  bottom: (8 + 56) / 144,
};

/** A bar's name sizes, `CHART_TICK_STEPS` in `ChartCategoryLayout.tsx`: the web's text-base, text-sm and text-xs. */
const TICK_STEPS = [PT.sm, 13.33, 12];

/** The native series and the indices the legend leaves out. */
export function plotSeries(d: ChartSlide, planned: string) {
  const data = d.data ?? [];
  const labels = data.map((p) => p.name);
  // A marked trend is measured up to the point and planned from it, both holding the point,
  // as on the web slide; `finishChart` dashes the planned half once the chart is written.
  const now = d.variant === "trend" ? data.findIndex((p) => p.name === d.currentMarker) : -1;
  const halves = (name: string, pick: (p: (typeof data)[number]) => number | null) => [
    { name, labels, values: data.map((p, i) => (now < 0 || i <= now ? pick(p) : null)) },
    ...(now < 0
      ? []
      : [
          {
            name: `${name} (${planned})`,
            labels,
            values: data.map((p, i) => (i >= now ? pick(p) : null)),
          },
        ]),
  ];
  const two = data.some((p) => p.value2 !== undefined);
  const series = [
    ...halves(d.seriesLabel ?? d.yLabel ?? "", (p) => p.value),
    // A point without a second value is a gap, as on the web, never a zero.
    ...(two ? halves(d.series2Label ?? "", (p) => p.value2 ?? null) : []),
  ];
  // The web's legend has an entry for a named series only.
  const perSeries = now < 0 ? 1 : 2;
  const unnamed = [d.seriesLabel, ...(two ? [d.series2Label] : [])].flatMap((name, i) =>
    name ? [] : [i * perSeries],
  );
  return { data, labels, now, two, series, unnamed };
}

type PlotSeries = ReturnType<typeof plotSeries>;

/** The card and its surrounding legend and annotation. */
export function plotFrame(d: ChartSlide, a: Area) {
  // The card as `ChartFrame` draws it, the legend above it and the annotation below, centred
  // in the body as the web centres them; a long annotation may take two lines.
  const legend = d.variant === "trend" && !!(d.seriesLabel || d.series2Label);
  const above = legend ? CHART.legend : 0;
  const below = d.annotation ? CHART.note + CHART.noteLine : 0;
  const h = Math.min(CHART.h, a.h - above - below - (d.annotation ? CHART.noteLine : 0));
  const card = {
    x: (W - CHART.w) / 2,
    y: a.y + above + Math.max(0, (a.h - above - h - below) / 2),
    w: CHART.w,
    h,
  };
  // The web's `Annotation`, under the card or the drawing.
  const annotation = {
    x: card.x,
    y: card.y + card.h + CHART.note,
    w: card.w,
    h: 2 * CHART.noteLine,
  };
  return { card, legend, annotation };
}

type PlotFrame = ReturnType<typeof plotFrame>;

/** The axis text boxes, the visible plot and the native chart including the legend. */
export function axisLabels(look: Look, d: ChartSlide, { card: f, legend }: PlotFrame) {
  // `Axes`: the y label and the note over the plot, the x label under it.
  const inner = {
    x: f.x + CHART.pad,
    y: f.y + CHART.pad,
    w: f.w - 2 * CHART.pad,
    h: f.h - 2 * CHART.pad,
  };
  const o: BoxOpts = { size: PT.sm, color: look.c.muted };
  const note = d.variant === "trend" ? d.futureNote : undefined;
  // The y label and the note in one row 2 rem apart, each shrinking by its share of the
  // overflow and wrapping, as the web's flex row sets them.
  const gapX = 2 * REM;
  const basis = [d.yLabel, note].map((t) => (t ? textWidth(t, o) + 0.02 : 0));
  const over = Math.max(0, basis[0] + basis[1] + gapX - inner.w);
  const sum = basis[0] + basis[1] || 1;
  const [yw, nw] = basis.map((b) => b - (over * b) / sum);
  const lines = (t: string | undefined, w: number) =>
    t ? Math.round(look.need(t, w, o) / ((PT.sm * LEADING.body) / 72)) : 0;
  const headH = Math.max(1, Math.max(lines(d.yLabel, yw), lines(note, nw))) * CHART.line;
  const head = d.yLabel || note ? headH + CHART.underHead : 0;
  const foot = d.xLabel ? CHART.line + CHART.overFoot : 0;
  const labels = [
    {
      text: d.yLabel,
      area: { x: inner.x, y: inner.y, w: yw, h: headH },
      o: { ...o, align: "left" },
    },
    {
      text: note,
      area: { x: inner.x + inner.w - nw, y: inner.y, w: nw, h: headH },
      o: { ...o, align: "right" },
    },
    {
      text: d.xLabel,
      area: { x: inner.x, y: inner.y + inner.h - CHART.line, w: inner.w, h: CHART.line },
      o: { ...o, align: "center" },
    },
  ] satisfies { text?: string; area: Area; o: BoxOpts }[];
  // The chart reaches up over the card for its legend, which PowerPoint sets at its top.
  const plot = { x: inner.x, y: inner.y + head, w: inner.w, h: inner.h - head - foot };
  const top = legend ? f.y - CHART.legend : plot.y;
  const chart = { ...plot, y: top, h: plot.y + plot.h - top };
  return { labels, plot, chart };
}

/** The coordinates and ticks of a trend's data area. */
export function trendScale(plot: Area, { data, labels, now }: PlotSeries) {
  // The plot where recharts draws it, less its x axis's padding, which a chart's categories
  // cannot take; the value axis on the web's ticks.
  const ticks = trendTicks(data);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  // A point's name centres on it, so the axis pads each end by what the first and last
  // names overhang the margin beside them, as `TrendPlot` does.
  const edge = (i: number) => textWidth(labels[i], { size: PT.sm, bold: i === now }) / 2;
  const padL = Math.max(24 / 144, edge(0) - CHART.left);
  const padR = Math.max(8 / 144, edge(labels.length - 1) - CHART.right);
  const g = {
    x: plot.x + CHART.left + padL,
    y: plot.y + CHART.top,
    w: plot.w - CHART.left - CHART.right - padL - padR,
    h: plot.h - CHART.top - CHART.bottom,
  };
  return { g, lo, hi, majorUnit: ticks[1] - lo };
}

type TrendScale = ReturnType<typeof trendScale>;

/** The guide and text boxes of a marked trend. */
export function trendNames({ g, hi, lo }: TrendScale, { data, labels, now }: PlotSeries) {
  // A chart's category names take one style, so a marked trend sets each as text under its
  // point, the marked one in teal and bold as the web's tick, and a dashed guide from the dot
  // down to the axis.
  const wide = g.w / Math.max(1, data.length - 1);
  const xAt = (i: number) => (i / Math.max(1, data.length - 1)) * g.w;
  const yAt = (v: number) => ((hi - v) / (hi - lo)) * g.h;
  // From under the dot, a marker of 11 pt, so the guide stays behind it as on the web.
  const dot = g.y + yAt(data[now].value) + 11 / 72 / 2;
  const guide = { x: g.x + xAt(now), y: dot, w: 0.001, h: Math.max(0, g.y + g.h - dot) };
  const names = labels.map((name, i) => {
    const edge = textWidth(name, { size: PT.sm, bold: i === now }) / 2;
    const lw = Math.min(wide, 2 * edge + 0.1);
    return {
      name,
      bold: i === now,
      area: { x: g.x + xAt(i) - lw / 2, y: g.y + g.h + CHART.tick, w: lw, h: CHART.line },
    };
  });
  return { guide, names };
}

/** The measured polygon under a lone series, when it spans two or more points. */
export function trendFill({ g, hi, lo }: TrendScale, { now, two, data }: PlotSeries) {
  // recharts fills a lone series' measured part down to 0; a chart's area series would
  // fall to zero after its last value, so the fill is a shape under the chart's plot.
  const filled = now < 0 ? data.length : now + 1;
  if (two || filled <= 1) return undefined;
  const xAt = (i: number) => (i / Math.max(1, data.length - 1)) * g.w;
  const yAt = (v: number) => ((hi - v) / (hi - lo)) * g.h;
  return [
    { x: 0, y: yAt(0), moveTo: true },
    ...data.slice(0, filled).map((p, i) => ({ x: xAt(i), y: yAt(p.value) })),
    { x: xAt(filled - 1), y: yAt(0) },
    { close: true as const },
  ];
}

/** The first category size that fits a bar's band. */
export function barTicks(plot: Area, { labels, data }: PlotSeries) {
  // A bar's names wrap level at their band in the first of the web's steps where every word
  // fits it, else tilt at the last, as `tickLayout` sets them.
  const band = (plot.w / data.length) * 0.9;
  return TICK_STEPS.find(
    (pt) =>
      Math.max(...labels.flatMap((l) => l.split(" ").map((w) => textWidth(w, { size: pt })))) <=
      band,
  );
}

/** Measures the chart, its card and its labels before adding slide objects. */
export function plotLayout(look: Look, d: ChartSlide, body: Area) {
  const series = plotSeries(d, look.words.planned);
  const frame = plotFrame(d, body);
  const axes = axisLabels(look, d, frame);
  const trend = d.variant === "trend" ? trendScale(axes.plot, series) : undefined;
  const points = trend && trendFill(trend, series);
  const tickSize = barTicks(axes.plot, series);
  const marking = trend && series.now >= 0 ? trendNames(trend, series) : undefined;
  const { chart: r } = axes;
  const scale = trend
    ? {
        layout: {
          x: (trend.g.x - r.x) / r.w,
          y: (trend.g.y - r.y) / r.h,
          w: trend.g.w / r.w,
          h: trend.g.h / r.h,
        },
        valAxisMinVal: trend.lo,
        valAxisMaxVal: trend.hi,
        valAxisMajorUnit: trend.majorUnit,
      }
    : {};
  return { frame, axes, series, trend, points, tickSize, marking, scale };
}

type PlotLayout = ReturnType<typeof plotLayout>;

/** Registers the chart's finishing instructions and writes its native part. */
export function drawNativePlot(
  sheet: Sheet,
  { frame, axes, series, trend, scale, tickSize: step }: PlotLayout,
) {
  const {
    slide: s,
    out: { pptx, charts },
    c,
  } = sheet;
  const { chart: r } = axes;
  const { now, two, unnamed } = series;
  const hues = two ? [c.teal, c.purple] : [c.teal];
  charts.set(charts.size + 1, trend ? { now, unnamed } : { level: step !== undefined });
  s.addChart(trend ? pptx.ChartType.line : pptx.ChartType.bar, series.series, {
    ...r,
    chartColors: now < 0 ? hues : hues.flatMap((hue) => [hue, hue]),
    lineSize: 2.5,
    lineDataSymbol: "none",
    barDir: "col",
    showLegend: frame.legend,
    legendPos: "t",
    legendFontFace: SANS,
    legendFontSize: PT.sm,
    legendColor: c.ink,
    catAxisLabelFontFace: SANS,
    valAxisLabelFontFace: SANS,
    catAxisLabelColor: c.muted,
    valAxisLabelColor: c.muted,
    catAxisLabelFontSize: trend ? PT.sm : (step ?? TICK_STEPS[TICK_STEPS.length - 1]),
    valAxisLabelFontSize: PT.sm,
    valGridLine: { color: c.border, size: 0.5 },
    catAxisLineShow: true,
    valAxisLineShow: false,
    ...scale,
    // Bars carry their value on top instead of a value axis, as on the web slide.
    ...(!trend && {
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFontFace: MONO,
      dataLabelFontSize: PT.base,
      dataLabelFontBold: true,
      dataLabelColor: c.ink,
      valAxisHidden: true,
      valGridLine: { style: "none" },
    }),
  });
}

/** Draws a trend or bar plot and its surrounding slide text. */
export function drawPlot(sheet: Sheet, d: ChartSlide, body: Area): void {
  const { slide: s, c } = sheet;
  const layout = plotLayout(sheet, d, body);
  const { frame, axes, trend, points, marking } = layout;
  sheet.card(frame.card, c.plainCard);
  if (d.annotation)
    sheet.box(d.annotation, frame.annotation, { size: PT.base, color: c.purple, align: "center" });
  for (const { text, area, o } of axes.labels) if (text) sheet.box(text, area, o);
  if (trend && points)
    s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
      ...trend.g,
      fill: { color: mixColor(c.teal, c.card, 0.07) },
      line: { type: "none" },
      points,
    });
  drawNativePlot(sheet, layout);
  // A marked trend's names, set under its points once the chart is drawn.
  if (!marking) return;
  const { guide, names } = marking;
  s.addShape("line", { ...guide, line: { color: c.teal, width: 1.5, dashType: "dash" } });
  for (const { name, area, bold } of names)
    sheet.box(name, area, { size: PT.sm, color: bold ? c.teal : c.muted, bold, align: "center" });
}
