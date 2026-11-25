import { minus } from "../../../lib/figure-layout";
import { continuation } from "../../../lib/process-layout";
import { textWidth } from "../fit";
import type { Palette } from "../palette";
import { PT, TITLE, W } from "../stage";
import { md, type Para } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

/** A timeline event's title, text and result in the figure face, as `EventBody` sets them on the
 *  web: one list, so the measured height is the drawn one. */
function eventParas(e: Block<"timeline">["events"][number], c: Palette, hi: boolean): Para[] {
  return [
    { runs: md(e.title, c, { color: hi ? c.teal : c.ink }), ...TITLE, after: 4 },
    { runs: md(e.text ?? "", c, { color: c.muted }), rel: 0.9, after: e.text ? 16 : 8 },
    ...(e.figure
      ? [
          {
            runs: [{ text: minus(e.figure), options: { color: hi ? c.teal : c.ink } }],
            mono: true,
            bold: true,
            rel: PT.s6 / PT.base,
          },
        ]
      : []),
  ];
}

export const timeline: BlockKind<"timeline"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return (
      0.6 +
      Math.max(
        ...b.events.map((e) => look.need(eventParas(e, c, false), w / b.events.length - 0.15, o)),
      )
    );
  },
  draw(sheet, b, slot) {
    const { area: a, k, centered } = slot;
    const { slide: s, c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    if (b.labels) {
      const lw = 1.2;
      const rows: [string | undefined, number, number][] = [
        [b.labels.when, a.y, PT.label],
        [b.labels.title, a.y + 0.55, PT.base],
        [b.labels.text, a.y + 0.8, PT.base * 0.9],
      ];
      for (const [label, ly, size] of rows) {
        if (label)
          sheet.box(
            { runs: [{ text: label }] },
            { x: a.x, y: ly, w: lw - 0.1, h: 0.25 },
            {
              size: size * k,
              mono: true,
              bold: true,
              color: c.muted,
              align: "right",
            },
          );
      }
      return timeline.draw(
        sheet,
        { ...b, labels: undefined },
        { ...slot, area: { ...a, x: a.x + lw, w: a.w - lw } },
      );
    }
    const n = b.events.length;
    const ew = a.w / n;
    const ly = a.y + 0.35;
    // A timeline continued over slides runs its line in from the slide's edge or out to it.
    const { into, onward } = continuation(b);
    const from = into ? 0 : a.x + ew / 2;
    const to = onward ? W : a.x + a.w - ew / 2;
    s.addShape("line", {
      x: from,
      y: ly,
      w: to - from,
      h: 0.001,
      line: { color: c.border, width: 2 },
    });
    // The line after `now` is dashed, as is a run-out past the last event (`now` defaults to it)
    // and a run-in where no event has happened (`now` -1).
    const now = b.now ?? n - 1;
    if (now < n - 1 || onward) {
      const dx = now < 0 ? from : a.x + ew / 2 + now * ew;
      for (const color of [c.bg, c.muted])
        s.addShape("line", {
          x: dx,
          y: ly,
          w: to - dx,
          h: 0.001,
          line: { color, width: 2, dashType: "dash" },
        });
    }
    b.events.forEach((e, i) => {
      const cx = a.x + ew * i + ew / 2;
      const hi = i === b.highlight;
      s.addShape("ellipse", {
        x: cx - 0.09,
        y: ly - 0.09,
        w: 0.18,
        h: 0.18,
        fill: { color: hi ? c.teal : c.card },
        line: { color: hi ? c.teal : c.muted, width: 1.5 },
      });
      // A segment's label breaks the middle of the line that leads to its event, as on the web.
      if (e.segment && i > 0) {
        const tw = textWidth(e.segment, { size: PT.label * k, mono: true }) + 0.16;
        sheet.box(
          { runs: [{ text: e.segment }] },
          { x: cx - ew / 2 - tw / 2, y: ly - 0.11, w: tw, h: 0.22 },
          {
            size: PT.label * k,
            mono: true,
            bold: true,
            color: c.muted,
            align: "center",
            valign: "middle",
            fill: c.bg,
          },
        );
      }
      if (e.when)
        sheet.box(
          { runs: [{ text: e.when }] },
          { x: cx - ew / 2 + 0.05, y: a.y, w: ew - 0.1, h: 0.22 },
          {
            size: PT.label * k,
            mono: true,
            bold: true,
            color: c.muted,
            align: "center",
          },
        );
      sheet.box(
        eventParas(e, c, hi),
        { x: cx - ew / 2 + 0.07, y: ly + 0.2, w: ew - 0.14, h: a.h - 0.55 },
        {
          ...o,
          align: "center",
        },
      );
    });
  },
};
