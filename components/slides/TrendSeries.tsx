import { useContext } from "react";
import { Area, ReferenceDot, ReferenceLine } from "recharts";
import type { ChartDataPoint, ChartSlide } from "../../types/slide";
import { WORDS } from "../../lib/slide-words";
import { DeckLang } from "./SlideShell";

export function trendTimeline(data: ChartDataPoint[], marker?: string) {
  const marked = data.findIndex((point) => point.name === marker);
  const measuredThrough = marked < 0 ? data.length : marked;
  const rows = data.map((point, index) => {
    const measured = index <= measuredThrough ? point : undefined;
    const planned = marked >= 0 && index >= marked ? point : undefined;
    return {
      name: point.name,
      value: measured?.value,
      value2: measured?.value2,
      plan: planned?.value,
      plan2: planned?.value2,
    };
  });
  return { marked, rows };
}

interface TrendSeriesProps extends Pick<ChartSlide, "seriesLabel" | "series2Label"> {
  data: ChartDataPoint[];
  still: boolean;
  planned: boolean;
}

interface TrendAreaStyle {
  key: string;
  plan: string;
  name?: string;
  stroke: string;
  fill: number;
}

const trendLineStyle = { type: "monotone", strokeWidth: 4 } as const;

function PlannedTrendAreas({ series, still }: { series: TrendAreaStyle[]; still: boolean }) {
  const lang = useContext(DeckLang);
  return series.map((s) => (
    <Area
      key={`${s.key}-plan`}
      {...trendLineStyle}
      isAnimationActive={still ? false : "auto"}
      dataKey={s.plan}
      name={`${s.name ?? s.key} (${WORDS[lang].planned})`}
      stroke={s.stroke}
      strokeDasharray="12 10"
      fillOpacity={0}
    />
  ));
}

export function TrendSeries({ data, still, planned, seriesLabel, series2Label }: TrendSeriesProps) {
  const two = data.some((point) => point.value2 !== undefined);
  const series: TrendAreaStyle[] = [
    {
      key: "value",
      plan: "plan",
      name: seriesLabel,
      stroke: "var(--color-teal)",
      fill: two ? 0 : 0.07,
    },
  ];
  if (two)
    series.push({
      key: "value2",
      plan: "plan2",
      name: series2Label,
      stroke: "var(--color-secondary)",
      fill: 0,
    });
  return (
    <>
      {series.map((s) => (
        <Area
          key={s.key}
          {...trendLineStyle}
          isAnimationActive={still ? false : "auto"}
          dataKey={s.key}
          name={s.name}
          stroke={s.stroke}
          fill={s.stroke}
          fillOpacity={s.fill}
        />
      ))}
      {planned && <PlannedTrendAreas series={series} still={still} />}
    </>
  );
}

/** The marked point names itself on the axis, in its own colour, and a guide runs
 *  down to its name: a name over the point ran into the value axis at the first. */
export function TrendReference({ point, floor }: { point: ChartDataPoint; floor: number }) {
  return (
    <>
      <ReferenceLine
        segment={[
          { x: point.name, y: floor },
          { x: point.name, y: point.value },
        ]}
        stroke="var(--color-teal)"
        strokeWidth={2}
        strokeDasharray="4 4"
      />
      <ReferenceDot
        x={point.name}
        y={point.value}
        r={8}
        fill="var(--color-teal)"
        stroke="var(--color-white)"
        strokeWidth={3}
      />
    </>
  );
}
