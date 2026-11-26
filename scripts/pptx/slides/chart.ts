import type { ChartSlide, Slide } from "../../../types/slide";
import { header } from "../chrome";
import type { Sheet } from "../sheet";
import { EDGE, BOTTOM, CW, PT, BODY } from "../stage";
import { drawCycle } from "./chart-cycle";
import { drawGraph } from "./chart-graph";
import { drawPlot } from "./chart-plot";

const CHARTS = { plot: drawPlot, cycle: drawCycle, graph: drawGraph };

/** Empty native plots use the same graph as other non-cycle variants. */
export function chartKind(d: ChartSlide): keyof typeof CHARTS {
  if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) return "plot";
  return d.variant === "cycle" ? "cycle" : "graph";
}

export function drawChart(sheet: Sheet, d: Extract<Slide, { type: "chart" }>): void {
  const y = header(sheet, d);
  const kind = chartKind(d);
  const body = BODY(y);
  const area = kind === "plot" ? body : { ...body, h: BOTTOM - y - (d.annotation ? 0.4 : 0) };
  CHARTS[kind](sheet, d, area);
  // The web's `Annotation`, under the card or the drawing.
  if (kind !== "plot" && d.annotation)
    sheet.box(
      d.annotation,
      { x: EDGE, y: BOTTOM - 0.35, w: CW, h: 0.35 },
      { size: PT.base, color: sheet.c.purple, align: "center" },
    );
}
