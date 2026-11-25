"use client";

import {
  AreaChart,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  getNiceTickValues,
  Tooltip,
} from "recharts";
import type { ChartDataPoint, ChartSlide } from "../../types/slide";
import {
  CHART_BAR_GAP,
  CHART_CATEGORY_SPACING,
  CHART_SIDE_MARGINS,
  CHART_TICK_ANGLE,
  CHART_TICK_LINE_HEIGHT,
  CHART_TICK_STEPS,
  TREND_VALUE_AXIS_WIDTH,
  trendCategoryPadding,
  useChartCategoryLabels,
  type MeasuredChartLabels,
} from "./ChartCategoryLabels";
import { LabeledPlot } from "./LabeledPlot";
import { TrendReference, TrendSeries, trendTimeline } from "./TrendSeries";

/** `still` stops the growth animation, which a PDF would freeze mid-way. */
interface PlotProps {
  data: ChartSlide["data"];
  still: boolean;
  xLabel?: string;
  yLabel?: string;
}

const tick = { fill: "var(--color-text-muted)", fontSize: CHART_TICK_STEPS[0] };
/** The least room between the axis line and a category label's box; recharts adds its 6 px tick. */
export const TICK_GAP = 12;
const tooltip = {
  contentStyle: {
    backgroundColor: "var(--color-white)",
    border: "var(--slide-chart-tooltip-border)",
    borderRadius: "var(--radius-brand)",
    fontSize: "var(--text-xs)",
    boxShadow: "var(--shadow-overlay)",
  },
  labelStyle: { color: "var(--color-text)" },
};

/** A trend's value axis, both series on recharts' nice ticks over [0, auto]: TrendPlot draws its
 *  axis on them and the PowerPoint export its chart, so the two agree. */
export function trendTicks(data: ChartDataPoint[]): number[] {
  const values = data.flatMap((d) => [d.value, d.value2 ?? 0]);
  return getNiceTickValues([Math.min(0, ...values), Math.max(0, ...values)], 5, true);
}

function ChartCategoryAxis({
  layout,
  marked,
  padding,
}: {
  layout?: MeasuredChartLabels;
  marked?: number;
  padding?: { left: number; right: number };
}) {
  return (
    <XAxis
      dataKey="name"
      tick={<AxisTick layout={layout} marked={marked} />}
      axisLine={{ stroke: "var(--color-border-strong)" }}
      tickLine={false}
      tickMargin={TICK_GAP}
      height={Math.max(56, Math.ceil((layout?.height ?? 0) + TICK_GAP))}
      padding={padding}
      interval={0}
    />
  );
}

export function TrendPlot({
  data = [],
  still,
  xLabel,
  yLabel,
  currentMarker,
  futureNote,
  seriesLabel = yLabel,
  series2Label,
}: PlotProps & Pick<ChartSlide, "currentMarker" | "futureNote" | "seriesLabel" | "series2Label">) {
  const { ref, layout } = useChartCategoryLabels(
    data.map((point) => String(point.name)),
    CHART_CATEGORY_SPACING.points,
    tickLayout,
  );
  return (
    <LabeledPlot xLabel={xLabel} yLabel={yLabel} note={futureNote} plotRef={ref}>
      <TrendAreaChart
        data={data}
        still={still}
        currentMarker={currentMarker}
        seriesLabel={seriesLabel}
        series2Label={series2Label}
        layout={layout}
      />
    </LabeledPlot>
  );
}

function TrendAreaChart({
  data,
  still,
  currentMarker,
  seriesLabel,
  series2Label,
  layout,
}: Pick<ChartSlide, "currentMarker" | "seriesLabel" | "series2Label"> & {
  data: ChartDataPoint[];
  still: boolean;
  layout?: MeasuredChartLabels;
}) {
  const { marked, rows } = trendTimeline(data, currentMarker);
  const ticks = trendTicks(data);
  const padding = trendCategoryPadding(layout?.edges);
  return (
    <AreaChart
      data={rows}
      margin={{
        top: 12,
        ...CHART_SIDE_MARGINS,
        left: CHART_SIDE_MARGINS.left + (layout?.overhang ?? 0),
        bottom: 8,
      }}
    >
      <CartesianGrid stroke="var(--color-border)" vertical={false} />
      <ChartCategoryAxis layout={layout} marked={marked} padding={padding} />
      <TrendValueAxis ticks={ticks} />
      {/* The marked point is both measured and planned: it lists once, as measured. */}
      <Tooltip
        {...tooltip}
        itemStyle={{ color: "var(--color-text)" }}
        payloadUniqBy={(entry) => String(entry.dataKey).replace("plan", "value")}
      />
      <TrendSeries
        data={data}
        still={still}
        planned={marked >= 0}
        seriesLabel={seriesLabel}
        series2Label={series2Label}
      />
      {marked >= 0 && <TrendReference point={data[marked]} floor={ticks[0]} />}
    </AreaChart>
  );
}

function TrendValueAxis({ ticks }: { ticks: number[] }) {
  return (
    <YAxis
      tick={tick}
      ticks={ticks}
      domain={[ticks[0], ticks[ticks.length - 1]]}
      axisLine={false}
      tickLine={false}
      width={TREND_VALUE_AXIS_WIDTH}
    />
  );
}

