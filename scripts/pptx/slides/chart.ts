import type PptxGenJS from "pptxgenjs";
import type { Slide } from "../../../types/slide";
import { trendTicks } from "../../../components/slides/ChartPlots";
import { header } from "../chrome";
import { MONO, SANS } from "../faces";
import { textWidth } from "../fit";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { W, EDGE, BOTTOM, CW, PT, LEADING, REM, BODY, type Area } from "../stage";
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

/** A function over [0, 1] drawn as a polyline in the area, its values in [0, 1] from the bottom,
 *  with the area under it tinted. */
function curve(sheet: Sheet, g: Area, f: (t: number) => number) {
  const { slide: s } = sheet;
  const n = 100;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: (i / (n - 1)) * g.w,
    y: g.h - f(i / (n - 1)) * g.h,
  }));
  s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
    x: g.x,
    y: g.y,
    w: g.w,
    h: g.h,
    fill: { color: mixColor(sheet.c.teal, sheet.c.bg, 0.18) },
    line: { type: "none" },
    points: [{ x: 0, y: g.h, moveTo: true }, ...pts, { x: g.w, y: g.h }, { close: true }],
  });
  s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
    x: g.x,
    y: g.y,
    w: g.w,
    h: g.h,
    line: { color: sheet.c.teal, width: 2.25 },
    points: [{ ...pts[0], moveTo: true }, ...pts.slice(1)],
  });
}

