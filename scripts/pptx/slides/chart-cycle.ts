import type { ChartSlide } from "../../../types/slide";
import type { Sheet } from "../sheet";
import { PT, type Area } from "../stage";
import { curve } from "./chart-graph";

/** Draws the adoption curve and its labelled segment shares. */
export function drawCycle(sheet: Sheet, d: ChartSlide, a: Area): void {
  const { slide: s, c } = sheet;
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
}
