import type { Look } from "../look";
import { mixColor, type Palette } from "../palette";
import type { Sheet } from "../sheet";
import { PT, REM, type Area, type Measure } from "../stage";
import { literal, md, type BoxOpts, type Para } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

export type BarMode = "inline" | "stacked";

interface BarModeSpec {
  barHRem: number;
  rowGapRem: number;
  labelO: (c: Palette, k: number) => BoxOpts;
  valueO: (tone: string, k: number) => BoxOpts;
  labelW: (w: number, k: number) => number;
  trackX: (labelW: number, gap: number) => number;
  placeRow: (lh: number, barH: number, k: number) => { rowH: number; labelY: number; barY: number };
}

const BAR_MODES: Record<BarMode, BarModeSpec> = {
  inline: {
    barHRem: 3,
    rowGapRem: 1.25,
    labelO: (c, k) => ({ size: PT.lead * k, color: c.ink, line: 1.25, valign: "middle" }),
    valueO: (tone, k) => ({ size: PT.h3 * k, mono: true, color: tone, valign: "middle", line: 1 }),
    labelW: (_w, k) => 18 * REM * k,
    trackX: (labelW, gap) => labelW + gap,
    placeRow: (lh, barH) => {
      const rowH = Math.max(lh, barH);
      return { rowH, labelY: (rowH - lh) / 2, barY: (rowH - barH) / 2 };
    },
  },
  stacked: {
    barHRem: 5,
    rowGapRem: 3,
    labelO: (c, k) => ({
      size: PT.h3 * k,
      color: c.ink,
      line: 1.25,
      valign: "top",
      tracking: -0.025,
    }),
    valueO: (tone, k) => ({
      size: PT.title * k,
      mono: true,
      color: tone,
      valign: "middle",
      line: 1,
    }),
    labelW: (w) => w,
    trackX: () => 0,
    placeRow: (lh, barH, k) => ({
      rowH: lh + 0.75 * REM * k + barH,
      labelY: 0,
      barY: lh + 0.75 * REM * k,
    }),
  },
};

export type BarRole = "context" | "highlight" | "plain";

export interface BarRoleStyle {
  tone: string;
  fill: string;
  bold: boolean;
}

const BAR_ROLES: Record<BarRole, (c: Palette) => BarRoleStyle> = {
  highlight: (c) => ({ tone: c.teal, fill: c.teal, bold: true }),
  context: (c) => ({ tone: c.muted, fill: mixColor(c.ink, c.bg, 0.4), bold: false }),
  plain: (c) => ({ tone: c.ink, fill: c.teal, bold: true }),
};

/** Resolves a bar's visual role (`highlight`, `context`, or `plain`) to its text tone, bar fill,
 *  and bold flag. */
export function barRoleStyle(role: BarRole, c: Palette): BarRoleStyle {
  return BAR_ROLES[role](c);
}

/** Chooses a bar's visual role from whether it is highlighted and whether any bar highlights. */
export function barRole(highlighted: boolean, anyHighlight: boolean): BarRole {
  if (highlighted) return "highlight";
  return anyHighlight ? "context" : "plain";
}

/** Formats a bar's value text: explicit display override, low–high range, or single figure. */
export function barValueText(
  bar: Block<"bars">["bars"][number],
  format: (n: number) => string,
): string {
  if (bar.display != null) return bar.display;
  if (bar.from != null) return `${format(bar.from)}–${format(bar.value)}`;
  return format(bar.value);
}

export interface ScaleTick {
  q: number;
  text: string;
}

/** Returns the five percentage stops (0, 25, 50, 75, 100) of a named bar scale with formatted
 *  labels. */
export function scaleTicks(max: number, format: (n: number) => string): ScaleTick[] {
  return [0, 25, 50, 75, 100].map((q) => ({ q, text: format((max * q) / 100) }));
}

export interface BarRowLayout {
  y: number;
  label: Para;
  labelY: number;
  labelH: number;
  barY: number;
  from: number;
  barW: number;
  fill: string;
  value: Para;
  valueO: BoxOpts;
  valueX: number;
}

export interface BarsLayout {
  rows: BarRowLayout[];
  barH: number;
  labelW: number;
  labelO: BoxOpts;
  trackX: number;
  trackW: number;
  valueW: number;
  sourceH: number;
  h: number;
  scaleO: BoxOpts;
  scaleY: number;
  ticks: ScaleTick[];
}

/** Draws a named scale's muted track, right end cap, and quarter hairlines inside `track`. */
export function drawScaleTrack(sheet: Sheet, track: Area): void {
  const { c } = sheet;
  // The track ends on a rule and marks its quarters in the ground, under the bar.
  sheet.rect(track, mixColor(c.ink, c.bg, 0.07));
  sheet.rect(
    { x: track.x + track.w - 4 / 144, y: track.y, w: 4 / 144, h: track.h },
    mixColor(c.ink, c.bg, 0.25),
  );
  for (const q of [0.25, 0.5, 0.75])
    sheet.rect({ x: track.x + q * track.w - 1 / 144, y: track.y, w: 2 / 144, h: track.h }, c.bg);
}

/** Measures the optional named scale band and source note under a bars block. */
export function barsFooter(look: Look, b: Block<"bars">, { w, k }: Measure) {
  const { c } = look;
  const sourceH = b.source
    ? 2.5 * REM * k + look.need(b.source, w, { size: PT.sm * k, color: c.muted })
    : 0;
  // A named scale is numbered under the last track at its ends and quarters.
  const scaleO: BoxOpts = { size: PT.h4 * k, color: c.muted, line: 1.375, align: "center" };
  const scaleH = b.max == null ? 0 : 0.75 * REM * k + look.need("0", w, scaleO);
  return { scaleO, scaleH, sourceH };
}

