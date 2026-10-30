"use client";

import { lazy, Suspense, useMemo, useSyncExternalStore } from "react";
import { usePrintMode } from "../../lib/print-context";
import type { ChartSlide as ChartSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { useMounted } from "../../lib/use-mounted";
import { ChartFrame, SlideTitle, Wash } from "./primitives";
// recharts is most of a deck page's script and only the trend and bar charts use it, after mount:
// it loads with the first of them.
const TrendPlot = lazy(() => import("./ChartPlots").then((m) => ({ default: m.TrendPlot })));
const BarPlot = lazy(() => import("./ChartPlots").then((m) => ({ default: m.BarPlot })));

// Server and browser Math.exp differ in the last digits, and a hydrated attribute keeps the
// server's value, so unrounded curve points were a hydration mismatch on every chart slide.
const round = (n: number) => Math.round(n * 1e6) / 1e6;

interface Props {
  slide: ChartSlideType;
}

function Annotation({ text }: { text: string }) {
  return <p className="mt-6 text-center text-2xl font-medium text-secondary">{text}</p>;
}

function CycleVariant({ slide }: { slide: ChartSlideType }) {
  const segments = slide.segments ?? [];
  const currentSegmentIndex = slide.currentSegmentIndex ?? 0;

  const width = 900;
  const height = 320;
  const padding = 60;
  const graphWidth = width - padding * 2;
  const graphHeight = height - 80;

  const { pathD, bellCurve } = useMemo(() => {
    const bell = (x: number): number => {
      const mean = 0.5;
      const sigma = 0.18;
      return round(Math.exp(-0.5 * ((x - mean) / sigma) ** 2));
    };
    const pts = Array.from({ length: 200 }, (_, i) => {
      const t = i / 199;
      const x = padding + t * graphWidth;
      const y = height - 40 - bell(t) * graphHeight;
      return `${x},${y}`;
    });
    return { pathD: `M ${pts.join(" L ")}`, bellCurve: bell };
  }, [padding, graphWidth, height, graphHeight]);

  const dividers = segments.slice(0, -1).reduce<number[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + seg.percentage / 100);
    return acc;
  }, []);

  return (
    <BlurFade delay={0.2} duration={0.8} className="w-full max-w-[56.25rem]">
      {/* The percentage labels sit on the top edge of the box; overflow keeps their tops. */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="bell-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <path
          d={`${pathD} L ${padding + graphWidth},${height - 40} L ${padding},${height - 40} Z`}
          fill="url(#bell-gradient)"
          opacity={0.3}
        />

        <path d={pathD} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" />

        {dividers.map((pos, i) => {
          const x = padding + pos * graphWidth;
          return (
            <line
              key={i}
              x1={x}
              y1={height - 40}
              x2={x}
              y2={height - 40 - bellCurve(pos) * graphHeight}
              stroke="var(--color-text-muted)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          );
        })}

        {segments.map((seg, i) => {
          const start = i === 0 ? 0 : dividers[i - 1];
          const end = i === segments.length - 1 ? 1 : dividers[i];
          const mid = (start + end) / 2;
          const x = padding + mid * graphWidth;
          const isActive = i === currentSegmentIndex;

          return (
            <g key={i}>
              <text
                x={x}
                y={height - 22}
                textAnchor="middle"
                className="font-sans"
                fontSize="16"
                fill={isActive ? "var(--color-brand)" : "var(--color-text-muted)"}
                fontWeight={isActive ? 600 : 400}
              >
                {seg.label}
              </text>
              <text
                x={x}
                y={height - 2}
                textAnchor="middle"
                className="font-sans"
                fontSize="15"
                fill="var(--color-text-subtle)"
              >
                {seg.percentage}%
              </text>
              {isActive && (
                <>
                  <circle
                    cx={x}
                    cy={height - 40 - bellCurve(mid) * graphHeight}
                    r="6"
                    fill="var(--color-brand)"
                  />
                  {/* On the side the curve falls away from, so the label never crosses it. */}
                  <text
                    x={mid < 0.5 ? x - 14 : x + 14}
                    y={height - 40 - bellCurve(mid) * graphHeight - 14}
                    textAnchor={mid < 0.5 ? "end" : "start"}
                    className="font-heading"
                    fontSize="17"
                    fill="var(--color-brand)"
                    fontWeight={600}
                  >
                    We are here
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {slide.annotation && <Annotation text={slide.annotation} />}
    </BlurFade>
  );
}

const noSubscription = () => () => {};

function GraphVariant({ slide }: { slide: ChartSlideType }) {
  const { xLabel, yLabel, currentMarker, futureNote } = slide;
  // SVG animation ignores the stylesheet's reduced-motion rule, so the pulse checks it here, after
  // hydration, since the server cannot see the preference.
  const still = useSyncExternalStore(
    noSubscription,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const width = 800;
  const height = 400;
  const padding = 70;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const { pathD, areaD, markerPoint } = useMemo(() => {
    const pts = Array.from({ length: 100 }, (_, i) => {
      const t = i / 99;
      const x = padding + t * graphWidth;
      const y = padding + graphHeight - round(Math.exp(t * 3) / Math.exp(3)) * graphHeight;
      return { x, y };
    });
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
    const area = `${path} L ${padding + graphWidth},${padding + graphHeight} L ${padding},${padding + graphHeight} Z`;
    return { pathD: path, areaD: area, markerPoint: pts[60] };
  }, [padding, graphWidth, graphHeight]);

  return (
    <BlurFade delay={0.2} duration={0.8} className="w-full max-w-[50rem]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="perf-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line
            key={t}
            x1={padding}
            y1={padding + graphHeight * (1 - t)}
            x2={padding + graphWidth}
            y2={padding + graphHeight * (1 - t)}
            stroke="var(--color-text-subtle)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}

        <path d={areaD} fill="url(#perf-gradient)" />
        <path d={pathD} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" />

        {currentMarker && markerPoint && (
          <g>
            <circle
              cx={markerPoint.x}
              cy={markerPoint.y}
              r="8"
              fill="var(--color-brand)"
              opacity="0.3"
            >
              {/* Three pulses on arrival, then still: a loop that never ends pulls the eye off
                  the speaker for the whole slide. */}
              {!still && (
                <>
                  <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="3" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="3" />
                </>
              )}
            </circle>
            <circle cx={markerPoint.x} cy={markerPoint.y} r="5" fill="var(--color-brand)" />
            <text
              x={markerPoint.x}
              y={markerPoint.y - 18}
              textAnchor="middle"
              className="font-heading"
              fontSize="18"
              fill="var(--color-brand)"
              fontWeight={600}
            >
              {currentMarker}
            </text>
          </g>
        )}

        {futureNote && (
          <text
            x={padding + graphWidth - 20}
            y={padding + 30}
            textAnchor="end"
            className="font-sans"
            fontSize="16"
            fill="var(--color-brand-accent)"
            opacity="0.8"
          >
            {futureNote}
          </text>
        )}

        {xLabel && (
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="font-sans"
            fontSize="18"
            fill="var(--color-text-muted)"
          >
            {xLabel}
          </text>
        )}

        {yLabel && (
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            className="font-sans"
            fontSize="18"
            fill="var(--color-text-muted)"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            {yLabel}
          </text>
        )}
      </svg>
    </BlurFade>
  );
}

function TrendVariant({ slide }: { slide: ChartSlideType }) {
  // A chart printed while it grows freezes mid-animation in the PDF.
  const print = usePrintMode();
  const { data, annotation, seriesLabel, series2Label } = slide;
  const mounted = useMounted();

  return (
    <div className="w-full max-w-5xl">
      {(seriesLabel || series2Label) && (
        <BlurFade delay={0.25} duration={0.5}>
          <div className="mb-4 flex items-center justify-center gap-8">
            {seriesLabel && (
              <span className="flex items-center gap-2 text-base font-semibold text-text">
                <span className="h-1 w-8 rounded-full bg-brand" />
                {seriesLabel}
              </span>
            )}
            {series2Label && (
              <span className="flex items-center gap-2 text-base font-semibold text-text">
                <span className="h-1 w-8 rounded-full bg-warning" />
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
              <TrendPlot data={data} print={print} />
            </Suspense>
          )}
        </ChartFrame>
      </BlurFade>

      {annotation && (
        <BlurFade delay={0.5} duration={0.6}>
          <Annotation text={annotation} />
        </BlurFade>
      )}
    </div>
  );
}

function BarVariant({ slide }: { slide: ChartSlideType }) {
  const print = usePrintMode();
  const { data, annotation } = slide;
  const mounted = useMounted();

  return (
    <div className="w-full max-w-5xl">
      <BlurFade delay={0.3} duration={0.8}>
        <ChartFrame>
          {mounted && (
            <Suspense fallback={null}>
              <BarPlot data={data} print={print} />
            </Suspense>
          )}
        </ChartFrame>
      </BlurFade>

      {annotation && (
        <BlurFade delay={0.5} duration={0.6}>
          <Annotation text={annotation} />
        </BlurFade>
      )}
    </div>
  );
}

export function ChartSlide({ slide }: Props) {
  return (
    <SlideShell direction="col">
      <Wash strength={3} />

      <div
        className={`slide-content relative z-10 flex flex-col items-center justify-center px-12 ${slide.headline ? "slide-titled" : ""}`}
      >
        {slide.headline && (
          <SlideTitle as="h2" duration={0.6}>
            {slide.headline}
          </SlideTitle>
        )}

        <div className="slide-body items-center">
          {slide.variant === "cycle" && <CycleVariant slide={slide} />}
          {slide.variant === "graph" && <GraphVariant slide={slide} />}
          {slide.variant === "trend" && <TrendVariant slide={slide} />}
          {slide.variant === "bar" && <BarVariant slide={slide} />}
        </div>
      </div>
    </SlideShell>
  );
}
