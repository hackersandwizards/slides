"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartSlide } from "../../types/slide";

/** The recharts plots of the chart slide, split from it so a deck page loads recharts only when it
 *  shows one of them. `print` stops the growth animation, which a PDF would freeze mid-way. */
interface PlotProps {
  data: ChartSlide["data"];
  print: boolean;
}

export function TrendPlot({ data, print }: PlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 24 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="trendGradient2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-primary-border)" opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--color-text-subtle)", fontSize: "1.25rem" }}
          axisLine={{ stroke: "var(--color-text-subtle)" }}
          tickLine={false}
          tickMargin={14}
        />
        <YAxis
          tick={{ fill: "var(--color-text-subtle)", fontSize: "1.25rem" }}
          axisLine={{ stroke: "var(--color-text-subtle)" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-white)",
            border: "2px solid var(--color-primary-border)",
            borderRadius: "12px",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ color: "var(--color-text)" }}
          itemStyle={{ color: "var(--color-brand)" }}
        />
        <Area
          isAnimationActive={print ? false : "auto"}
          type="monotone"
          dataKey="value"
          stroke="var(--color-brand)"
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#trendGradient)"
        />
        {data?.some((d) => d.value2 !== undefined) && (
          <Area
            isAnimationActive={print ? false : "auto"}
            type="monotone"
            dataKey="value2"
            stroke="var(--color-warning)"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#trendGradient2)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarPlot({ data, print }: PlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 24 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-primary-border)"
          opacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--color-text-subtle)", fontSize: "1.25rem" }}
          axisLine={{ stroke: "var(--color-text-subtle)" }}
          tickLine={false}
          tickMargin={14}
          interval={0}
        />
        <YAxis
          tick={{ fill: "var(--color-text-subtle)", fontSize: "1.25rem" }}
          axisLine={{ stroke: "var(--color-text-subtle)" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-brand)", fillOpacity: 0.06 }}
          contentStyle={{
            backgroundColor: "var(--color-white)",
            border: "2px solid var(--color-primary-border)",
            borderRadius: "12px",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ color: "var(--color-text)" }}
          itemStyle={{ color: "var(--color-brand)" }}
        />
        <Bar
          isAnimationActive={print ? false : "auto"}
          dataKey="value"
          fill="var(--color-brand)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
