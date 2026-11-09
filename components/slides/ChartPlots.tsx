"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  getNiceTickValues,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ChartDataPoint, ChartSlide } from "../../types/slide";

/** `still` stops the growth animation, which a PDF would freeze mid-way. */
interface PlotProps {
  data: ChartSlide["data"];
  still: boolean;
  xLabel?: string;
  yLabel?: string;
}

const tick = { fill: "var(--color-text-muted)", fontSize: "var(--text-base)" };
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

/** The value axis's name above the plot, a note beside it, the category axis's name below. On a
 *  phone, where the frame grows with its text, the note stands below the chart and the plot keeps
 *  its height: beside the axis's name it took seven lines and left 88 px of plot. */
function Axes({
  xLabel,
  yLabel,
  note,
  children,
}: Pick<PlotProps, "xLabel" | "yLabel"> & { note?: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {(yLabel || note) && (
        <div className="mb-2 flex justify-between gap-8 text-base text-text-muted max-md:contents">
          <p className="max-md:mb-2 max-md:empty:hidden">{yLabel}</p>
          {note && (
            <p className="text-right max-md:order-last max-md:mt-2 max-md:text-left">{note}</p>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 max-md:h-82 max-md:flex-none">{children}</div>
      {xLabel && <p className="mt-1 text-center text-base text-text-muted">{xLabel}</p>}
    </div>
  );
}

/** A trend's value axis, both series on recharts' nice ticks over [0, auto]: TrendPlot draws its
 *  axis on them and the PowerPoint export its chart, so the two agree. */
export function trendTicks(data: ChartDataPoint[]): number[] {
  const values = data.flatMap((d) => [d.value, d.value2 ?? 0]);
  return getNiceTickValues([Math.min(0, ...values), Math.max(0, ...values)], 5, true);
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
  const two = data.some((d) => d.value2 !== undefined);
  const now = data.findIndex((d) => d.name === currentMarker);
  const rows = data.map((d, i) => ({
    name: d.name,
    value: now < 0 || i <= now ? d.value : undefined,
    value2: now < 0 || i <= now ? d.value2 : undefined,
    plan: now >= 0 && i >= now ? d.value : undefined,
    plan2: now >= 0 && i >= now ? d.value2 : undefined,
  }));
  const series = [
    {
      key: "value",
      plan: "plan",
      name: seriesLabel,
      stroke: "var(--color-teal)",
      fill: two ? 0 : 0.07,
    },
    ...(two
      ? [
          {
            key: "value2",
            plan: "plan2",
            name: series2Label,
            stroke: "var(--color-secondary)",
            fill: 0,
          },
        ]
      : []),
  ];
  const { ref, layout } = useTickLayout(
    data.map((d) => String(d.name)),
    SIDE.left + Y_WIDTH,
    SIDE.right,
    true,
  );
  // A point's label centres on it, so the first and last labels overhang the plot by half their
  // width: the axis pads each end by what the margin beside it leaves over.
  const [first, last] = layout?.edges ?? [0, 0];
  const padding = {
    left: Math.max(POINT_PAD, Math.ceil(first / 2 - Y_WIDTH - SIDE.left)),
    right: Math.max(8, Math.ceil(last / 2 - SIDE.right)),
  };
  const ticks = trendTicks(data);
  const line = {
    isAnimationActive: still ? false : ("auto" as const),
    type: "monotone" as const,
    strokeWidth: 4,
  };
  return (
    <Axes xLabel={xLabel} yLabel={yLabel} note={futureNote}>
      <div ref={ref} className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{
              top: 12,
              ...SIDE,
              left: SIDE.left + (layout?.overhang ?? 0),
              bottom: 8,
            }}
          >
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={<AxisTick layout={layout} marked={now} />}
              axisLine={{ stroke: "var(--color-border-strong)" }}
              tickLine={false}
              tickMargin={TICK_GAP}
              height={Math.max(56, Math.ceil((layout?.height ?? 0) + TICK_GAP))}
              padding={padding}
              interval={0}
            />
            <YAxis
              tick={tick}
              ticks={ticks}
              domain={[ticks[0], ticks[ticks.length - 1]]}
              axisLine={false}
              tickLine={false}
              width={Y_WIDTH}
            />
            {/* The marked point is both measured and planned: it lists once, as measured. */}
            <Tooltip
              {...tooltip}
              itemStyle={{ color: "var(--color-text)" }}
              payloadUniqBy={(entry) => String(entry.dataKey).replace("plan", "value")}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                {...line}
                dataKey={s.key}
                name={s.name}
                stroke={s.stroke}
                fill={s.stroke}
                fillOpacity={s.fill}
              />
            ))}
            {now >= 0 &&
              series.map((s) => (
                <Area
                  key={`${s.key}-plan`}
                  {...line}
                  dataKey={s.plan}
                  name={`${s.name ?? s.key} (planned)`}
                  stroke={s.stroke}
                  strokeDasharray="12 10"
                  fillOpacity={0}
                />
              ))}
            {/* The marked point names itself on the axis, in its own colour, and a guide runs
                down to its name: a name over the point ran into the value axis at the first. */}
            {now >= 0 && (
              <>
                <ReferenceLine
                  segment={[
                    { x: data[now].name, y: ticks[0] },
                    { x: data[now].name, y: data[now].value },
                  ]}
                  stroke="var(--color-teal)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <ReferenceDot
                  x={data[now].name}
                  y={data[now].value}
                  r={8}
                  fill="var(--color-teal)"
                  stroke="var(--color-white)"
                  strokeWidth={3}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Axes>
  );
}

const TICK_STEPS = [tick.fontSize, "var(--text-sm)", "var(--text-xs)"];
// Recharts takes this share of each band from either side of its bar; a label's band keeps
// one side's share of the gap between two bars.
const BAR_GAP = 0.1;
const Y_WIDTH = 64;
/** The room a trend's x axis keeps before its first point. */
const POINT_PAD = 24;
const SIDE = { left: 8, right: 30 };
const LINE = 1.2;
const ANGLE = 40;

export interface TickLayout {
  /** Index into TICK_STEPS. */
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
  for (let step = 0; step < TICK_STEPS.length; step++) {
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
  return { step: TICK_STEPS.length - 1, lines: labels.map((l) => [l]), angled: true };
}

/** The tick layout for the plot's width, measured in the browser; one line at the first step
 *  until then. `left` and `right` are the plot's widths beside the bars' bands; `points` spaces
 *  the labels a trend's points apart, one gap fewer than its labels, instead of a band each. */
function useTickLayout(labels: string[], left: number, right: number, points = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<
    TickLayout & { height: number; overhang: number; edges: [number, number] }
  >();
  const key = JSON.stringify(labels);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const update = () => {
      const { fontFamily, fontWeight } = getComputedStyle(el);
      // The steps scale with the stage, so they are read again on every resize, in one pass.
      const probes = TICK_STEPS.map((size) => {
        const probe = el.appendChild(document.createElement("span"));
        probe.style.fontSize = size;
        return probe;
      });
      const px = probes.map((probe) => parseFloat(getComputedStyle(probe).fontSize));
      for (const probe of probes) probe.remove();
      const names: string[] = JSON.parse(key);
      const category =
        (el.clientWidth - left - right) / Math.max(1, names.length - (points ? 1 : 0));
      // Points have no bar between their labels: a gap's share on either side keeps them apart.
      const band = category * (1 - (points ? 2 : 1) * BAR_GAP);
      const next = tickLayout(names, band, (text, step) => {
        ctx.font = `${fontWeight} ${px[step]}px ${fontFamily}`;
        return ctx.measureText(text).width;
      });
      const size = px[next.step];
      ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
      const angle = (ANGLE * Math.PI) / 180;
      const widths = next.lines.map(([l]) => ctx.measureText(l).width);
      // The widest line of the first and the last label, which a plot of points centres on its
      // ends; an angled label ends on its point, so only the overhang below moves the plot.
      const widest = (lines: string[] = []) =>
        Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
      const edges: [number, number] = next.angled
        ? [0, 0]
        : [widest(next.lines[0]), widest(next.lines[next.lines.length - 1])];
      const reach = (widths[0] ?? 0) * Math.cos(angle);
      const measured = {
        ...next,
        height: next.angled
          ? Math.max(...widths) * Math.sin(angle) + size * 2
          : Math.max(...next.lines.map((l) => l.length)) * size * LINE + size,
        // An angled first label runs left of its bar or point: the plot moves right to keep it
        // whole. A bar's overhang narrows every band by its share, so the first one is measured
        // narrowed; a first point stands the axis's padding in from the plot's edge.
        overhang: !next.angled
          ? 0
          : points
            ? Math.max(0, reach - left - POINT_PAD)
            : Math.max(0, (reach - category / 2 - left) / (1 - 1 / (2 * names.length))),
        edges,
      };
      setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(measured) ? prev : measured));
    };
    // The observer reports the element's size once as it starts, which lays the labels out.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // A web font still loading measures wider once it arrives.
    if (document.fonts?.status === "loading") void document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [key, left, right, points]);
  return { ref, layout };
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
  const lines = (layout && index !== undefined && layout.lines[index]) || [payload?.value ?? ""];
  return (
    <text
      x={x}
      y={y}
      textAnchor={layout?.angled ? "end" : "middle"}
      transform={layout?.angled ? `rotate(-${ANGLE} ${x} ${y})` : undefined}
      fill={on ? "var(--color-teal)" : tick.fill}
      fontWeight={on ? 700 : undefined}
      fontSize={TICK_STEPS[layout?.step ?? 0]}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i ? `${LINE}em` : 0} dominantBaseline="text-before-edge">
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function BarPlot({
  data,
  still,
  xLabel,
  yLabel,
  labelled,
}: PlotProps & {
  /** Bars carry their value on top and drop the value axis and grid. */
  labelled?: boolean;
}) {
  const { ref, layout } = useTickLayout(
    (data ?? []).map((d) => String(d.name)),
    SIDE.left + (labelled ? 0 : Y_WIDTH),
    SIDE.right,
  );
  const margin = {
    top: labelled ? 40 : 12,
    right: SIDE.right,
    left: SIDE.left + (layout?.overhang ?? 0),
    bottom: 8,
  };
  return (
    <Axes xLabel={xLabel} yLabel={labelled ? undefined : yLabel}>
      <div ref={ref} className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={margin} barCategoryGap={`${BAR_GAP * 100}%`}>
            {!labelled && <CartesianGrid stroke="var(--color-border)" vertical={false} />}
            <XAxis
              dataKey="name"
              tick={<AxisTick layout={layout} />}
              axisLine={{ stroke: "var(--color-border-strong)" }}
              tickLine={false}
              tickMargin={TICK_GAP}
              height={Math.max(56, Math.ceil((layout?.height ?? 0) + TICK_GAP))}
              interval={0}
            />
            <YAxis hide={labelled} tick={tick} axisLine={false} tickLine={false} width={Y_WIDTH} />
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
              {labelled && (
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={10}
                  fill="var(--color-text)"
                  fontSize="var(--text-lg)"
                  fontWeight={700}
                  className="font-heading"
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Axes>
  );
}
