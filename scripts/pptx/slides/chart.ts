import type PptxGenJS from "pptxgenjs";
import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { EDGE, BOTTOM, CW, PT, BODY, type Area } from "../stage";
import { drawPlot } from "./chart-plot";

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
  const { c } = sheet;
  const y = header(sheet, d);
  if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) {
    drawPlot(sheet, d, BODY(y));
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
  // The web's `Annotation`, under the card or the drawing.
  if (d.annotation)
    sheet.box(
      d.annotation,
      { x: EDGE, y: BOTTOM - 0.35, w: CW, h: 0.35 },
      { size: PT.base, color: c.purple, align: "center" },
    );
}
