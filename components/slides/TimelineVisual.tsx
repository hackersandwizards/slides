import { renderMarkdown } from "../../lib/markdown";
import { continuation } from "../../lib/slide-utils";
import { VISUAL_LABEL } from "./DiagramVocabulary";
import { Staggered } from "./StaggeredTimeline";
import {
  BLEED,
  Dot,
  EventBody,
  RowLabel,
  SegmentLabel,
  givenLabels,
  timelineRule,
  type TimelineBlock,
  type TimelineEvent,
} from "./TimelineMarks";

// A continued timeline's line, from the slide's edge into the first dot or out of the last to the
// edge, so the slide reads as one part of a longer line.
function Lead({ side, dashed }: { side: "in" | "out"; dashed: boolean }) {
  return (
    <div
      className="slide-timeline-lead absolute top-1/2 -translate-y-1/2"
      data-side={side}
      aria-hidden
      style={{
        ...(side === "in"
          ? { left: BLEED, right: "calc(100% - var(--spacing) * 6)" }
          : { left: "calc(var(--spacing) * 6)", right: BLEED }),
        ...timelineRule(dashed),
      }}
    />
  );
}

interface TimelineLead {
  side: "in" | "out";
  dashed: boolean;
}

interface StageAxis {
  leads: TimelineLead[];
  link?: "solid" | "dashed";
  future: boolean;
}

export function stageAxes(block: TimelineBlock, now: number): StageAxis[] {
  const { into, onward } = continuation(block);
  const last = block.events.length - 1;
  return block.events.map((_, index) => {
    const leads: TimelineLead[] = [];
    const dashed = index >= now;
    if (index === 0 && into) leads.push({ side: "in", dashed: now < 0 });
    if (index === last && onward) leads.push({ side: "out", dashed });
    return {
      leads,
      link: index < last ? (dashed ? "dashed" : "solid") : undefined,
      future: index > now,
    };
  });
}

function TimelineStage({
  event,
  axis,
  highlighted,
  segment,
}: {
  event: TimelineEvent;
  axis: StageAxis;
  highlighted: boolean;
  segment?: string;
}) {
  const tone = highlighted ? "text-primary" : "text-text";
  return (
    <div className="slide-timeline-stage relative row-span-4 row-start-1 grid grid-rows-subgrid px-4">
      <span className={`font-heading text-3xl font-bold ${tone}`}>{event.when}</span>
      <div className="slide-timeline-axis relative flex h-12 items-center">
        {axis.leads.map(({ side, dashed }) => (
          <Lead key={side} side={side} dashed={dashed} />
        ))}
        {axis.link && (
          <div
            className="slide-timeline-link absolute top-1/2 -right-8 left-6 -translate-y-1/2"
            style={timelineRule(axis.link === "dashed")}
          />
        )}
        {/* Halfway between this stage's dot and the next one's, a column and a dot apart. */}
        {segment && (
          <span className="slide-timeline-segment absolute top-1/2 left-1/2 ml-8 -translate-x-1/2 -translate-y-1/2">
            <SegmentLabel text={segment} />
          </span>
        )}
        <Dot on={highlighted} future={axis.future} />
      </div>
      <h2 className={`mt-6 ${VISUAL_LABEL} ${tone}`}>{renderMarkdown(event.title)}</h2>
      <EventBody event={event} tone={tone} className="mt-3" />
    </div>
  );
}

function Stages({ block, now }: { block: TimelineBlock; now: number }) {
  const n = block.events.length;
  const axes = stageAxes(block, now);
  const labels = givenLabels(block.labels);
  return (
    <div className={`slide-timeline w-full ${block.continues ? "slide-timeline-continued" : ""}`}>
      {/* One row per part (date, dot, title, text) shared by every stage, so titles and texts
          start level even where a title wraps. Row labels, when given, take a first column. */}
      {/* The space after "auto" is load-bearing: without it the value is invalid CSS, the grid
          falls back to implicit columns and the axis, dots and labels come apart. */}
      <div
        className="slide-timeline-grid relative grid"
        style={{
          gridTemplateColumns: `${labels ? "auto " : ""}repeat(${n}, minmax(0, 1fr))`,
        }}
      >
        <RowLabel text={labels?.when} row={1} />
        <RowLabel text={labels?.title} row={3} className="mt-7" />
        <RowLabel text={labels?.text} row={4} className="mt-3" />
        {block.events.map((event, i) => (
          <TimelineStage
            key={i}
            event={event}
            axis={axes[i]}
            highlighted={block.highlight === i}
            segment={block.events[i + 1]?.segment}
          />
        ))}
      </div>
    </div>
  );
}

export function Timeline({ block }: { block: TimelineBlock }) {
  const n = block.events.length;
  const now = block.now ?? n - 1;
  if (n < 6) return <Stages block={block} now={now} />;
  // A phone stands every timeline as one column of stages (TimelineVisual.css), the staggered one too.
  return (
    <>
      <div className="w-full max-md:hidden">
        <Staggered block={block} now={now} />
      </div>
      <div className="w-full md:hidden">
        <Stages block={block} now={now} />
      </div>
    </>
  );
}