/** Maps a bar's optional `from` and `value` onto a track of width `trackW` against `max`,
 *  enforcing a 4 px minimum width so zero-length bars remain visible. */
export function barSpan(
  bar: Pick<Block<"bars">["bars"][number], "from" | "value">,
  max: number,
  trackW: number,
): { from: number; barW: number } {
  const base = bar.from ?? 0;
  return {
    from: (base / max) * trackW,
    barW: Math.max(4 / 144, ((bar.value - base) / max) * trackW),
  };
}

export interface BarsTrackGeometry {
  mode: BarMode;
  follow: boolean;
  gap: number;
  barH: number;
  rowGap: number;
  labelW: number;
  valueW: number;
  trackX: number;
  trackW: number;
}

/** Computes a bars block's row mode, following-value flag, and horizontal/vertical track geometry. */
export function barsTrack(b: Block<"bars">, { w, k }: Measure): BarsTrackGeometry {
  const mode: BarMode = b.bars.length > 3 ? "inline" : "stacked";
  const spec = BAR_MODES[mode];
  const follow = b.max == null && b.bars.every((x) => x.from == null);
  const gap = 2 * REM * k;
  const barH = spec.barHRem * REM * k;
  const rowGap = spec.rowGapRem * REM * k;
  const labelW = spec.labelW(w, k);
  const valueW = 14 * REM * k;
  const trackX = spec.trackX(labelW, gap);
  // Without a scale the longest bar ends where the value column would start.
  const trackW = w - trackX - (follow ? 16 * REM * k : valueW + gap);
  return { mode, follow, gap, barH, rowGap, labelW, valueW, trackX, trackW };
}

/** A bars block as `Bars` sets it: four bars and more one row each, the label left of its track,
 *  fewer with the label above; a highlight in teal and bold, the other bars context in grey;
 *  without a named scale each figure follows its bar's end. */
export function barsLayout(look: Look, b: Block<"bars">, { w, k }: Measure): BarsLayout {
  const { c } = look;
  const list = b.order === "given" ? b.bars : [...b.bars].sort((p, q) => q.value - p.value);
  const max = b.max ?? (Math.max(...list.map((x) => x.value), 0) || 1);
  const anyHighlight = list.some((x) => x.highlight);
  const { mode, follow, gap, barH, rowGap, labelW, valueW, trackX, trackW } = barsTrack(b, {
    w,
    k,
  });
  const spec = BAR_MODES[mode];
  const labelO = spec.labelO(c, k);
  const format = (n: number) => look.words.figure(n);
  let y = 0;
  const rows = list.map((bar): BarRowLayout => {
    const style = barRoleStyle(barRole(!!bar.highlight, anyHighlight), c);
    const label: Para = {
      runs: md(bar.label, c, { color: style.tone }),
      bold: style.bold,
      balance: true,
    };
    const labelH = look.need(label, labelW, labelO);
    const { rowH, labelY, barY } = spec.placeRow(labelH, barH, k);
    const { from, barW } = barSpan(bar, max, trackW);
    const value: Para = { runs: [{ text: barValueText(bar, format) }], bold: style.bold };
    const valueO = spec.valueO(style.tone, k);
    const valueX = trackX + (follow ? from + barW + gap : trackW + gap);
    const rowY = y;
    y += rowH + rowGap;
    return {
      y: rowY,
      label,
      labelY,
      labelH,
      barY,
      from,
      barW,
      fill: style.fill,
      value,
      valueO,
      valueX,
    };
  });
  const { scaleO, scaleH, sourceH } = barsFooter(look, b, { w, k });
  const scaleY = y - rowGap + 0.75 * REM * k;
  const h = y - rowGap + scaleH + sourceH;
  const ticks = scaleTicks(max, format);
  return { rows, barH, labelW, labelO, trackX, trackW, valueW, sourceH, h, scaleO, scaleY, ticks };
}

export const bars: BlockKind<"bars"> = {
  height(look, b, m) {
    return barsLayout(look, b, m).h;
  },
  draw(sheet, b, { area: a, k, centered }) {
    const { c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const L = barsLayout(sheet, b, { w: a.w, k });
    for (const r of L.rows) {
      const y = a.y + r.y;
      sheet.box(r.label, { x: a.x, y: y + r.labelY, w: L.labelW, h: r.labelH }, L.labelO);
      const ty = y + r.barY;
      if (b.max != null)
        drawScaleTrack(sheet, { x: a.x + L.trackX, y: ty, w: L.trackW, h: L.barH });
      // A range starts at its low end, as on the web slide.
      sheet.rect({ x: a.x + L.trackX + r.from, y: ty, w: r.barW, h: L.barH }, r.fill);
      sheet.box(r.value, { x: a.x + r.valueX, y: ty, w: L.valueW, h: L.barH }, r.valueO);
    }
    if (b.max != null)
      for (const t of L.ticks) {
        const tw = 4 * REM * k;
        const x = a.x + L.trackX + (t.q / 100) * L.trackW - tw / 2;
        sheet.box(
          literal(t.text),
          { x, y: a.y + L.scaleY, w: tw, h: L.h - L.sourceH - L.scaleY },
          L.scaleO,
        );
      }
    if (b.source)
      sheet.box(
        b.source,
        { x: a.x, y: a.y + L.h - L.sourceH + 2.5 * REM * k, w: a.w, h: L.sourceH - 2.5 * REM * k },
        { ...o, size: PT.sm * k, color: c.muted },
      );
  },
};
