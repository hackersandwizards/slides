import type { Look } from "../look";
import { mixColor } from "../palette";
import { PT, REM, type Measure } from "../stage";
import { literal, md, type BoxOpts, type Para } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

/** A bars block as `Bars` sets it: four bars and more one row each, the label left of its track,
 *  fewer with the label above; a highlight in teal and bold, the other bars context in grey; without
 *  a named scale each figure follows its bar's end. */
function barsLayout(look: Look, b: Block<"bars">, { w, k }: Measure) {
  const { c } = look;
  const bars = b.order === "given" ? b.bars : [...b.bars].sort((p, q) => q.value - p.value);
  const max = b.max ?? (Math.max(...bars.map((x) => x.value), 0) || 1);
  const inline = bars.length > 3;
  const anyHighlight = bars.some((x) => x.highlight);
  const follow = b.max == null && bars.every((x) => x.from == null);
  const gap = 2 * REM * k;
  const barH = (inline ? 3 : 5) * REM * k;
  const labelW = inline ? 18 * REM * k : w;
  const valueW = 14 * REM * k;
  const trackX = inline ? labelW + gap : 0;
  // Without a scale the longest bar ends where the value column would start.
  const trackW = w - trackX - (follow ? 16 * REM * k : valueW + gap);
  const labelO: BoxOpts = {
    size: (inline ? PT.lead : PT.h3) * k,
    color: c.ink,
    line: 1.25,
    valign: inline ? "middle" : "top",
    ...(inline ? {} : { tracking: -0.025 }),
  };
  let y = 0;
  const rows = bars.map((bar) => {
    const context = anyHighlight && !bar.highlight;
    const tone = context ? c.muted : bar.highlight ? c.teal : c.ink;
    const label: Para = { runs: md(bar.label, c, { color: tone }), bold: !context, balance: true };
    const lh = look.need(label, labelW, labelO);
    const rowH = inline ? Math.max(lh, barH) : lh + 0.75 * REM * k + barH;
    const from = ((bar.from ?? 0) / max) * trackW;
    const barW = Math.max(4 / 144, ((bar.value - (bar.from ?? 0)) / max) * trackW);
    const text =
      bar.display ??
      (bar.from != null
        ? `${look.words.figure(bar.from)}–${look.words.figure(bar.value)}`
        : look.words.figure(bar.value));
    const row = {
      y,
      label,
      labelY: inline ? (rowH - lh) / 2 : 0,
      labelH: lh,
      barY: inline ? (rowH - barH) / 2 : lh + 0.75 * REM * k,
      from,
      barW,
      fill: bar.highlight || !anyHighlight ? c.teal : mixColor(c.ink, c.bg, 0.4),
      value: { runs: [{ text }], bold: !context } as Para,
      valueO: {
        size: (inline ? PT.h3 : PT.title) * k,
        mono: true,
        color: tone,
        valign: "middle",
        line: 1,
      } as BoxOpts,
      valueX: trackX + (follow ? from + barW + gap : trackW + gap),
    };
    y += rowH + (inline ? 1.25 : 3) * REM * k;
    return row;
  });
  const sourceH = b.source
    ? 2.5 * REM * k + look.need(b.source, w, { size: PT.sm * k, color: c.muted })
    : 0;
  // A named scale is numbered under the last track at its ends and quarters.
  const scaleO: BoxOpts = { size: PT.h4 * k, color: c.muted, line: 1.375, align: "center" };
  const scaleY = y - (inline ? 1.25 : 3) * REM * k + 0.75 * REM * k;
  const scaleH = b.max == null ? 0 : 0.75 * REM * k + look.need("0", w, scaleO);
  const h = y - (inline ? 1.25 : 3) * REM * k + scaleH + sourceH;
  const ticks = [0, 25, 50, 75, 100].map((q) => ({
    q,
    text: look.words.figure((max * q) / 100),
  }));
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
      if (b.max != null) {
        // The track ends on a rule and marks its quarters in the ground, under the bar.
        sheet.rect(
          { x: a.x + L.trackX, y: ty, w: L.trackW, h: L.barH },
          mixColor(c.ink, c.bg, 0.07),
        );
        sheet.rect(
          { x: a.x + L.trackX + L.trackW - 4 / 144, y: ty, w: 4 / 144, h: L.barH },
          mixColor(c.ink, c.bg, 0.25),
        );
        for (const q of [0.25, 0.5, 0.75])
          sheet.rect(
            { x: a.x + L.trackX + q * L.trackW - 1 / 144, y: ty, w: 2 / 144, h: L.barH },
            c.bg,
          );
      }
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
        {
          x: a.x,
          y: a.y + L.h - L.sourceH + 2.5 * REM * k,
          w: a.w,
          h: L.sourceH - 2.5 * REM * k,
        },
        {
          ...o,
          size: PT.sm * k,
          color: c.muted,
        },
      );
  },
};
