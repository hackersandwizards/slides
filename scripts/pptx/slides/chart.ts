import type { ChartSlide } from "../../../types/slide";
import { header } from "../chrome";
import type { Sheet } from "../sheet";
import { BODY } from "../stage";
import { drawCycle } from "./chart-cycle";
import { drawGraph } from "./chart-graph";
import { drawPlot } from "./chart-plot";

const CHARTS = { plot: drawPlot, cycle: drawCycle, graph: drawGraph };

/** Empty native plots use the same graph as other non-cycle variants. */
export function chartKind(d: ChartSlide): keyof typeof CHARTS {
  if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) return "plot";
  return d.variant === "cycle" ? "cycle" : "graph";
}

export function drawChart(sheet: Sheet, d: ChartSlide): void {
  CHARTS[chartKind(d)](sheet, d, BODY(header(sheet, d)));
}
