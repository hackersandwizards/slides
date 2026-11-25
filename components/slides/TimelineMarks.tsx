import type { CSSProperties } from "react";
import type { VisualBlock } from "../../types/slide";
import { renderMarkdown } from "../../lib/markdown";
import { VISUAL_CAPTION, VISUAL_MUTED } from "./DiagramVocabulary";
import { Figure, figureFit } from "./Figure";

export type TimelineBlock = Extract<VisualBlock, { type: "timeline" }>;
export type TimelineEvent = TimelineBlock["events"][number];

export function Dot({ on, future }: { on: boolean; future: boolean }) {
  return (
    <span
      className={`relative rounded-brand-sm ${
        on
          ? "h-12 w-12 bg-primary ring-8 ring-primary/15"
          : future
            ? "h-9 w-9 border-4 bg-(--slide-ground)"
            : "h-9 w-9 bg-text"
      }`}
      style={future && !on ? { borderColor: VISUAL_MUTED } : undefined}
    />
  );
}

// Row labels count only when one carries text: an empty object would open an empty column.
export function givenLabels(labels?: { when?: string; title?: string; text?: string }) {
  return labels && (labels.when || labels.title || labels.text) ? labels : undefined;
}

// A row label: the column header of the table a timeline replaced, level with its row.
// `className` carries the top margin of the row's own text, so the label starts level with it.
export function RowLabel({
  text,
  row,
  className = "",
}: {
  text?: string;
  row: number;
  className?: string;
}) {
  if (!text) return null;
  return (
    <span
      className={`slide-timeline-row-label col-start-1 pr-8 font-sans ${VISUAL_CAPTION} font-semibold text-text-muted ${className}`}
      style={{ gridRow: row }}
    >
      {text}
    </span>
  );
}

// A segment's label, such as a duration, set on the line it labels: the line breaks for it, so it
// reads as the time between two events. Above the line it reads less clearly as a duration, and
// set as the event's date it reads as a point in time.
export function SegmentLabel({ text, tight }: { text: string; tight?: boolean }) {
  return (
    <span
      className={`bg-(--slide-ground) font-heading font-bold whitespace-nowrap text-text-muted ${tight ? "px-2 text-xl" : "px-4 text-2xl"}`}
    >
      {text}
    </span>
  );
}

// An event's text and, under it, its result in the figure face: set under the title, the figure
// would push every column's text down.
export function EventBody({
  event,
  tone,
  className,
  balance,
}: {
  event: TimelineEvent;
  tone: string;
  className: string;
  balance?: boolean;
}) {
  return (
    <div
      className={`slide-timeline-body ${className}`}
      style={event.figure ? figureFit([event.figure]) : undefined}
    >
      {event.text && (
        <p className={`${VISUAL_CAPTION} text-text ${balance ? "text-balance" : ""}`}>
          {renderMarkdown(event.text)}
        </p>
      )}
      {event.figure && (
        <span
          className={`slide-timeline-figure ${event.text ? "mt-8" : "mt-4"} block font-heading text-(length:--slide-figure-size) leading-(--slide-figure-leading) font-bold tracking-(--slide-figure-tracking) whitespace-nowrap ${tone}`}
        >
          <Figure value={event.figure} />
        </span>
      )}
    </div>
  );
}

// The line between two stages, solid up to now and dashed after: a variable TimelineVisual.css draws as
// the top border, and on a phone, where the timeline stands upright, as the left one.
export const timelineRule = (dashed: boolean) =>
  ({
    "--slide-timeline-rule": `var(--slide-rule-heavy) ${dashed ? "dashed" : "solid"} ${VISUAL_MUTED}`,
  }) as CSSProperties;

// How far a continued timeline's line runs past its column or grid: beyond the slide's edge, which
// clips it, whatever row labels stand before the first column or how far the fit guard shrinks.
export const BLEED = "calc(-1 * (var(--slide-side) + 100%))";
