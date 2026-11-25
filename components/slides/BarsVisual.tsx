import { type ReactNode, useContext } from "react";
import type { VisualBlock } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { WORDS } from "../../lib/slide-utils";
import { DeckLang } from "./SlideShell";
import { VISUAL_CAPTION, VisualSource } from "./DiagramVocabulary";

type BarsBlock = Extract<VisualBlock, { type: "bars" }>;
type BarItem = BarsBlock["bars"][number];

const CONTEXT = "var(--slide-context)";

// Grey is context for a highlighted bar; with none highlighted every bar is data.
// With a highlight, a bar that is not one is context: its label and value in the muted grey at
// the regular weight, so the eye lands on the highlighted ones first: in bold ink, context bars
// would outweigh the teal highlighted ones.
const BAR_TONE = {
  highlight: {
    fill: "var(--color-primary)",
    label: "font-semibold text-primary",
    value: "font-bold text-primary",
  },
  context: {
    fill: CONTEXT,
    label: "font-normal text-text-muted",
    value: "font-normal text-text-muted",
  },
  default: {
    fill: "var(--color-primary)",
    label: "font-semibold text-text",
    value: "font-bold text-text",
  },
} as const;

type BarTone = (typeof BAR_TONE)[keyof typeof BAR_TONE];

export function barTone(bar: BarItem, anyHighlight: boolean): BarTone {
  if (bar.highlight) return BAR_TONE.highlight;
  return anyHighlight ? BAR_TONE.context : BAR_TONE.default;
}

interface BarScale {
  max: number;
  format: (n: number) => string;
  named: boolean;
}

interface BarLook {
  height: string;
  valueSize: string;
  value: string;
  fill: string;
}

interface BarFigureProps {
  bar: BarItem;
  look: BarLook;
  scale: BarScale;
}

function BarTrack({ bar, look, scale }: BarFigureProps) {
  return (
    <div
      className={`relative ${look.height} ${scale.named ? "border-r-4 border-text/25 bg-text/[0.07]" : ""} rounded-r-sm`}
    >
      {/* A named scale marks its quarters, so a bar's ends read against it. */}
      {scale.named &&
        [25, 50, 75].map((q) => (
          <div
            key={q}
            className="absolute inset-y-0 border-l-2 border-bg"
            style={{ left: `${q}%` }}
          />
        ))}
      {/* A range starts at its low end, rounded at both ends since neither is the axis. */}
      <div
        className={`relative h-full ${bar.from != null ? "rounded-sm" : "min-w-1 rounded-r-sm"}`}
        style={{
          marginLeft: `${((bar.from ?? 0) / scale.max) * 100}%`,
          width: `${Math.max(((bar.value - (bar.from ?? 0)) / scale.max) * 100, 0.5)}%`,
          background: look.fill,
        }}
      />
    </div>
  );
}

function BarValue({ bar, look, scale }: BarFigureProps) {
  const { format } = scale;
  return (
    <span className={`font-heading ${look.valueSize} whitespace-nowrap ${look.value}`}>
      {bar.display ??
        (bar.from != null ? `${format(bar.from)}–${format(bar.value)}` : format(bar.value))}
    </span>
  );
}

function FollowingBarFigure({ bar, look, scale }: BarFigureProps) {
  return (
    <div className="flex items-center gap-8 [--bar-room:--spacing(64)] max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2 max-md:[--bar-room:--spacing(36)]">
      <div
        className={`${look.height} min-w-1 shrink-0 rounded-r-sm`}
        style={{
          width: `calc((100% - var(--bar-room)) * ${bar.value / scale.max})`,
          background: look.fill,
        }}
      />
      <BarValue bar={bar} look={look} scale={scale} />
    </div>
  );
}

function ColumnBarFigure({ bar, look, scale }: BarFigureProps) {
  return (
    <>
      <BarTrack bar={bar} look={look} scale={scale} />
      <BarValue bar={bar} look={look} scale={scale} />
    </>
  );
}

interface BarLabelRowProps {
  bar: BarItem;
  tone: BarTone;
  children: ReactNode;
}

