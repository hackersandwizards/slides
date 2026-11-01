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
import type { ReactNode } from "react";
import type { ChartSlide } from "../../types/slide";

/** The recharts plots of the chart slide, split from it so a deck page loads recharts only when it
 *  shows one of them. `print` stops the growth animation, which a PDF would freeze mid-way.
 *  Series take the brand's chart order (teal, then purple), never a status colour; ticks and axis
 *  labels stay in muted ink at body size, the grid is a recessive horizontal rule, and an area is
 *  a flat 7 % tint under a single series, none under two. */
interface PlotProps {
  data: ChartSlide["data"];
  print: boolean;
  xLabel?: string;
  yLabel?: string;
  /** Bars carry their value on top and drop the value axis and grid. */
  labelled?: boolean;
}

const tick = { fill: "var(--color-text-muted)", fontSize: "var(--text-base)" };
const tooltip = {
  contentStyle: {
    backgroundColor: "var(--color-white)",
    border: "2px solid var(--color-primary-border)",
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

export function TrendPlot({ data, print, xLabel, yLabel }: PlotProps) {
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
            isAnimationActive={print ? false : "auto"}
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand)"
            strokeWidth={4}
            fill="var(--color-brand)"
            fillOpacity={two ? 0 : 0.07}
          />
          {two && (
            <Area
              isAnimationActive={print ? false : "auto"}
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

export function BarPlot({ data, print, xLabel, yLabel, labelled }: PlotProps) {
  return (
    <Axes xLabel={xLabel} yLabel={labelled ? undefined : yLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: labelled ? 40 : 12, right: 30, left: 8, bottom: 8 }}>
          {!labelled && <CartesianGrid stroke="var(--color-border)" vertical={false} />}
          <XAxis
            dataKey="name"
            tick={tick}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
            tickMargin={12}
            height={56}
            interval={0}
          />
          <YAxis hide={labelled} tick={tick} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            cursor={{ fill: "var(--color-brand)", fillOpacity: 0.07 }}
            {...tooltip}
            itemStyle={{ color: "var(--color-text)" }}
          />
          <Bar
            isAnimationActive={print ? false : "auto"}
            dataKey="value"
            fill="var(--color-brand)"
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
    </Axes>
  );
}
