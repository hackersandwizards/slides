import type PptxGenJS from "pptxgenjs";
import type { ChartSlide } from "../../../types/slide";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { PT, type Area } from "../stage";

/** A function over [0, 1] drawn as a polyline in the area, its values in [0, 1] from the bottom,
 *  with the area under it tinted. */
export function curve(sheet: Sheet, g: Area, f: (t: number) => number) {
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

/** The graph's marked point and the box for its label. */
export function graphMarker(g: Area) {
  const t = 60 / 99;
  const mx = g.x + t * g.w;
  const my = g.y + g.h - (Math.exp(t * 3) / Math.exp(3)) * g.h;
  return {
    point: { x: mx - 0.09, y: my - 0.09, w: 0.18, h: 0.18 },
    label: { x: mx - 1.6, y: my - 0.4, w: 1.5, h: 0.3 },
  };
}

/** Caption boxes along the two graph axes and across the upper half of the plot. */
export function graphCaptions(d: ChartSlide, a: Area, g: Area) {
  return [
    {
      text: d.xLabel,
      area: { x: g.x, y: g.y + g.h + 0.1, w: g.w, h: 0.3 },
      options: { align: "center" },
    },
    {
      text: d.yLabel,
      area: { x: a.x, y: g.y + g.h / 2 - 0.3, w: 1.4, h: 0.6 },
      options: { align: "right", valign: "middle" },
    },
    {
      text: d.futureNote,
      area: { x: g.x + 0.1, y: g.y, w: g.w / 2, h: 0.3 },
      options: {},
    },
  ] as const;
}

/** Draws a rising graph with its axes, labels and optional marked point. */
export function drawGraph(sheet: Sheet, d: ChartSlide, a: Area): void {
  const { slide: s, c } = sheet;
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
  for (const { text, area, options } of graphCaptions(d, a, g)) {
    if (text) sheet.box(text, area, { size: PT.sm, color: c.muted, ...options });
  }
  if (d.currentMarker) {
    const { point, label } = graphMarker(g);
    s.addShape("ellipse", {
      ...point,
      fill: { color: c.teal },
      line: { color: c.card, width: 1.5 },
    });
    sheet.box(d.currentMarker, label, {
      size: PT.sm,
      mono: true,
      bold: true,
      color: c.teal,
      align: "right",
    });
  }
}