export interface TickLayout {
  /** Index into CHART_TICK_STEPS. */
  step: number;
  /** Each label's lines, one when angled. */
  lines: string[][];
  angled: boolean;
}

/** Wraps every label at its band width in the first font step where every word fits the band,
 *  else angles them all one line each at the last step. `widthAt` measures a text at a step. */
export function tickLayout(
  labels: string[],
  band: number,
  widthAt: (text: string, step: number) => number,
): TickLayout {
  const words = labels.map((label) => label.split(" "));
  for (let step = 0; step < CHART_TICK_STEPS.length; step++) {
    if (!words.flat().every((word) => widthAt(word, step) <= band)) continue;
    const lines = words.map((ws) =>
      ws.reduce<string[]>((acc, word) => {
        const joined = acc.length ? `${acc[acc.length - 1]} ${word}` : word;
        if (acc.length && widthAt(joined, step) <= band) acc[acc.length - 1] = joined;
        else acc.push(word);
        return acc;
      }, []),
    );
    return { step, lines, angled: false };
  }
  return { step: CHART_TICK_STEPS.length - 1, lines: labels.map((l) => [l]), angled: true };
}

/** A category label, its box hanging from the tick: each line carries the baseline itself, since
 *  WebKit drops a text's dominant-baseline on the tspans inside it and set the label on the axis. */
export function AxisTick({
  x,
  y,
  index,
  payload,
  layout,
  marked,
}: {
  x?: number;
  y?: number;
  index?: number;
  payload?: { value: string };
  layout?: TickLayout;
  /** The index of the marked category, which takes the marker's colour and weight. */
  marked?: number;
}) {
  const on = marked !== undefined && marked === index;
  const placement = layout?.angled
    ? ({ textAnchor: "end", transform: `rotate(-${CHART_TICK_ANGLE} ${x} ${y})` } as const)
    : ({ textAnchor: "middle" } as const);
  const appearance = on ? { fill: "var(--color-teal)", fontWeight: 700 } : { fill: tick.fill };
  return (
    <text x={x} y={y} {...placement} {...appearance} fontSize={CHART_TICK_STEPS[layout?.step ?? 0]}>
      <AxisTickLines x={x} index={index} payload={payload} layout={layout} />
    </text>
  );
}

function AxisTickLines({
  x,
  index,
  payload,
  layout,
}: Pick<Parameters<typeof AxisTick>[0], "x" | "index" | "payload" | "layout">) {
  const lines = (layout && index !== undefined && layout.lines[index]) || [payload?.value ?? ""];
  return lines.map((line, i) => (
    <tspan
      key={i}
      x={x}
      dy={i ? `${CHART_TICK_LINE_HEIGHT}em` : 0}
      dominantBaseline="text-before-edge"
    >
      {line}
    </tspan>
  ));
}

/** A phone's bar chart whose names would only fit its bands angled: each bar a row under its whole
 *  name, the value at the row's end, since eight angled names took the plot's whole height. */
function BarRows({ data = [] }: Pick<PlotProps, "data">) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={String(d.name)} className="flex flex-col gap-1">
          <p className="flex items-baseline justify-between gap-4 text-base text-text">
            <span>{d.name}</span>
            <span className="font-heading font-bold tabular-nums">{d.value}</span>
          </p>
          <div
            className="h-3 rounded-r-sm bg-primary"
            style={{ width: `${(Math.max(0, d.value) / max) * 100}%` }}
          />
        </li>
      ))}
    </ul>
  );
}

/** Bars carry their value on top, with no value axis or grid: `yLabel` names what the values
 *  count, above the plot. */
export function BarPlot({ data, still, xLabel, yLabel }: PlotProps) {
  const { ref, layout } = useChartCategoryLabels(
    (data ?? []).map((d) => String(d.name)),
    CHART_CATEGORY_SPACING.bars,
    tickLayout,
  );
  const rows = layout?.angled && layout.narrow;
  return (
    <LabeledPlot xLabel={xLabel} yLabel={yLabel} rows={rows} plotRef={ref}>
      {rows ? <BarRows data={data} /> : <BarColumns data={data} still={still} layout={layout} />}
    </LabeledPlot>
  );
}

function BarColumns({
  data,
  still,
  layout,
}: Pick<PlotProps, "data" | "still"> & { layout?: MeasuredChartLabels }) {
  const margin = {
    top: 40,
    right: CHART_SIDE_MARGINS.right,
    left: CHART_SIDE_MARGINS.left + (layout?.overhang ?? 0),
    bottom: 8,
  };
  return (
    <BarChart data={data} margin={margin} barCategoryGap={`${CHART_BAR_GAP * 100}%`}>
      <ChartCategoryAxis layout={layout} />
      <YAxis hide />
      <Tooltip
        cursor={{ fill: "var(--color-teal)", fillOpacity: 0.07 }}
        {...tooltip}
        itemStyle={{ color: "var(--color-text)" }}
      />
      <Bar
        isAnimationActive={still ? false : "auto"}
        dataKey="value"
        fill="var(--color-teal)"
        radius={[4, 4, 0, 0]}
      >
        <LabelList
          dataKey="value"
          position="top"
          offset={10}
          fill="var(--color-text)"
          fontSize="var(--text-lg)"
          fontWeight={700}
          className="font-heading"
        />
      </Bar>
    </BarChart>
  );
}
