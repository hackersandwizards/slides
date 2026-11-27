"use client";

import { useContext, useId, type ReactNode } from "react";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { usePrintMode } from "../../lib/print-context";
import { useChartPlotMotion } from "../../lib/use-chart-plot-motion";
import { WORDS } from "../../lib/slide-words";
import type { ChartSegment, ChartSlide as ChartSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang } from "./SlideShell";

// Server and browser Math.exp differ in the last digits, and a hydrated attribute keeps the
// server's value, so unrounded curve points were a hydration mismatch on every chart slide.
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Draws its plot from left to right, as recharts grows the trend and bar plots (1.5 s, ease):
 *  a clip over the whole drawing widens from nothing, except where `useChartPlotMotion` holds it still and
 *  under reduced motion; motion reads `initial` on mount only, as in BlurFade. The clip reaches
 *  half the drawing's size past every edge, so a label the overflowing svg shows outside its box
 *  stays whole. */
function DrawIn({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const id = useId();
  const { still } = useChartPlotMotion();
  const reduced = useReducedMotion();
  const print = usePrintMode();
  if (print) return <>{children}</>;
  return (
    <>
      <clipPath id={id}>
        <LazyMotion features={domAnimation}>
          <m.rect
            x={-width / 2}
            y={-height}
            height={height * 3}
            initial={still || reduced ? false : { width: width / 2 }}
            animate={{ width: width * 2 }}
            transition={{ delay: 0.2, duration: 1.5, ease: "easeInOut" }}
          />
        </LazyMotion>
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );
}

const CYCLE_WIDTH = 900;
const CYCLE_HEIGHT = 320;
const CYCLE_PADDING = 60;
const CYCLE_SPAN = CYCLE_WIDTH - CYCLE_PADDING * 2;
const CYCLE_BASELINE = CYCLE_HEIGHT - 40;
const CYCLE_RISE = CYCLE_HEIGHT - 80;

function cycleHeightAt(progress: number) {
  const mean = 0.5;
  const sigma = 0.18;
  const bell = round(Math.exp(-0.5 * ((progress - mean) / sigma) ** 2));
  return CYCLE_BASELINE - bell * CYCLE_RISE;
}

function cycleCurvePath() {
  const points = Array.from({ length: 200 }, (_, i) => {
    const t = i / 199;
    const x = CYCLE_PADDING + t * CYCLE_SPAN;
    return `${x},${cycleHeightAt(t)}`;
  });
  return `M ${points.join(" L ")}`;
}

const cyclePath = cycleCurvePath();

interface CycleSegmentPosition extends ChartSegment {
  x: number;
  y: number;
  firstHalf: boolean;
}

function cycleSegmentPositions(segments: ChartSegment[]) {
  const dividers = segments.slice(0, -1).reduce<number[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + seg.percentage / 100);
    return acc;
  }, []);
  const labels = segments.map((segment, i): CycleSegmentPosition => {
    const start = i === 0 ? 0 : dividers[i - 1];
    const end = i === segments.length - 1 ? 1 : dividers[i];
    const mid = (start + end) / 2;
    return {
      label: segment.label,
      percentage: segment.percentage,
      x: CYCLE_PADDING + mid * CYCLE_SPAN,
      y: cycleHeightAt(mid),
      firstHalf: mid < 0.5,
    };
  });
  return { dividers, labels };
}

function CycleDividers({ dividers }: { dividers: number[] }) {
  return dividers.map((pos, i) => {
    const x = CYCLE_PADDING + pos * CYCLE_SPAN;
    return (
      <line
        key={i}
        x1={x}
        y1={CYCLE_BASELINE}
        x2={x}
        y2={cycleHeightAt(pos)}
        stroke="var(--color-text-muted)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
    );
  });
}

function CycleHighlight({ x, y, firstHalf }: Pick<CycleSegmentPosition, "x" | "y" | "firstHalf">) {
  const lang = useContext(DeckLang);
  return (
    <>
      <circle cx={x} cy={y} r="6" fill="var(--color-teal)" />
      {/* On the side the curve falls away from, so the label never crosses it. */}
      <text
        x={firstHalf ? x - 14 : x + 14}
        y={y - 14}
        textAnchor={firstHalf ? "end" : "start"}
        className="font-heading"
        fontSize="22"
        fill="var(--color-teal)"
        fontWeight={600}
      >
        {WORDS[lang].here}
      </text>
    </>
  );
}

function CycleSegment({ segment, active }: { segment: CycleSegmentPosition; active: boolean }) {
  const { x, y, firstHalf, label, percentage } = segment;
  return (
    <g>
      <text
        x={x}
        y={CYCLE_HEIGHT - 18}
        textAnchor="middle"
        className="font-sans"
        fontSize="21"
        fill={active ? "var(--color-teal)" : "var(--color-text-muted)"}
        fontWeight={active ? 600 : 400}
      >
        {label}
      </text>
      <text
        x={x}
        y={CYCLE_HEIGHT + 8}
        textAnchor="middle"
        className="font-sans"
        fontSize="19"
        fill="var(--color-text-muted)"
      >
        {percentage}%
      </text>
      {active && <CycleHighlight x={x} y={y} firstHalf={firstHalf} />}
    </g>
  );
}

