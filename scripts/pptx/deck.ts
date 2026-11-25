import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import type { MarkerTone, Grounded, Presentation, RoadmapItem, Slide } from "../../types/slide";
import { trendTicks } from "../../components/slides/ChartPlots";
import { groundOf } from "../../components/slides/SlideShell";
import { HW_LOGO } from "../../lib/logo";
import { isDeepDive } from "../../lib/slide-framing";
import { profileLabel } from "../../lib/link-labels";
import { claimParts, companiesWithLogo } from "../../lib/closing-copy";
import { closingClaim, deckLang } from "../../lib/slide-utils";
import { personAccent, teamTypesDrawn } from "../../lib/people-slides";
import { centredMark, footer, footerOf, frame, header } from "./chrome";
import { chipAdvance, chipArea, drawChip, type Chip } from "./chips";
import { brandCut } from "./images";
import { profileLink } from "./people";
import { cellAreas } from "./cells";
import { MONO, PITCH, SANS } from "./faces";
import { textWidth } from "./fit";
import { Look } from "./look";
import { checkSlide } from "./overflow";
import { hex, mixColor, palette, THEME } from "./palette";
import { Sheet, drySheet, type ChartFix, type Output, type RowHeight } from "./sheet";
import { SLIDES, slideDrawn } from "./slides";
import {
  W,
  H,
  EDGE,
  TOP,
  BOTTOM,
  CW,
  PT,
  LEADING,
  TITLE,
  CORNER,
  REM,
  BODY,
  spacing,
  type Area,
} from "./stage";
import {
  HUE_OF_MARKER,
  MARKER_SQUARE,
  CAPS,
  caps,
  md,
  literal,
  type Para,
  type BoxOpts,
} from "./text";

/** A team-topology slide's body as `TeamTopologySlide` draws it, the Team Shape Templates in brand
 *  colours: the enabling teams in a row of columns on the left, the stream teams beside them one
 *  per row with their roles after the name where they fit, the complicated subsystems as octagons
 *  under them, the platform teams side by side in a dotted frame, then the legend and caption.
 *  Draws where `s` is given; returns the height at scale k. */
