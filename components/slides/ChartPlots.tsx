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
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ChartSlide } from "../../types/slide";

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

function Axes({
  xLabel,
  yLabel,
  note,
  children,
}: Pick<PlotProps, "xLabel" | "yLabel"> & { note?: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {(yLabel || note) && (
        <div className="mb-2 flex justify-between gap-8 text-base text-text-muted">
          <p>{yLabel}</p>
          {note && <p className="text-right">{note}</p>}
        </div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
      {xLabel && <p className="mt-1 text-center text-base text-text-muted">{xLabel}</p>}
    </div>
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
  const line = {
    isAnimationActive: still ? false : ("auto" as const),
    type: "monotone" as const,
    strokeWidth: 4,
  };
  return (
    <Axes xLabel={xLabel} yLabel={yLabel} note={futureNote}>
      <ResponsiveContainer width="100%" height="100%">
        {/* A marked plot keeps room above it for the marker's name on the highest point. */}
        <AreaChart data={rows} margin={{ top: now < 0 ? 12 : 48, ...SIDE, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={<AxisTick />}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
            tickMargin={TICK_GAP}
            height={56}
            padding={{ left: 24, right: 8 }}
          />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={Y_WIDTH} />
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
          {now >= 0 && (
            <ReferenceDot
              x={data[now].name}
              y={data[now].value}
              r={8}
              fill="var(--color-teal)"
              stroke="var(--color-white)"
              strokeWidth={3}
              label={{
                value: data[now].name,
                position: "top",
                offset: 16,
                fill: "var(--color-teal)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                className: "font-heading",
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Axes>
  );
}

const TICK_STEPS = [tick.fontSize, "var(--text-sm)", "var(--text-xs)"];
// Recharts takes this share of each band from either side of its bar; a label's band keeps
// one side's share of the gap between two bars.
const BAR_GAP = 0.1;
const Y_WIDTH = 64;
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
 *  until then. `left` and `right` are the plot's widths beside the bars' bands. */
function useTickLayout(labels: string[], left: number, right: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TickLayout & { height: number; overhang: number }>();
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
      const category = (el.clientWidth - left - right) / names.length;
      const band = category * (1 - BAR_GAP);
      const next = tickLayout(names, band, (text, step) => {
        ctx.font = `${fontWeight} ${px[step]}px ${fontFamily}`;
        return ctx.measureText(text).width;
      });
      const size = px[next.step];
      ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
      const angle = (ANGLE * Math.PI) / 180;
      const widths = next.lines.map(([l]) => ctx.measureText(l).width);
      const measured = {
        ...next,
        height: next.angled
          ? Math.max(...widths) * Math.sin(angle) + size * 2
          : Math.max(...next.lines.map((l) => l.length)) * size * LINE + size,
        // An angled first label runs left of its bar: the plot moves right to keep it whole.
        // The overhang narrows every band by its share, so the first one is measured narrowed.
        overhang: next.angled
          ? Math.max(
              0,
              (widths[0] * Math.cos(angle) - category / 2 - left) / (1 - 1 / (2 * names.length)),
            )
          : 0,
      };
      setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(measured) ? prev : measured));
    };
    // The observer reports the element's size once as it starts, which lays the labels out.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // A web font still loading measures wider once it arrives.
    if (document.fonts?.status === "loading") void document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [key, left, right]);
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
}: {
  x?: number;
  y?: number;
  index?: number;
  payload?: { value: string };
  layout?: TickLayout;
}) {
  const lines = (layout && index !== undefined && layout.lines[index]) || [payload?.value ?? ""];
  return (
    <text
      x={x}
      y={y}
      textAnchor={layout?.angled ? "end" : "middle"}
      transform={layout?.angled ? `rotate(-${ANGLE} ${x} ${y})` : undefined}
      fill={tick.fill}
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