function SideLabelBarRow({ bar, tone, children }: BarLabelRowProps) {
  return (
    <div className="grid grid-cols-[--spacing(72)_minmax(0,1fr)_--spacing(56)] items-center gap-8">
      <span className={`font-sans text-3xl leading-tight text-balance ${tone.label}`}>
        {renderMarkdown(bar.label)}
      </span>
      {children}
    </div>
  );
}

function AboveLabelBarRow({ bar, tone, children }: BarLabelRowProps) {
  return (
    <div>
      <span
        className={`font-sans text-4xl leading-tight tracking-tight text-balance ${tone.label}`}
      >
        {renderMarkdown(bar.label)}
      </span>
      {children}
    </div>
  );
}

function BarScaleTicks({ scale }: { scale: BarScale }) {
  const { max, format } = scale;
  return (
    <div aria-hidden className={`${VISUAL_CAPTION} relative mt-3 text-text-muted tabular-nums`}>
      {/* The 0 stands in the flow and gives the row its height; the others sit on their mark. */}
      {[0, 25, 50, 75, 100].map((q) => (
        <span
          key={q}
          className={`${q ? "absolute" : "inline-block"} -translate-x-1/2 ${q === 100 ? "max-md:-translate-x-full" : ""}`}
          style={q ? { left: `${q}%` } : undefined}
        >
          {/* Exact, so a quarter of 10 reads 2.5 where its mark stands. */}
          {format((max * q) / 100)}
        </span>
      ))}
    </div>
  );
}

function SideLabelBarScale({ scale }: { scale: BarScale }) {
  return (
    <div className="grid grid-cols-[--spacing(72)_minmax(0,1fr)_--spacing(56)] gap-8">
      <div className="col-start-2">
        <BarScaleTicks scale={scale} />
      </div>
    </div>
  );
}

function AboveLabelBarScale({ scale }: { scale: BarScale }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_--spacing(56)] gap-8">
      <BarScaleTicks scale={scale} />
    </div>
  );
}

const BAR_ROWS = {
  side: {
    Row: SideLabelBarRow,
    Scale: SideLabelBarScale,
    gap: "gap-5",
    height: "h-12",
    valueSize: "text-4xl",
    following: "col-span-2",
    column: undefined,
  },
  above: {
    Row: AboveLabelBarRow,
    Scale: AboveLabelBarScale,
    gap: "gap-12",
    height: "h-20",
    valueSize: "text-5xl",
    following: "mt-3 ",
    column: "mt-3 grid grid-cols-[minmax(0,1fr)_--spacing(56)] items-center gap-8",
  },
};

const BAR_FIGURES = { following: FollowingBarFigure, column: ColumnBarFigure };

export function Bars({ block }: { block: BarsBlock }) {
  const number = WORDS[useContext(DeckLang)].figure;
  const anyHighlight = block.bars.some((b) => b.highlight);
  const bars =
    block.order === "given" ? block.bars : [...block.bars].sort((a, b) => b.value - a.value);
  const max = block.max ?? (Math.max(...bars.map((b) => b.value), 0) || 1);
  // Four bars and more set each label left of its track, one row per bar, so six ranges and a
  // callout, or four bars and a footer, fit one slide above the fit guard's 0.8.
  const row = bars.length > 3 ? BAR_ROWS.side : BAR_ROWS.above;
  const scale = { max, format: number, named: block.max != null };
  // Without a named scale the value follows its bar's end, so a short bar carries its figure beside
  // it; the longest bar still ends where the value column would start. On a phone a figure wider
  // than the room left wraps under its bar.
  const variant = !scale.named && bars.every((b) => b.from == null) ? "following" : "column";
  const { Row, Scale, gap, height, valueSize } = row;
  const BarFigure = BAR_FIGURES[variant];
  const slot = row[variant];
  return (
    <div className="w-full">
      <div className={`flex flex-col ${gap}`}>
        {bars.map((bar, i) => {
          const tone = barTone(bar, anyHighlight);
          const figure = (
            <BarFigure
              bar={bar}
              scale={scale}
              look={{ height, valueSize, value: tone.value, fill: tone.fill }}
            />
          );
          return (
            <Row key={i} bar={bar} tone={tone}>
              {slot ? <div className={slot}>{figure}</div> : figure}
            </Row>
          );
        })}
      </div>
      {scale.named && <Scale scale={scale} />}
      <VisualSource text={block.source} />
    </div>
  );
}