function topology(
  sheet: Sheet,
  d: Extract<Slide, { type: "team-topology" }>,
  a: Area,
  k: number,
): number {
  const { slide: s } = sheet;
  const { c } = sheet;
  const sp = (v: number) => spacing(v, k);
  const bd = (3 / 144) * k;
  // Sizes as drawn, in the half points pptxgenjs writes, so a box sized to its text holds it.
  const pt = (v: number) => Math.round(v * k * 2) / 2;
  const titleO: BoxOpts = { size: pt(PT.h4), ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: pt(PT.h4), color: c.ink, line: 1.375 };
  const hue = { enabling: c.purple, stream: c.teal, platform: c.teal, subsystem: c.neutral };
  const shape = (
    type: keyof typeof hue,
    x: number,
    y: number,
    w: number,
    h: number,
    r = CORNER * k,
  ) =>
    s?.addShape(
      type === "subsystem" ? "octagon" : r === CORNER * k ? "round2DiagRect" : "roundRect",
      {
        x,
        y,
        w,
        h,
        rectRadius:
          type === "subsystem" ? Math.min(0.9 * REM * k, h / 2) : Math.min(r, w / 2, h / 2),
        fill: type === "platform" ? { type: "none" } : { color: mixColor(hue[type], c.bg, 0.07) },
        line: {
          color: hue[type],
          width: 1.5 * k,
          ...(type === "platform" ? { dashType: "sysDot" as const } : {}),
        },
      },
    );
  // A column of paragraphs in width w, drawn at x, y where both are given; returns its height.
  const column = (parts: [Para, BoxOpts, number][], w: number, x?: number, y = 0) => {
    let h = 0;
    for (const [p, o, gap] of parts) {
      const ph = sheet.need(p, w, o);
      h += gap;
      if (!sheet.dry && x !== undefined) sheet.box(p, { x, y: y + h, w, h: ph }, o);
      h += ph;
    }
    return h;
  };
  const name = (text: string, color: string): Para => ({ runs: md(text, c, { color }) });
  // A team's roles as one line, each whole behind its own bullet, so a wrap falls between roles.
  const roles = (labels: string[]): Para => ({
    runs: labels.flatMap((l, i) => [
      { text: `${i ? "   " : ""}\u2022\u00a0`, options: { color: c.muted, bold: true } },
      { text: l.replace(/ /g, "\u00a0"), options: { color: c.tealDark, bold: true } },
    ]),
    balance: true,
  });

  // The enabling columns: 14 rem wide, wider where a word needs it, as `md:w-56 md:min-w-min`.
  const enW = d.enabling.map((t) => {
    const words = [
      ...t.name.split(/\s+/).map((w) => textWidth(w, titleO)),
      ...t.experts.flatMap((e) => e.split(/\s+/).map((w) => textWidth(w, textO))),
    ];
    return Math.max(sp(56), Math.max(...words) + 0.02 + 2 * sp(4) + 2 * bd);
  });
  const enParts = (t: (typeof d.enabling)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.purple), titleO, 0],
    ...t.experts.map((e, i): [Para, BoxOpts, number] => [
      name(e, c.ink),
      { ...textO, line: 1.25 },
      sp(i ? 2 : 1),
    ]),
  ];
  const enH = d.enabling.map(
    (t, i) => column(enParts(t), enW[i] - 2 * sp(4) - 2 * bd) + 2 * sp(3) + 2 * bd,
  );
  const mx = a.x + enW.reduce((sum, w) => sum + w + sp(4), 0);
  const mw = a.x + a.w - mx;

  // The stream teams, a row each: the roles after the name where both fit one line.
  const sIn = mw - 2 * sp(5) - 2 * bd;
  const streams = d.streamAligned.map((t) => {
    const nw = textWidth(t.name, titleO) + 0.02;
    const r = roles(t.roles);
    const rw = textWidth(r.runs.map((x) => x.text).join(""), { size: textO.size, bold: true });
    const beside = t.roles.length > 0 && nw + sp(6) + rw <= sIn;
    const nh = sheet.need(name(t.name, c.ink), sIn, titleO);
    const rh = t.roles.length ? sheet.need(r, beside ? rw + 0.02 : sIn, textO) : 0;
    return {
      t,
      r,
      nw,
      rw,
      beside,
      nh,
      rh,
      h: 2 * sp(3) + 2 * bd + (beside ? Math.max(nh, rh) : nh + (rh && sp(2) + rh)),
    };
  });
  const subs = d.complicatedSubsystem ?? [];
  const subW = subs.length ? (mw - (subs.length - 1) * sp(4)) / subs.length : 0;
  const subParts = (t: (typeof subs)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.ink), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(0.5)] as [Para, BoxOpts, number]]
      : []),
  ];
  const subIn = subW - 2 * sp(7) - 2 * bd;
  const subH = subs.length
    ? Math.max(...subs.map((t) => column(subParts(t), subIn))) + 2 * sp(3) + 2 * bd
    : 0;
  const mainH = [...streams.map((st) => st.h), ...(subs.length ? [subH] : [])].reduce(
    (sum, h, i) => sum + h + (i ? sp(3) : 0),
    0,
  );
  const rowH = d.enabling.length || streams.length || subs.length ? Math.max(mainH, ...enH) : 0;

  const pw = d.platform.length
    ? (a.w - 2 * sp(3) - 2 * bd - (d.platform.length - 1) * sp(4)) / d.platform.length
    : 0;
  const platParts = (t: (typeof d.platform)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.tealDark), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(1.5)] as [Para, BoxOpts, number]]
      : []),
    ...(t.roles?.length ? [[roles(t.roles), textO, sp(1.5)] as [Para, BoxOpts, number]] : []),
  ];
  const platH = d.platform.length
    ? Math.max(...d.platform.map((t) => column(platParts(t), pw - 2 * sp(2)))) +
      2 * sp(1) +
      2 * sp(3) +
      2 * bd
    : 0;

  const words = sheet.words.teams;
  const legO: BoxOpts = { size: pt(17.33), color: c.muted, line: 1.4, valign: "middle" };
  // The legend's items in rows as `flex-wrap` sets them: x and row of each.
  const legRow = Math.max(sp(8), (legO.size * 1.4) / 72);
  const legend: {
    type: ReturnType<typeof teamTypesDrawn>[number];
    x: number;
    row: number;
    tw: number;
  }[] = [];
  if (d.legend !== false)
    for (const type of teamTypesDrawn(d)) {
      const tw = textWidth(words[type], legO) + 0.02;
      const last = legend.at(-1);
      let lx = last ? last.x + sp(17) + last.tw + sp(10) : 0;
      let row = last?.row ?? 0;
      if (last && lx + sp(17) + tw > a.w) [lx, row] = [0, row + 1];
      legend.push({ type, x: lx, row, tw });
    }
  const legRows = legend.length ? legend.at(-1)!.row + 1 : 0;
  const legH = legRows && sp(4) + legRows * legRow + (legRows - 1) * sp(3);
  const capO: BoxOpts = { size: pt(PT.h4), color: c.muted, line: 1.4 };
  const capH = d.caption ? sp(2) + sheet.need(d.caption, a.w, capO) : 0;
  const rows = [rowH, platH, legH, capH].filter(Boolean);
  const total = rows.reduce((sum, h) => sum + h, 0) + (rows.length - 1) * sp(4);
  if (sheet.dry) return total;

  let y = a.y;
  let x = a.x;
  d.enabling.forEach((t, i) => {
    shape("enabling", x, y, enW[i], rowH);
    const inner = enW[i] - 2 * sp(4) - 2 * bd;
    column(enParts(t), inner, x + bd + sp(4), y + (rowH - enH[i]) / 2 + bd + sp(3));
    x += enW[i] + sp(4);
  });
  let sy = y;
  for (const st of streams) {
    shape("stream", mx, sy, mw, st.h);
    const tx = mx + bd + sp(5);
    const ty = sy + bd + sp(3);
    const line = st.beside ? Math.max(st.nh, st.rh) : st.nh;
    sheet.box(
      name(st.t.name, c.ink),
      { x: tx, y: ty + (line - st.nh) / 2, w: st.beside ? st.nw : sIn, h: st.nh },
      titleO,
    );
    if (st.t.roles.length)
      sheet.box(
        st.r,
        {
          x: st.beside ? tx + st.nw + sp(6) : tx,
          y: st.beside ? ty + (line - st.rh) / 2 : ty + st.nh + sp(2),
          w: st.beside ? st.rw + 0.02 : sIn,
          h: st.rh,
        },
        textO,
      );
    sy += st.h + sp(3);
  }
  subs.forEach((t, i) => {
    const ox = mx + i * (subW + sp(4));
    shape("subsystem", ox, sy, subW, subH);
    column(subParts(t), subIn, ox + bd + sp(7), sy + (subH - column(subParts(t), subIn)) / 2);
  });
  if (rowH) y += rowH + sp(4);
  if (platH) {
    shape("platform", a.x, y, a.w, platH);
    d.platform.forEach((t, i) =>
      column(
        platParts(t),
        pw - 2 * sp(2),
        a.x + bd + sp(3) + i * (pw + sp(4)) + sp(2),
        y + bd + sp(3) + sp(1),
      ),
    );
    y += platH + sp(4);
  }
  if (legRows) {
    // Each type drawn here, in the order drawn, a swatch before its name.
    for (const it of legend) {
      const ly = y + sp(4) + it.row * (legRow + sp(3));
      shape(it.type, a.x + it.x, ly + (legRow - sp(8)) / 2, sp(14), sp(8), (10 / 144) * k);
      sheet.box(words[it.type], { x: a.x + it.x + sp(17), y: ly, w: it.tw, h: legRow }, legO);
    }
    y += legH + sp(4);
  }
  if (d.caption) sheet.box(d.caption, { x: a.x, y: y + sp(2), w: a.w, h: capH - sp(2) }, capO);
  return total;
}

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
const GANTT_ROWS: RowHeight = { what: "gantt", cap: 30 * 0.25 * REM, floor: 0.15 };

type Render = (sheet: Sheet, slide: never) => void;

type RenderedSlide = Exclude<
  Slide,
  | { type: "evolution" | "media" | "overview" | "deep-dive-divider" | "dual-pill-overview" }
  | { type: "grid"; variant?: "pillars" | "stats" }
  | { type: "comparison"; variant: "guidance" | "positions" }
>;