export function CycleVariant({ slide }: { slide: ChartSlideType }) {
  const { dividers, labels } = cycleSegmentPositions(slide.segments ?? []);
  const currentSegmentIndex = slide.currentSegmentIndex ?? -1;
  return (
    <BlurFade delay={0.2} duration={0.8} className="w-full max-w-(--slide-measure-chart)">
      {/* The segment labels sit on the top edge of the box; overflow keeps their tops. The box is
          12 units taller than the curve, so the percentages under it stay inside. */}
      <svg viewBox={`0 0 ${CYCLE_WIDTH} ${CYCLE_HEIGHT + 12}`} className="w-full overflow-visible">
        <DrawIn width={CYCLE_WIDTH} height={CYCLE_HEIGHT + 12}>
          <path
            d={`${cyclePath} L ${CYCLE_PADDING + CYCLE_SPAN},${CYCLE_BASELINE} L ${CYCLE_PADDING},${CYCLE_BASELINE} Z`}
            fill="var(--color-teal)"
            fillOpacity={0.07}
          />

          <path d={cyclePath} fill="none" stroke="var(--color-teal)" strokeWidth="2.5" />

          <CycleDividers dividers={dividers} />

          {labels.map((segment, i) => (
            <CycleSegment key={i} segment={segment} active={i === currentSegmentIndex} />
          ))}
        </DrawIn>
      </svg>
    </BlurFade>
  );
}

const GRAPH_WIDTH = 800;
const GRAPH_HEIGHT = 400;
const GRAPH_PADDING = 70;
const GRAPH_SPAN = GRAPH_WIDTH - GRAPH_PADDING * 2;
const GRAPH_RISE = GRAPH_HEIGHT - GRAPH_PADDING * 2;

function graphCurveGeometry() {
  const points = Array.from({ length: 100 }, (_, i) => {
    const t = i / 99;
    const x = GRAPH_PADDING + t * GRAPH_SPAN;
    const y = GRAPH_PADDING + GRAPH_RISE - round(Math.exp(t * 3) / Math.exp(3)) * GRAPH_RISE;
    return { x, y };
  });
  const path = points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");
  const area = `${path} L ${GRAPH_PADDING + GRAPH_SPAN},${GRAPH_PADDING + GRAPH_RISE} L ${GRAPH_PADDING},${GRAPH_PADDING + GRAPH_RISE} Z`;
  return { path, area, markerPoint: points[60] };
}

const graphCurve = graphCurveGeometry();

function GraphGrid() {
  return [0.2, 0.4, 0.6, 0.8].map((t) => (
    <line
      key={t}
      x1={GRAPH_PADDING}
      y1={GRAPH_PADDING + GRAPH_RISE * (1 - t)}
      x2={GRAPH_PADDING + GRAPH_SPAN}
      y2={GRAPH_PADDING + GRAPH_RISE * (1 - t)}
      stroke="var(--color-text-subtle)"
      strokeWidth="0.5"
      opacity="0.3"
    />
  ));
}

function GraphMarker({ text, point }: { text: string; point: { x: number; y: number } }) {
  return (
    <g>
      <circle cx={point.x} cy={point.y} r="5" fill="var(--color-teal)" />
      <text
        x={point.x}
        y={point.y - 18}
        textAnchor="middle"
        className="font-heading"
        fontSize="22"
        fill="var(--color-teal)"
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

type GraphLabelPlacement = {
  x: number;
  y: number;
  textAnchor: "start" | "middle";
  fontSize: string;
  transform?: string;
};

const GRAPH_LABELS: Record<"future" | "x" | "y", GraphLabelPlacement> = {
  future: { x: GRAPH_PADDING + 10, y: GRAPH_PADDING + 10, textAnchor: "start", fontSize: "20" },
  x: { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT - 10, textAnchor: "middle", fontSize: "21" },
  y: {
    x: 20,
    y: GRAPH_HEIGHT / 2,
    textAnchor: "middle",
    fontSize: "21",
    transform: `rotate(-90, 20, ${GRAPH_HEIGHT / 2})`,
  },
};

function GraphLabel({ text, placement }: { text?: string; placement: keyof typeof GRAPH_LABELS }) {
  if (!text) return null;
  const { x, y, textAnchor, fontSize, transform } = GRAPH_LABELS[placement];
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      className="font-sans"
      fontSize={fontSize}
      fill="var(--color-text-muted)"
      transform={transform}
    >
      {text}
    </text>
  );
}

export function GraphVariant({ slide }: { slide: ChartSlideType }) {
  const { xLabel, yLabel, currentMarker, futureNote } = slide;
  const { path, area, markerPoint } = graphCurve;
  return (
    <BlurFade delay={0.2} duration={0.8} className="w-full max-w-(--slide-measure-chart-narrow)">
      <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} className="w-full">
        <GraphGrid />

        <DrawIn width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          <path d={area} fill="var(--color-teal)" fillOpacity={0.07} />
          <path d={path} fill="none" stroke="var(--color-teal)" strokeWidth="2.5" />

          {currentMarker && markerPoint && <GraphMarker text={currentMarker} point={markerPoint} />}
        </DrawIn>
        <GraphLabel text={futureNote} placement="future" />
        <GraphLabel text={xLabel} placement="x" />
        <GraphLabel text={yLabel} placement="y" />
      </svg>
    </BlurFade>
  );
}
