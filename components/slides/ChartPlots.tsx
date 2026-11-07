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
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ChartSlide } from "../../types/slide";

/** The recharts plots of the chart slide, split from it so a deck page loads recharts only when it
 *  shows one of them. `still` stops the growth animation: a PDF would freeze it mid-way, and the
 *  slide a page load opens on shows at once, as every other entrance on it does.
 *  Series take the brand's chart order (teal, then purple), never a status colour; ticks and axis
 *  labels stay in muted ink at body size, the grid is a recessive horizontal rule, and an area is
 *  a flat 7 % tint under a single series, none under two. */
interface PlotProps {
  data: ChartSlide["data"];
  still: boolean;
  xLabel?: string;
  yLabel?: string;
}

const tick = { fill: "var(--color-text-muted)", fontSize: "var(--text-base)" };
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
  children,
}: Pick<PlotProps, "xLabel" | "yLabel"> & { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {yLabel && <p className="mb-2 text-base text-text-muted">{yLabel}</p>}
      <div className="min-h-0 flex-1">{children}</div>
      {xLabel && <p className="mt-1 text-center text-base text-text-muted">{xLabel}</p>}
    </div>
  );
}

export function TrendPlot({ data, still, xLabel, yLabel }: PlotProps) {
  const two = data?.some((d) => d.value2 !== undefined) ?? false;
  return (
    <Axes xLabel={xLabel} yLabel={yLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={tick}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
            tickMargin={12}
            height={56}
            padding={{ left: 24, right: 8 }}
          />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={64} />
          <Tooltip {...tooltip} itemStyle={{ color: "var(--color-text)" }} />
          <Area
            isAnimationActive={still ? false : "auto"}
            type="monotone"
            dataKey="value"
            stroke="var(--color-teal)"
            strokeWidth={4}
            fill="var(--color-teal)"
            fillOpacity={two ? 0 : 0.07}
          />
          {two && (
            <Area
              isAnimationActive={still ? false : "auto"}
              type="monotone"
              dataKey="value2"
              stroke="var(--color-secondary)"
              strokeWidth={4}
              fillOpacity={0}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Axes>
  );
}

// A tick label's font steps, down to the brand's label size, each taken when a word of the one
// before is wider than its bar's band.
const TICK_STEPS = [tick.fontSize, "var(--text-sm)", "var(--text-xs)"];
// The bars' gap, a share of each band; the labels keep half of it between them.
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
      const band = ((el.clientWidth - left - right) / names.length) * (1 - BAR_GAP / 2);
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
              (widths[0] * Math.cos(angle) - band / 2 - left) / (1 - 1 / (2 * names.length)),
            )
          : 0,
      };
      // A resize that leaves the labels as they were re-renders nothing.
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

function WrappedTick({
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
      dominantBaseline="hanging"
      fill={tick.fill}
      fontSize={TICK_STEPS[layout?.step ?? 0]}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i ? `${LINE}em` : 0}>
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
            {/* Each label wraps inside its bar's band, so long names side by side never overlap. */}
            <XAxis
              dataKey="name"
              tick={<WrappedTick layout={layout} />}
              axisLine={{ stroke: "var(--color-border-strong)" }}
              tickLine={false}
              tickMargin={12}
              height={Math.max(56, Math.ceil((layout?.height ?? 0) + 12))}
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
