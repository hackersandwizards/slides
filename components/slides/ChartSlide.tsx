"use client";

import { lazy, Suspense } from "react";
import { useChartPlotMotion } from "../../lib/use-chart-plot-motion";
import type { ChartSlide as ChartSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { ChartFrame, TitledContent } from "./primitives";
import { CycleVariant, GraphVariant } from "./ChartDrawing";
// recharts is most of a deck page's script and only the trend and bar charts use it, after mount:
// it loads with the first of them.
const TrendPlot = lazy(() => import("./ChartPlots").then((m) => ({ default: m.TrendPlot })));
const BarPlot = lazy(() => import("./ChartPlots").then((m) => ({ default: m.BarPlot })));

interface Props {
  slide: ChartSlideType;
}

/** What the chart shows, in a line under it whatever its variant. */
function Annotation({ text }: { text: string }) {
  return (
    <p className="mt-6 max-w-5xl text-center text-2xl font-medium text-balance text-secondary">
      {text}
    </p>
  );
}

function TrendVariant({ slide }: { slide: ChartSlideType }) {
  const { data, seriesLabel, series2Label } = slide;
  const { mounted, still } = useChartPlotMotion();

  return (
    <div className="w-full max-w-5xl">
      {(seriesLabel || series2Label) && (
        <BlurFade delay={0.25} duration={0.5}>
          <div className="mb-4 flex items-center justify-center gap-8">
            {seriesLabel && (
              <span className="flex items-center gap-2 text-base font-semibold text-text">
                <span className="h-1 w-8 bg-teal" />
                {seriesLabel}
              </span>
            )}
            {series2Label && (
              <span className="flex items-center gap-2 text-base font-semibold text-text">
                <span className="h-1 w-8 bg-secondary" />
                {series2Label}
              </span>
            )}
          </div>
        </BlurFade>
      )}
      <BlurFade delay={0.3} duration={0.8}>
        <ChartFrame>
          {mounted && (
            <Suspense fallback={null}>
              <TrendPlot
                data={data}
                still={still}
                xLabel={slide.xLabel}
                yLabel={slide.yLabel}
                currentMarker={slide.currentMarker}
                futureNote={slide.futureNote}
                seriesLabel={slide.seriesLabel}
                series2Label={slide.series2Label}
              />
            </Suspense>
          )}
        </ChartFrame>
      </BlurFade>
    </div>
  );
}

function BarVariant({ slide }: { slide: ChartSlideType }) {
  const { data } = slide;
  const { mounted, still } = useChartPlotMotion();

  return (
    <div className="w-full max-w-5xl">
      <BlurFade delay={0.3} duration={0.8}>
        <ChartFrame>
          {mounted && (
            <Suspense fallback={null}>
              <BarPlot data={data} still={still} xLabel={slide.xLabel} yLabel={slide.yLabel} />
            </Suspense>
          )}
        </ChartFrame>
      </BlurFade>
    </div>
  );
}

export function ChartSlide({ slide }: Props) {
  return (
    <SlideShell direction="col">
      <TitledContent
        layout="inset"
        titled={Boolean(slide.headline)}
        heading={{
          sectionLabel: slide.sectionLabel,
          headline: slide.headline || undefined,
          duration: 0.6,
        }}
      >
        <div className="slide-body items-center">
          {slide.variant === "cycle" && <CycleVariant slide={slide} />}
          {slide.variant === "graph" && <GraphVariant slide={slide} />}
          {slide.variant === "trend" && <TrendVariant slide={slide} />}
          {slide.variant === "bar" && <BarVariant slide={slide} />}
          {slide.annotation && (
            <BlurFade delay={0.5} duration={0.6}>
              <Annotation text={slide.annotation} />
            </BlurFade>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