const RENDER: {
  [K in RenderedSlide["type"]]: (sheet: Sheet, slide: Extract<RenderedSlide, { type: K }>) => void;
} = {
  ...SLIDES,

  chart(sheet, d) {
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
  },

  question(sheet, d) {
    // As QuestionSlide in print: the headline as a display heading, under it the options as white
    // cards in a 56 rem column, each its letter, its text and its count, centred above the footer band.
    const { c } = sheet;
    const head: BoxOpts = {
      size: PT.s6,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
      align: "center",
    };
    const hp: Para = { ...literal(d.headline), balance: true };
    const hh = sheet.need(hp, CW, head);
    const w = Math.min(CW, 56 * REM);
    const oh = 2.5 * REM + (PT.h4 * 1.4) / 72;
    const total = hh + 3.5 * REM + d.options.length * (oh + REM) - REM;
    const top = Math.max(TOP, (BOTTOM - total) / 2);
    sheet.box(hp, { x: EDGE, y: top, w: CW, h: hh }, head);
    const x = (W - w) / 2;
    d.options.forEach((op, i) => {
      const oy = top + hh + 3.5 * REM + i * (oh + REM);
      sheet.card({ x, y: oy, w, h: oh }, sheet.c.plainCard);
      const mid = { valign: "middle" } as const;
      sheet.box(
        literal(op.label),
        { x: x + 1.5 * REM, y: oy, w: 2 * REM, h: oh },
        {
          size: 14,
          mono: true,
          bold: true,
          color: c.muted,
          ...mid,
        },
      );
      sheet.box(
        op.text,
        { x: x + 4.5 * REM, y: oy, w: w - 10 * REM, h: oh },
        {
          size: 17.5,
          color: c.ink,
          line: 1.4,
          ...mid,
        },
      );
      sheet.box(
        literal("0"),
        { x: x + w - 5.5 * REM, y: oy, w: 4 * REM, h: oh },
        {
          size: PT.h4,
          mono: true,
          bold: true,
          color: c.teal,
          align: "right",
          ...mid,
        },
      );
    });
  },

  transition(sheet, d) {
    const { c } = sheet;
    const paras: Para[] = [];
    if (d.preText)
      paras.push({
        runs: [caps(d.preText, { color: c.teal })],
        mono: true,
        bold: true,
        rel: PT.lead / PT.display,
        after: 14,
      });
    paras.push({ ...literal(d.headline), mono: true, bold: true, after: 14 });
    if (d.subtitle) paras.push({ ...literal(d.subtitle), rel: PT.lead / PT.display });
    const speakerH = d.speakerName ? 1.1 : 0;
    const o: BoxOpts = {
      size: PT.display,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.1,
      floor: 0.5,
    };
    const th = Math.min(BOTTOM - TOP - speakerH, sheet.need(paras, CW - 1, o) + 0.2);
    const ty = TOP + (BOTTOM - TOP - th - speakerH) / 2;
    sheet.box(paras, { x: EDGE + 0.5, y: ty, w: CW - 1, h: th }, o);
    if (d.speakerName) {
      const sw = Math.max(2.6, (d.speakerName.length * PT.h3 * 0.62) / 72 + 0.8);
      sheet.card({ x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 }, sheet.c.plainCard);
      sheet.box(
        [
          {
            runs: [{ text: d.speakerName, options: { color: c.teal } }],
            mono: true,
            bold: true,
            after: 2,
          },
          ...(d.speakerCompany ? [{ runs: [{ text: d.speakerCompany }], rel: 0.65 }] : []),
        ],
        { x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 },
        { size: PT.h3, color: c.ink, align: "center", valign: "middle" },
      );
    }
  },

  closing(sheet, d) {
    const { c } = sheet;
    if (d.variant === "discussion") {
      const y = header(sheet, { headline: d.headline ?? d.line1 ?? sheet.words.discussion });
      // Each seed question on its own card, as the web's: 1.25 rem over and under it, 2 rem
      // beside, 1.5 rem between the cards, the question muted.
      const a = BODY(y);
      const [padY, padX, gap] = [1.25 * REM, 2 * REM, 1.5 * REM];
      const o: BoxOpts = { size: PT.h4, color: c.muted, line: 1.35 };
      const qs = d.seedQuestions ?? [];
      const hs = qs.map((q) => sheet.need(literal(q), a.w - 2 * padX, o));
      const total = hs.reduce((sum, h) => sum + h + 2 * padY, 0) + Math.max(0, qs.length - 1) * gap;
      let qy = a.y + Math.max(0, a.h - total) / 2.25;
      qs.forEach((q, i) => {
        sheet.card({ x: a.x, y: qy, w: a.w, h: hs[i] + 2 * padY }, sheet.c.plainCard);
        sheet.box(literal(q), { x: a.x + padX, y: qy + padY, w: a.w - 2 * padX, h: hs[i] }, o);
        qy += hs[i] + 2 * padY + gap;
      });
      return;
    }
    // As ContactVariant: the line, the mark row, the speakers and the closing lines 3.5 rem apart,
    // the column centred in the slide; drawn once on DRY to measure it.
    const gap = 3.5 * REM;
    const column = (sheet: Sheet, y: number) => {
      const { slide: s } = sheet;
      const head = d.line1;
      if (head) {
        const o: BoxOpts = {
          size: PT.display,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
          align: "center",
        };
        const hh = sheet.need(literal(head), CW, o);
        sheet.box({ ...literal(head), balance: true }, { x: EDGE, y, w: CW, h: hh }, o);
        y += hh + gap;
      }
      const speakers = d.speakers ?? [];
      if (centredMark(d)) {
        // The web's contact slide without portraits: the lockup in the centre column, each speaker's
        // name and contact lines under it.
        const lockH = 91.7 / 144;
        const [path, ratio] = brandCut(`lockup${sheet.dark ? "-night" : ""}`);
        const lockW = lockH * ratio;
        // As on the web: each partner's logo at the lockup's height, a × after it.
        const partners = d.partners ?? [];
        const times = 0.5;
        const pad = 0.35;
        const partnerW = partners.map((p) => (lockH * p.width) / p.height);
        let x = (W - lockW - partnerW.reduce((sum, w) => sum + w + 2 * pad + times, 0)) / 2;
        partners.forEach((p, i) => {
          sheet.picture(p.src, { x, y, w: partnerW[i], h: lockH }, { alt: p.alt ?? p.company });
          sheet.box(
            "×",
            { x: x + partnerW[i] + pad, y, w: times, h: lockH },
            {
              size: PT.s6,
              color: c.muted,
              align: "center",
              valign: "middle",
            },
          );
          x += partnerW[i] + 2 * pad + times;
        });
        s.addImage({
          path,
          x,
          y,
          w: lockW,
          h: lockH,
          altText: HW_LOGO.alt,
        });
        y += lockH + gap;
        const shown = companiesWithLogo(d);
        for (const sp of speakers) {
          const paras: Para[] = [
            { runs: [{ text: sp.name }], mono: true, bold: true, rel: PT.h4 / 17.5, after: 2 },
            ...(shown.has(sp.company.toLowerCase())
              ? []
              : [
                  {
                    runs: [caps(sp.company, { color: c.muted })],
                    rel: 0.8,
                    after: 2,
                  },
                ]),
            ...(sp.contact
              ? [
                  {
                    runs: [
                      {
                        text: sp.contact,
                        options: {
                          color: c.teal,
                          ...(sp.contact.includes("@")
                            ? { hyperlink: { url: `mailto:${sp.contact}` } }
                            : {}),
                        },
                      },
                    ],
                  },
                ]
              : []),
            ...(sp.linkedIn
              ? [
                  {
                    runs: [
                      {
                        text: profileLabel(sp.linkedIn),
                        options: { color: c.teal, hyperlink: { url: sp.linkedIn } },
                      },
                    ],
                  },
                ]
              : []),
          ];
          const po: BoxOpts = { size: 17.5, color: c.ink, line: 1.4, align: "center" };
          const ph = sheet.need(paras, CW, po);
          sheet.box(paras, { x: EDGE, y, w: CW, h: ph }, po);
          y += ph + 2 * REM;
        }
        y += gap - 2 * REM;
      } else if (speakers.length) {
        const sw = Math.min(3.2, CW / speakers.length);
        // The LinkedIn address under the contact, a line at 0.8 of the size.
        const linked = speakers.some((sp) => sp.linkedIn) ? 0.3 : 0;
        const sx = (W - sw * speakers.length) / 2;
        speakers.forEach((sp, i) => {
          const x = sx + i * sw;
          const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
          sheet.portrait(sp, { x: x + sw / 2 - 0.55, y, d: 1.1 }, tone);
          sheet.box(
            [
              { runs: [{ text: sp.name }], mono: true, bold: true, after: 2 },
              {
                runs: [caps(sp.company, { color: tone })],
                mono: true,
                bold: true,
                rel: 0.7,
                after: 6,
              },
              ...(sp.contact
                ? [
                    {
                      runs: [
                        {
                          text: sp.contact,
                          options: {
                            color: tone,
                            ...(sp.contact.includes("@")
                              ? { hyperlink: { url: `mailto:${sp.contact}` } }
                              : {}),
                          },
                        },
                      ],
                      rel: 0.8,
                    },
                  ]
                : []),
              ...(sp.linkedIn ? [{ ...profileLink(sp.linkedIn, c), rel: 0.8 }] : []),
            ],
            { x, y: y + 1.2, w: sw, h: 1 + linked },
            { size: PT.h4, color: c.ink, align: "center" },
          );
        });
        y += 2.35 + linked + gap;
      }
      const tail: Para[] = [];
      const claim = closingClaim(d, sheet.lang);
      if (claim) {
        // The claim in muted ink, the word brand names for it in teal, one step below a quote's
        // lead, as ClosingSlide draws it.
        const [before, word, after] = claimParts(claim);
        tail.push({
          rel: PT.h4 / PT.lead,
          runs: [
            { text: before, options: { color: c.muted } },
            { text: word, options: { color: c.teal } },
            { text: after, options: { color: c.muted } },
          ].filter((r) => r.text),
          mono: true,
          bold: true,
          after: gap * 72,
          align: "center",
          balance: true,
        });
      }
      if (d.closingQuote) {
        const mark = { color: mixColor(c.teal, c.bg, 0.7) };
        tail.push({
          runs: [
            { text: "“", options: mark },
            ...md(d.closingQuote, c, { color: c.muted }),
            { text: "”", options: mark },
          ],
          mono: true,
          bold: true,
          align: "center",
          balance: true,
        });
      }
      if (tail.length) {
        const o: BoxOpts = { size: PT.lead, color: c.muted, line: 1.25, tracking: -0.025 };
        // max-w-7xl less the web line's 5vw sides (--slide-closing-side), EDGE at the 1920 stage.
        const tw = Math.min(CW, 80 * REM) - 2 * EDGE;
        const th = sheet.need(tail, tw, o);
        sheet.box(tail, { x: (W - tw) / 2, y, w: tw, h: th }, o);
        return y + th;
      }
      return y - gap;
    };
    // The measuring pass warns as the drawing pass will: its warnings are dropped.
    const height = column(drySheet(sheet), 0);
    column(sheet, (H - height) / 2);
  },

  // As the web's RoadmapSlide: each column a card holding its items, or its phases as groups of
  // rows under a caps label.
  roadmap(sheet, d) {
    const { c } = sheet;
    // A row's own marker colour: `tone`, or the class its deprecated `dotColor` names.
    const marker = (it: Pick<RoadmapItem, "tone" | "dotColor">) => {
      const t = it.tone ?? it.dotColor?.slice(3);
      return t ? (c[THEME[t as MarkerTone]] as string) : undefined;
    };
    const y = header(sheet, d);
    cellAreas(d.columns.length, BODY(y), 0.35).forEach((r, i) => {
      const col = d.columns[i];
      const tone = col.accent === "deepdive" ? c.purple : c.teal;
      const groups: {
        label?: string;
        hue: string;
        items: (RoadmapItem & { number?: number })[];
      }[] = col.phases
        ? col.phases.map((p) => ({
            label: p.label,
            hue: c[THEME[p.theme ?? "secondary"]] as string,
            items: p.items,
          }))
        : [{ hue: tone, items: col.items ?? [] }];
      sheet.card(r, { fill: mixColor(tone, c.bg, 0.05), line: c.border });
      sheet.rect({ x: r.x + 0.15, y: r.y, w: r.w - 0.3, h: 0.05 }, tone);
      const label: Chip = {
        text: col.label,
        size: PT.label * 0.85,
        fill: mixColor(tone, c.bg, 0.15),
        color: tone,
      };
      drawChip(sheet, label, chipArea(label, { x: r.x + 0.25, y: r.y + 0.25 }));
      sheet.box(
        [
          { runs: md(col.title, c), mono: true, bold: true, rel: PT.h3 / PT.base, after: 4 },
          ...(col.subtitle ? [{ runs: md(col.subtitle, c, { color: c.muted }), after: 10 }] : []),
          ...groups.flatMap((g) => [
            ...(g.label
              ? [
                  {
                    runs: [caps(g.label, { color: g.hue })],
                    mono: true,
                    bold: true,
                    rel: 0.8,
                    after: 4,
                  },
                ]
              : []),
            ...g.items.flatMap((it) => [
              {
                runs: [
                  it.number === undefined
                    ? { text: "•  ", options: { color: marker(it) ?? g.hue } }
                    : {
                        text: `${it.number}  `,
                        options: { color: g.hue, bold: true, fontFace: MONO },
                      },
                  { text: it.title, options: { bold: true, fontFace: MONO } },
                ],
                after: 2,
              },
              ...(it.description
                ? [{ runs: md(it.description, c, { color: c.muted }), after: 8 }]
                : []),
            ]),
          ]),
        ],
        { x: r.x + 0.25, y: r.y + 0.65, w: r.w - 0.5, h: r.h - 0.8 },
        { size: PT.base, color: c.ink },
      );
    });
  },

  gantt(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const foot = footerOf(sheet, d.footer);
    // GanttSlide's grid, in the spacing scale: a 20 rem label column, 0.25 rem between columns, and
    // per row a label line over a bar that fills the row, the row at most 7 rem tall.
    const sp = (v: number) => v * 0.25 * REM;
    const gx = EDGE + sp(84);
    const gap = sp(1);
    const colW = (W - EDGE - gx - gap * (d.columns.length - 1)) / d.columns.length;
    const cx = (col: number) => gx + (col - 1) * (colW + gap);
    const span = (n: number) => n * colW + (n - 1) * gap;
    const radius = (0.46875 * W) / 90;
    const lh = (PT.label * 1.25) / 72;
    const head = (PT.label * 1.4) / 72;
    d.columns.forEach((col, i) => {
      sheet.box(
        { runs: [caps(col)] },
        { x: cx(i + 1), y, w: colW, h: head },
        {
          size: PT.label,
          mono: true,
          color: c.muted,
          tracking: 0.06,
          align: "center",
        },
      );
      sheet.rect({ x: cx(i + 1), y: y + head + sp(1.5), w: colW, h: 2 / 144 }, c.border);
    });
    const top = y + head + sp(1.5) + 2 / 144 + sp(2);
    const stack = Math.max(
      0,
      ...[...Map.groupBy(d.milestones ?? [], (m) => m.column).values()].map((ms) => ms.length),
    );
    const msH = stack ? sp(3) + 2 / 144 + sp(1.5) + stack * lh : 0;
    const pitch = sheet.rowShare(GANTT_ROWS, BOTTOM - top - foot.h - msH + sp(2), d.rows.length);
    // Rows squeezed below their gap and label line keep a share of each.
    const rh = pitch - Math.min(sp(2), pitch / 4);
    d.rows.forEach((r, i) => {
      const ry = top + i * pitch;
      sheet.box(
        [
          { runs: [{ text: r.label }] },
          ...(r.sublabel
            ? [
                {
                  runs: [{ text: r.sublabel, options: { color: c.muted } }],
                  rel: PT.label / PT.base,
                },
              ]
            : []),
        ],
        { x: EDGE, y: ry, w: sp(80), h: rh },
        { size: PT.base, color: c.ink, align: "right", valign: "middle", line: 1.25 },
      );
      const by = ry + Math.min(lh + sp(1.5), rh / 2);
      d.columns.forEach((_, k) =>
        sheet.rounded({ x: cx(k + 1), y: by, w: colW, h: ry + rh - by }, { fill: c.card }, radius),
      );
      for (const bar of r.bars) {
        // One data hue, as on the web slide; continuous work at the ladder's 40 % with a 70 % edge.
        const tone = c.teal;
        sheet.rounded(
          { x: cx(bar.start), y: by, w: span(bar.span), h: ry + rh - by },
          {
            fill: bar.continuous ? mixColor(tone, c.card, 0.4) : tone,
            line: bar.continuous ? mixColor(tone, c.card, 0.7) : undefined,
          },
          radius,
        );
        sheet.box(
          bar.label,
          { x: cx(bar.start), y: ry, w: span(bar.span), h: lh },
          {
            size: PT.label,
            bold: true,
            color: tone,
            valign: "bottom",
            line: 1.25,
          },
        );
      }
    });
    if (stack) {
      const my = top + d.rows.length * pitch - (pitch - rh) + sp(3);
      sheet.box(
        { runs: [caps(d.milestonesLabel ?? sheet.words.milestones)] },
        { x: EDGE, y: my, w: sp(80), h: lh },
        {
          size: PT.label,
          mono: true,
          color: c.muted,
          tracking: 0.06,
          align: "right",
        },
      );
      // Milestones of one column stack under one rule, as on the web.
      for (const [column, ms] of Map.groupBy(d.milestones!, (m) => m.column)) {
        sheet.rect({ x: cx(column), y: my, w: colW, h: 2 / 144 }, c.purple);
        ms.forEach((m, k) =>
          sheet.box(
            m.label,
            {
              x: cx(column),
              y: my + 2 / 144 + sp(1.5) + k * lh,
              w: Math.min(colW * 1.5, W - EDGE - cx(column)),
              h: lh,
            },
            { size: PT.label, bold: true, color: c.purple, line: 1.25 },
          ),
        );
      }
    }
    footer(sheet, foot);
  },

  "team-topology"(sheet, d) {
    const y = header(sheet, d);
    const a = BODY(y);
    // The web's fit guard: the whole body shrinks until it fits.
    let k = 1;
    while (k > 0.6 && topology(drySheet(sheet), d, a, k) > a.h) k -= 0.02;
    const h = topology(drySheet(sheet), d, a, k);
    topology(sheet, d, { ...a, y: a.y + Math.max(0, a.h - h) / 2.25 }, k);
  },

  agenda(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const items = d.items.map((it) => (typeof it === "string" ? { title: it } : it));
    const timed = items.some((it) => it.when);
    // A title stands after the widest time, its line under it after the tab too: the stop is the
    // widest time's, or the widest number's where no item names a time.
    const lead = timed ? items.map((it) => it.when ?? "") : [`${items.length}.  `];
    const tabs = [Math.max(...lead.map((t) => chipAdvance(t, true))) * PT.h3 + (timed ? 0.3 : 0)];
    const paras: Para[] = items.flatMap((it, i) => [
      {
        runs: [
          {
            text: timed
              ? `${it.when !== items[i - 1]?.when ? (it.when ?? "") : ""}\t`
              : `${i + 1}.  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(it.title, c),
        ],
        after: it.text ? 2 : 10,
        tabs,
      },
      ...(it.text
        ? [
            {
              runs: [{ text: "\t" }, ...md(it.text, c, { color: c.muted })],
              rel: 0.75,
              after: 10,
              tabs,
            },
          ]
        : []),
    ]);
    const foot = footerOf(sheet, d.footer);
    sheet.box(
      paras,
      { x: EDGE, y: y + 0.2, w: CW * 0.8, h: BOTTOM - y - 0.2 - foot.h },
      {
        size: PT.h3,
        color: c.ink,
      },
    );
    footer(sheet, foot);
  },

  activity(sheet, d) {
    const { c } = sheet;
    const label =
      d.label ?? { exercise: "Hands-on", demo: "Live demo", debrief: "Debrief" }[d.kind];
    const y = header(sheet, { sectionLabel: label, headline: d.headline, subtitle: d.task });
    const frame = [d.duration, d.mode, d.outcome].filter((t): t is string => !!t);
    const fw = frame.length ? CW * 0.34 : 0;
    let top = y + 0.3;
    if (d.prompt) {
      const ph = sheet.need(d.prompt, CW - 0.6, { size: PT.lead, color: c.ink }) + 0.3;
      sheet.card({ x: EDGE, y: top, w: CW, h: ph }, sheet.c.litCard);
      sheet.box(
        d.prompt,
        { x: EDGE + 0.3, y: top + 0.15, w: CW - 0.6, h: ph - 0.3 },
        {
          size: PT.lead,
          color: c.ink,
        },
      );
      top += ph + 0.3;
    }
    const paras: Para[] = d.items.map((it, i) => ({
      runs: [
        ...(d.kind === "demo"
          ? []
          : [{ text: `${i + 1}.  `, options: { color: c.teal, bold: true, fontFace: MONO } }]),
        ...md(it, c),
      ],
      bullet: d.kind === "demo",
      after: 10,
    }));
    sheet.box(
      paras,
      { x: EDGE, y: top, w: CW - fw - (fw ? 0.5 : 0), h: BOTTOM - top },
      {
        size: PT.lead,
        color: c.ink,
      },
    );
    if (!frame.length) return;
    const fx = EDGE + CW - fw;
    const fh = 0.5 + frame.length * 0.55;
    sheet.card({ x: fx, y: top, w: fw, h: fh }, sheet.c.plainCard);
    sheet.box(
      frame.map((t, i) => ({
        runs: md(t, c, i === 0 && d.duration ? {} : { color: c.muted }),
        mono: i === 0 && !!d.duration,
        bold: i === 0 && !!d.duration,
        rel: i === 0 && d.duration ? 1.4 : 1,
        after: 8,
      })),
      { x: fx + 0.3, y: top + 0.25, w: fw - 0.6, h: fh - 0.5 },
      { size: PT.base, color: c.ink },
    );
  },

  wheel(sheet, d) {
    const { slide: s } = sheet;
    // As `WheelSlide`: a ring of segments at 40 % teal, a 1.5 degree gap each side, numbered from
    // the top clockwise, the centre on a soft disc; each segment's tile, title and text on the side
    // its centre lies on, both columns against the ring.
    const { c } = sheet;
    const y = header(sheet, d);
    const a = BODY(y);
    const n = d.segments.length;
    const dia = 24 * REM;
    const unit = dia / 200;
    const tile = 10 * 0.25 * REM;
    const colW = (a.w - dia - 2 * 2 * REM) / 2;
    const textW = colW - tile - 0.75 * REM;
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
    const textO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.375 };
    const centres = d.segments.map((_, k) => -90 + (360 * (k + 0.5)) / n);
    const cos = centres.map((deg) => Math.cos((deg * Math.PI) / 180));
    const right = cos.flatMap((v, k) => (v > 1e-6 ? [k] : []));
    const left = cos.flatMap((v, k) => (v < -1e-6 ? [k] : []));
    cos.forEach((v, k) => {
      if (Math.abs(v) <= 1e-6) (right.length <= left.length ? right : left).push(k);
    });
    const sin = (k: number) => Math.sin((centres[k] * Math.PI) / 180);
    for (const list of [left, right]) list.sort((p, q) => sin(p) - sin(q));
    const itemH = (k: number) =>
      Math.max(
        tile,
        sheet.need(d.segments[k].title, textW, titleO) +
          0.25 * REM +
          sheet.need(d.segments[k].text, textW, textO),
      );
    const colH = (list: number[]) =>
      list.reduce((sum, k, i) => sum + itemH(k) + (i ? 1.75 * REM : 0), 0);
    const capO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.45 };
    const capH = d.caption ? REM + sheet.need(d.caption, a.w, capO) : 0;
    const h = Math.max(dia, colH(left), colH(right));
    const top = a.y + Math.max(0, a.h - h - capH) / 2.25;
    const cx = a.x + colW + 2 * REM + dia / 2;
    const cy = top + h / 2;
    d.segments.forEach((_, k) => {
      const from = -90 + (360 * k) / n + 1.5;
      const to = -90 + (360 * (k + 1)) / n - 1.5;
      s.addShape("blockArc", {
        x: cx - dia / 2,
        y: cy - dia / 2,
        w: dia,
        h: dia,
        angleRange: [(from + 360) % 360, (to + 360) % 360],
        arcThicknessRatio: 36 / 96,
        fill: { color: mixColor(c.teal, c.bg, 0.4) },
        line: { type: "none" },
      });
      const r = 78 * unit;
      const rad = (centres[k] * Math.PI) / 180;
      sheet.box(
        { runs: [{ text: String(k + 1) }] },
        { x: cx + r * Math.cos(rad) - 0.2, y: cy + r * Math.sin(rad) - 0.15, w: 0.4, h: 0.3 },
        {
          size: Math.round(14 * unit * 72 * 2) / 2,
          bold: true,
          color: c.ink,
          align: "center",
          valign: "middle",
          line: 1,
        },
      );
    });
    const hub = dia * 0.56;
    s.addShape("ellipse", {
      x: cx - hub / 2,
      y: cy - hub / 2,
      w: hub,
      h: hub,
      fill: { color: mixColor(c.ink, c.bg, 0.07) },
      line: { type: "none" },
    });
    sheet.box(
      { runs: md(d.center, c), bold: true },
      { x: cx - hub / 2 + REM, y: cy - hub / 2 + REM, w: hub - 2 * REM, h: hub - 2 * REM },
      {
        size: PT.sm,
        color: c.ink,
        align: "center",
        valign: "middle",
        line: 1.25,
      },
    );
    const column = (list: number[], x: number, w = textW) => {
      let ly = cy - colH(list) / 2;
      for (const k of list) {
        const sg = d.segments[k];
        sheet.rounded({ x, y: ly, w: tile, h: tile }, { fill: c.teal }, 10 / 144);
        sheet.box(
          { runs: [{ text: String(k + 1) }] },
          { x, y: ly, w: tile, h: tile },
          {
            size: 17.33,
            mono: true,
            bold: true,
            color: c.card,
            align: "center",
            valign: "middle",
            line: 1,
          },
        );
        const th = sheet.need(sg.title, w, titleO);
        sheet.box(sg.title, { x: x + tile + 0.75 * REM, y: ly, w, h: th }, titleO);
        sheet.box(
          sg.text,
          {
            x: x + tile + 0.75 * REM,
            y: ly + th + 0.25 * REM,
            w,
            h: sheet.need(sg.text, w, textO),
          },
          textO,
        );
        ly += itemH(k) + 1.75 * REM;
      }
    };
    // The left column stands against the ring, as `justify-self-end` sets it.
    const leftW = Math.max(
      0,
      ...left.map(
        (k) =>
          tile +
          0.75 * REM +
          Math.max(
            textWidth(d.segments[k].title, { size: PT.h4, ...TITLE }),
            textWidth(d.segments[k].text, textO),
          ) +
          0.02,
      ),
    );
    column(left, a.x + colW - Math.min(colW, leftW), Math.min(textW, leftW - tile - 0.75 * REM));
    column(right, cx + dia / 2 + 2 * REM);
    if (d.caption) sheet.box(d.caption, { x: a.x, y: top + h + REM, w: a.w, h: capH - REM }, capO);
  },

  decision(sheet, d) {
    const { slide: s } = sheet;
    // As the web's decision grid: the need, a stub arrow, the question, a fork to the yes branch
    // above and the no branch below, both labelled in caps, a join and an arrow into the outcome;
    // the columns `--slide-decision-columns` sets, the branches as tall as the taller, 4 px teal
    // lines with 0.9 rem arrowheads.
    const { c } = sheet;
    const y = header(sheet, d);
    const a = BODY(y);
    const fixed = [15, 4, 14, 7.5, 0, 3.5, 17].map((r) => r * REM);
    fixed[4] = Math.max(0, a.w - fixed.reduce((sum, v) => sum + v, 0));
    const col = (i: number) => a.x + fixed.slice(0, i).reduce((sum, v) => sum + v, 0);
    const teamTone = (t: string) =>
      t === "enabling" ? c.purple : t === "platform" ? c.tealDark : c.factory;
    const teamLine = (t: string) =>
      t === "enabling" ? c.purple : t === "platform" ? c.teal : c.factory;
    const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
    const textO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.375 };
    const needIn = fixed[0] - 2 * 1.25 * REM;
    const needH = sheet.need(d.need, needIn, bold) + 2 * REM;
    const qIn = fixed[2] - 2 * 1.25 * REM;
    const qH = sheet.need({ runs: md(d.question, c), align: "center" }, qIn, bold) + 2 * 1.25 * REM;
    const oIn = fixed[6] - 2 * 1.25 * REM;
    const oH = sheet.need(d.outcome, oIn, bold) + 2 * REM;
    const bIn = fixed[4] - 2 * 1.5 * REM;
    const branch = (br: typeof d.yes): [Para, BoxOpts, number][] => [
      [{ runs: md(br.title, c, { color: teamTone(br.team) }) }, titleO, 0],
      [{ runs: md(br.text, c) }, textO, 0.5 * REM],
    ];
    const bh = (br: typeof d.yes) =>
      branch(br).reduce((sum, [p, o, gap]) => sum + gap + sheet.need(p, bIn, o), 0) +
      2 * 1.25 * REM;
    const rowH = Math.max(bh(d.yes), bh(d.no));
    const gapY = 3.5 * REM;
    const gridH = 2 * rowH + gapY;
    const capO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.4, align: "center" };
    const capH = d.caption ? 1.5 * REM + sheet.need(d.caption, a.w, capO) : 0;
    const top = a.y + Math.max(0, a.h - gridH - capH) / 2.25;
    const mid = top + gridH / 2;
    const thick = 0.25 * REM;
    const line = { color: c.teal, width: 2 };
    const bar = (x: number, w: number, yy: number) =>
      sheet.rect({ x, y: yy - thick / 2, w, h: thick }, c.teal);
    const head = (tip: number, yy: number) => {
      const [len, half] = [0.9 * REM, 0.6 * REM];
      s.addShape("triangle", {
        x: tip - len / 2 - half,
        y: yy - len / 2,
        w: 2 * half,
        h: len,
        rotate: 90,
        fill: { color: c.teal },
        line: { type: "none" },
      });
    };
    sheet.card(
      { x: col(0), y: mid - needH / 2, w: fixed[0], h: needH },
      { fill: mixColor(c.teal, c.card, 0.07), line: mixColor(c.teal, c.card, 0.4) },
    );
    sheet.box(
      d.need,
      { x: col(0) + 1.25 * REM, y: mid - needH / 2 + REM, w: needIn, h: needH - 2 * REM },
      bold,
    );
    bar(col(1), fixed[1], mid);
    head(col(2), mid);
    sheet.card({ x: col(2), y: mid - qH / 2, w: fixed[2], h: qH }, { fill: c.card, line: c.teal });
    sheet.box(
      { runs: md(d.question, c), align: "center" },
      { x: col(2) + 1.25 * REM, y: mid - qH / 2 + 1.25 * REM, w: qIn, h: qH - 2.5 * REM },
      { ...bold, align: "center" },
    );
    bar(col(3), 2 * REM, mid);
    // The fork's vertical 2 rem into its column, the join's 2 rem before the outcome.
    const forkX = col(3) + 2 * REM;
    const joinX = col(6) - 2 * REM;
    [d.yes, d.no].forEach((br, r) => {
      const by = top + r * (rowH + gapY);
      const cy = by + rowH / 2;
      s.addShape("line", { x: forkX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
      s.addShape("line", { x: forkX, y: cy, w: col(4) - forkX, h: 0, line });
      head(col(4), cy);
      const lh = (PT.h4 * 1.4) / 72;
      sheet.box(
        { runs: [caps(br.label)] },
        {
          x: forkX + 0.75 * REM,
          y: r ? cy + 3 * REM - lh : cy - 3 * REM,
          w: fixed[3] - 2.75 * REM,
          h: lh,
        },
        {
          size: PT.h4,
          mono: true,
          color: c.muted,
          tracking: 0.06,
          line: 1.4,
        },
      );
      sheet.card(
        { x: col(4), y: by, w: fixed[4], h: rowH },
        { fill: mixColor(teamLine(br.team), c.card, 0.15), line: teamLine(br.team) },
      );
      const parts = branch(br);
      const inner = parts.reduce((sum, [p, o, gap]) => sum + gap + sheet.need(p, bIn, o), 0);
      let ty = cy - inner / 2;
      for (const [p, o, gap] of parts) {
        const ph = sheet.need(p, bIn, o);
        ty += gap;
        sheet.box(p, { x: col(4) + 1.5 * REM, y: ty, w: bIn, h: ph }, o);
        ty += ph;
      }
      s.addShape("line", { x: col(5), y: cy, w: joinX - col(5), h: 0, line });
      s.addShape("line", { x: joinX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
    });
    bar(joinX, col(6) - joinX, mid);
    head(col(6), mid);
    sheet.card(
      { x: col(6), y: mid - oH / 2, w: fixed[6], h: oH },
      { fill: mixColor(c.ink, c.bg, 0.07) },
    );
    sheet.box(
      d.outcome,
      { x: col(6) + 1.25 * REM, y: mid - oH / 2 + REM, w: oIn, h: oH - 2 * REM },
      bold,
    );
    if (d.caption)
      sheet.box(
        d.caption,
        { x: a.x, y: top + gridH + 1.5 * REM, w: a.w, h: capH - 1.5 * REM },
        capO,
      );
  },
};

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

// pptxgenjs sets a line's dash, its data markers and labels and where categories stand per chart.
// A trend's categories stand on the plot's edges, as recharts draws them. A marked trend's series
// alternate measured and planned: the planned ones get the dash and leave the legend, its first
// measured one the dot on the marked point. Its category names leave the axis for the text boxes
// the slide sets under the points.
function finishChart(xml: string, fix: ChartFix) {
  // pptxgenjs writes no angle of 0, and without one PowerPoint tilts long names.
  if ("level" in fix)
    return fix.level
      ? xml.replace(/(<c:catAx>.*?)<a:bodyPr\/>/s, '$1<a:bodyPr rot="0" vert="horz"/>')
      : xml;
  const { now, unnamed } = fix;
  const hideEntries = (out: string, hidden: number[]) =>
    out.replace(
      '<c:legendPos val="t"/>',
      `<c:legendPos val="t"/>${hidden
        .sort((a, b) => a - b)
        .map((i) => `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`)
        .join("")}`,
    );
  const edged = xml.replace('<c:crossBetween val="between"/>', '<c:crossBetween val="midCat"/>');
  if (now < 0) return hideEntries(edged, unnamed);
  const all = edged.match(/<c:ser>.*?<\/c:ser>/gs) ?? [];
  const planned = all.filter((_, i) => i % 2 === 1);
  const hue = /srgbClr val="(\w+)"/.exec(all[0] ?? "")?.[1];
  const dot = `<c:dPt><c:idx val="${now}"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="${hue}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${hex("--color-white")}"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt>`;
  return hideEntries(edged, [...planned.map((_, i) => 2 * i + 1), ...unnamed])
    .replace(/(<c:catAx>.*?<c:tickLblPos val=")\w+("\/>)/s, "$1none$2")
    .replace(/<c:ser>.*?<\/c:ser>/gs, (ser) =>
      planned.includes(ser)
        ? ser.replace('<a:prstDash val="solid"/>', '<a:prstDash val="dash"/>')
        : ser === all[0]
          ? ser.replace(
              /<c:dLbls>(.*?<\/c:dLbls>)\s*(<c:marker>.*?<\/c:marker>)/s,
              `$2${dot}<c:dLbls>$1`,
            )
          : ser,
    );
}

/** Builds the deck and checks the finished slides for overflow. Returns warnings for images or
 *  videos it could not place. */
export async function renderPptx(
  deck: Presentation,
  assets: string,
): Promise<{ zip: JSZip; warnings: string[] }> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.name;
  const deckLanguage = deckLang(deck);
  const lang = { de: "de-DE", en: "en-US" }[deckLanguage] ?? "en-US";
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const dark = deck.theme === "brand-dark";
  const deckLook = new Look(palette(dark), deckLanguage, dark);
  const out: Output = {
    pptx,
    assets,
    warnings: [],
    charts: new Map(),
  };
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightLook = new Look(palette(true), deckLanguage, true);
  // A slide's ground as the web's `--slide-ground`: its hue at 7 % on the background, which every
  // fill in the ground's colour takes too.
  const grounded = new Map<string, Look>();
  const lookOf = (slide: Slide | undefined) => {
    const base = dark || !slide || !isDeepDive(slide) ? deckLook : nightLook;
    const ground = slide ? groundOf(slide as Grounded) : "intro";
    if (ground === "intro") return base;
    const key = `${base.dark}-${ground}`;
    if (!grounded.has(key)) {
      const { c } = base;
      const hue = { primary: c.teal, secondary: c.purple, accent: c.amber, success: c.green }[
        ground
      ];
      grounded.set(key, base.grounded(hue));
    }
    return grounded.get(key)!;
  };
  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const sheet = new Sheet(lookOf(slide), s, out);
    frame(sheet, deck, i);
    const drawn = slideDrawn(slide);
    const render = RENDER[drawn.type as RenderedSlide["type"]] as Render | undefined;
    if (!render)
      throw new Error(
        `slide ${i + 1} is a ${JSON.stringify(slide.type)}, which slides-pptx cannot draw`,
      );
    render(sheet, drawn as never);
  });
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  // pptxgenjs numbers charts across every deck of the process: within one, they run in drawing order.
  const chartFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/.+\.xml$/.test(f))) {
    const raw = await zip.file(name)!.async("string");
    const fix = out.charts.get(chartFiles.indexOf(name) + 1);
    const xml = fix ? finishChart(raw, fix) : raw;
    const n = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    const slideC = lookOf(n ? deck.slides[Number(n[1]) - 1] : undefined).c;
    zip.file(
      name,
      xml
        // Each font reference names its pitch and family class, so PowerPoint on a machine without
        // the brand fonts substitutes a sans for Inter and a monospace for JetBrains Mono instead of
        // its default face. pptxgenjs writes the typeface alone, or a sans pitch for every face in
        // a table.
        .replace(
          /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
          (m, face: string) =>
            PITCH[face] ? `typeface="${face}" pitchFamily="${PITCH[face]}" charset="0"` : m,
        )
        // pptxgenjs marks every run en-US, so PowerPoint's spelling and hyphenation take a German
        // deck for English.
        .replaceAll('lang="en-US"', `lang="${lang}"`)
        .replaceAll(`lang="${CAPS}"`, `lang="${lang}" cap="all"`)
        // pptxgenjs writes one `adj` for any preset: the brand corner's two radii, 4 to 1.
        .replace(
          /prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val (\d+)"\/>/g,
          (_, v: string) =>
            `prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val ${v}"/><a:gd name="adj2" fmla="val ${Math.round(+v / 4)}"/>`,
        )
        // A bullet in the brand colour, as the web's square marker; pptxgenjs writes no bullet
        // colour. The brand faces have no square, so the bullet names Arial's, which every
        // PowerPoint has: at 130 % it is 0.29 em and stands 0.07 em above the web marker's
        // centre, a third of the text's size centred on its first line.
        .replace(/<a:buSzPct val="100000"\/><a:buChar char="&#x(\w+);"\/>/g, (_, code: string) => {
          const hue = HUE_OF_MARKER[code];
          const marked = hue ? slideC[hue] : slideC.teal;
          return `<a:buClr><a:srgbClr val="${marked}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${hue ? MARKER_SQUARE : code};"/>`;
        }),
    );
    if (n)
      for (const found of checkSlide(await zip.file(name)!.async("string"), W, H))
        out.warnings.push(`slide ${n[1]}: ${found}`);
  }
  return { zip, warnings: out.warnings };
}