export function drawChart(sheet: Sheet, d: Extract<Slide, { type: "chart" }>): void {
  const { slide: s } = sheet;
  const { pptx } = sheet.out;
  const { c } = sheet;
  const y = header(sheet, d);
  // The web's `Annotation`, under the card or the drawing.
  const annotate = (x: number, top: number, w: number, h: number) =>
    d.annotation &&
    sheet.box(
      d.annotation,
      { x, y: top, w, h },
      {
        size: PT.base,
        color: c.purple,
        align: "center",
      },
    );
  if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) {
    const data = d.data;
    const trend = d.variant === "trend";
    const labels = data.map((p) => p.name);
    // A marked trend is measured up to the point and planned from it, both holding the point,
    // as on the web slide; `finishChart` dashes the planned half once the chart is written.
    const now = trend ? data.findIndex((p) => p.name === d.currentMarker) : -1;
    const halves = (name: string, pick: (p: (typeof data)[number]) => number | null) => [
      { name, labels, values: data.map((p, i) => (now < 0 || i <= now ? pick(p) : null)) },
      ...(now < 0
        ? []
        : [
            {
              name: `${name} (${sheet.words.planned})`,
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
    ] as { name: string; labels: string[]; values: number[] }[];
    const hues = two ? [c.teal, c.purple] : [c.teal];
    // The card as `ChartFrame` draws it, the legend above it and the annotation below, centred
    // in the body as the web centres them; a long annotation may take two lines.
    const a = BODY(y);
    const legend = trend && !!(d.seriesLabel || d.series2Label);
    const above = legend ? CHART.legend : 0;
    const below = d.annotation ? CHART.note + CHART.noteLine : 0;
    const h = Math.min(CHART.h, a.h - above - below - (d.annotation ? CHART.noteLine : 0));
    const f = {
      x: (W - CHART.w) / 2,
      y: a.y + above + Math.max(0, (a.h - above - h - below) / 2),
      w: CHART.w,
      h,
    };
    sheet.card(f, sheet.c.plainCard);
    annotate(f.x, f.y + f.h + CHART.note, f.w, 2 * CHART.noteLine);
    // `Axes`: the y label and the note over the plot, the x label under it.
    const inner = {
      x: f.x + CHART.pad,
      y: f.y + CHART.pad,
      w: f.w - 2 * CHART.pad,
      h: f.h - 2 * CHART.pad,
    };
    const labelO: BoxOpts = { size: PT.sm, color: c.muted };
    const label = (
      text: string | undefined,
      x: number,
      top: number,
      w: number,
      align: BoxOpts["align"],
      h = CHART.line,
    ) => text && sheet.box(text, { x, y: top, w, h }, { ...labelO, align });
    const note = trend ? d.futureNote : undefined;
    // The y label and the note in one row 2 rem apart, each shrinking by its share of the
    // overflow and wrapping, as the web's flex row sets them.
    const gapX = 2 * REM;
    const basis = [d.yLabel, note].map((t) => (t ? textWidth(t, labelO) + 0.02 : 0));
    const over = Math.max(0, basis[0] + basis[1] + gapX - inner.w);
    const sum = basis[0] + basis[1] || 1;
    const [yw, nw] = basis.map((b) => b - (over * b) / sum);
    const lineH = (n: number) => Math.max(1, n) * CHART.line;
    const lines = (t: string | undefined, w: number) =>
      t ? Math.round(sheet.need(t, w, labelO) / ((PT.sm * LEADING.body) / 72)) : 0;
    const headH = lineH(Math.max(lines(d.yLabel, yw), lines(note, nw)));
    const head = d.yLabel || note ? headH + CHART.underHead : 0;
    label(d.yLabel, inner.x, inner.y, yw, "left", headH);
    label(note, inner.x + inner.w - nw, inner.y, nw, "right", headH);
    const foot = d.xLabel ? CHART.line + CHART.overFoot : 0;
    label(d.xLabel, inner.x, inner.y + inner.h - CHART.line, inner.w, "center");
    // The chart reaches up over the card for its legend, which PowerPoint sets at its top.
    const plot = { x: inner.x, y: inner.y + head, w: inner.w, h: inner.h - head - foot };
    const top = legend ? f.y - CHART.legend : plot.y;
    const r = { ...plot, y: top, h: plot.y + plot.h - top };
    let scale = {};
    // A marked trend's names, set under its points once the chart is drawn.
    let names = () => {};
    if (trend) {
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
      const xAt = (i: number) => (i / Math.max(1, data.length - 1)) * g.w;
      const yAt = (v: number) => ((hi - v) / (hi - lo)) * g.h;
      scale = {
        layout: { x: (g.x - r.x) / r.w, y: (g.y - r.y) / r.h, w: g.w / r.w, h: g.h / r.h },
        valAxisMinVal: lo,
        valAxisMaxVal: hi,
        valAxisMajorUnit: ticks[1] - lo,
      };
      // recharts fills a lone series' measured part down to 0; a chart's area series would
      // fall to zero after its last value, so the fill is a shape under the chart's plot.
      // A chart's category names take one style, so a marked trend sets each as text under its
      // point, the marked one in teal and bold as the web's tick, and a dashed guide from the dot
      // down to the axis.
      if (now >= 0)
        names = () => {
          const wide = g.w / Math.max(1, data.length - 1);
          // From under the dot, a marker of 11 pt, so the guide stays behind it as on the web.
          const dot = g.y + yAt(data[now].value) + 11 / 72 / 2;
          s.addShape("line", {
            x: g.x + xAt(now),
            y: dot,
            w: 0.001,
            h: Math.max(0, g.y + g.h - dot),
            line: { color: c.teal, width: 1.5, dashType: "dash" },
          });
          labels.forEach((name, i) => {
            const lw = Math.min(wide, 2 * edge(i) + 0.1);
            sheet.box(
              name,
              { x: g.x + xAt(i) - lw / 2, y: g.y + g.h + CHART.tick, w: lw, h: CHART.line },
              {
                size: PT.sm,
                color: i === now ? c.teal : c.muted,
                bold: i === now,
                align: "center",
              },
            );
          });
        };
      const filled = now < 0 ? data.length : now + 1;
      if (!two && filled > 1) {
        s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
          ...g,
          fill: { color: mixColor(c.teal, c.card, 0.07) },
          line: { type: "none" },
          points: [
            { x: 0, y: yAt(0), moveTo: true },
            ...data.slice(0, filled).map((p, i) => ({ x: xAt(i), y: yAt(p.value) })),
            { x: xAt(filled - 1), y: yAt(0) },
            { close: true },
          ],
        });
      }
    }
    // A bar's names wrap level at their band in the first of the web's steps where every word
    // fits it, else tilt at the last, as `tickLayout` sets them.
    const band = (plot.w / data.length) * 0.9;
    const step = TICK_STEPS.find(
      (pt) =>
        Math.max(...labels.flatMap((l) => l.split(" ").map((w) => textWidth(w, { size: pt })))) <=
        band,
    );
    // The web's legend has an entry for a named series only.
    const perSeries = now < 0 ? 1 : 2;
    const unnamed = [d.seriesLabel, ...(two ? [d.series2Label] : [])].flatMap((name, i) =>
      name ? [] : [i * perSeries],
    );
    sheet.out.charts.set(
      sheet.out.charts.size + 1,
      trend ? { now, unnamed } : { level: step !== undefined },
    );
    s.addChart(trend ? pptx.ChartType.line : pptx.ChartType.bar, series, {
      ...r,
      chartColors: now < 0 ? hues : hues.flatMap((hue) => [hue, hue]),
      lineSize: 2.5,
      lineDataSymbol: "none",
      barDir: "col",
      showLegend: legend,
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
    names();
    return;
  }
  const a = { ...BODY(y), h: BOTTOM - y - (d.annotation ? 0.4 : 0) };
  if (d.variant === "cycle") {
    // The adoption curve as the web draws it: a bell curve, its area split into the segments'
    // shares, each segment's label and share under it.
    const segs = d.segments ?? [];
    const g = { x: a.x + 1, y: a.y + 0.3, w: a.w - 2, h: a.h - 1.1 };
    const bell = (t: number) => Math.exp(-0.5 * ((t - 0.5) / 0.18) ** 2);
    curve(sheet, g, bell);
    let acc = 0;
    segs.forEach((seg, i) => {
      const from = acc;
      acc += seg.percentage / 100;
      if (i < segs.length - 1) {
        const h = bell(acc) * g.h;
        s.addShape("line", {
          x: g.x + acc * g.w,
          y: g.y + g.h - h,
          w: 0.001,
          h,
          line: { color: c.bg, width: 1.5, dashType: "dash" },
        });
      }
      const cur = i === d.currentSegmentIndex;
      sheet.box(
        [
          { runs: [{ text: seg.label }], bold: cur },
          { runs: [{ text: `${seg.percentage}%`, options: { color: c.muted } }] },
        ],
        { x: g.x + from * g.w, y: g.y + g.h + 0.1, w: (acc - from) * g.w, h: 0.6 },
        { size: PT.sm, color: cur ? c.teal : c.ink, align: "center" },
      );
    });
  } else {
    // The graph variant as the web draws it: a curve rising to the right, a marked point at 60 of
    // its 100 steps, the axis labels beside it.
    const g = { x: a.x + 1.5, y: a.y + 0.2, w: a.w - 3, h: a.h - 0.8 };
    curve(sheet, g, (t) => Math.exp(t * 3) / Math.exp(3));
    s.addShape("line", {
      x: g.x,
      y: g.y + g.h,
      w: g.w,
      h: 0.001,
      line: { color: c.muted, width: 1 },
    });
    s.addShape("line", { x: g.x, y: g.y, w: 0.001, h: g.h, line: { color: c.muted, width: 1 } });
    if (d.xLabel)
      sheet.box(
        d.xLabel,
        { x: g.x, y: g.y + g.h + 0.1, w: g.w, h: 0.3 },
        {
          size: PT.sm,
          color: c.muted,
          align: "center",
        },
      );
    if (d.yLabel)
      sheet.box(
        d.yLabel,
        { x: a.x, y: g.y + g.h / 2 - 0.3, w: 1.4, h: 0.6 },
        {
          size: PT.sm,
          color: c.muted,
          align: "right",
          valign: "middle",
        },
      );
    if (d.futureNote)
      sheet.box(
        d.futureNote,
        { x: g.x + 0.1, y: g.y, w: g.w / 2, h: 0.3 },
        { size: PT.sm, color: c.muted },
      );
    if (d.currentMarker) {
      const t = 60 / 99;
      const mx = g.x + t * g.w;
      const my = g.y + g.h - (Math.exp(t * 3) / Math.exp(3)) * g.h;
      s.addShape("ellipse", {
        x: mx - 0.09,
        y: my - 0.09,
        w: 0.18,
        h: 0.18,
        fill: { color: c.teal },
        line: { color: c.card, width: 1.5 },
      });
      sheet.box(
        d.currentMarker,
        { x: mx - 1.6, y: my - 0.4, w: 1.5, h: 0.3 },
        {
          size: PT.sm,
          mono: true,
          bold: true,
          color: c.teal,
          align: "right",
        },
      );
    }
  }
  annotate(EDGE, BOTTOM - 0.35, CW, 0.35);
}
