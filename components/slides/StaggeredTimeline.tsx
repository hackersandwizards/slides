import { renderMarkdown } from "../../lib/markdown";
import { continuation } from "../../lib/process-layout";
import { VISUAL_LABEL, VISUAL_MUTED } from "./DiagramVocabulary";
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

interface StaggeredGeometry {
  tracks: number;
  shift: number;
  now: number;
  nowAt: number;
  start: string;
  end: string;
}

export function staggeredGeometry(block: TimelineBlock, now: number): StaggeredGeometry {
  // Two half-width tracks per stage plus one at each end, so the first and last labels can centre
  // on their dots too: stage i's dot sits on grid line 2i + 3, its label spans two tracks each side.
  // Row labels, when given, take a first column and shift every line by one.
  const tracks = 2 * block.events.length + 2;
  const { into, onward } = continuation(block);
  const edge = `${(2 / tracks) * 100}%`;
  return {
    tracks,
    shift: givenLabels(block.labels) ? 1 : 0,
    now,
    nowAt: ((2 * now + 2) / tracks) * 100,
    start: into ? BLEED : edge,
    end: onward ? BLEED : edge,
  };
}

function StaggeredAxis({ geometry }: { geometry: StaggeredGeometry }) {
  const { now, nowAt, shift, start, end } = geometry;
  return (
    <div className="relative row-start-5" style={{ gridColumn: `${1 + shift} / -1` }} aria-hidden>
      {now >= 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: start,
            right: `${100 - nowAt}%`,
            ...timelineRule(false),
            borderTop: "var(--slide-timeline-rule)",
          }}
        />
      )}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        data-dashed={true}
        style={{
          left: now >= 0 ? `${nowAt}%` : start,
          right: end,
          ...timelineRule(true),
          borderTop: "var(--slide-timeline-rule)",
        }}
      />
    </div>
  );
}

function StaggeredCard({
  event,
  above,
  line,
  tone,
}: {
  event: TimelineEvent;
  above: boolean;
  line: number;
  tone: string;
}) {
  const body = Boolean(event.text || event.figure);
  const leader = (
    <span className="mx-auto h-full min-h-6 w-1" style={{ background: VISUAL_MUTED }} />
  );
  return (
    <div
      className={`grid grid-rows-subgrid px-3 text-center ${above ? "row-[1/5]" : "row-[6/10]"}`}
      style={{ gridColumn: `${line - 2} / ${line + 2}` }}
    >
      {!above && (
        <span className="flex" aria-hidden>
          {leader}
        </span>
      )}
      <span className={`font-heading text-3xl font-bold ${tone}`}>{event.when}</span>
      <h2 className={`mt-2 ${VISUAL_LABEL} ${tone}`}>{renderMarkdown(event.title)}</h2>
      {body && <EventBody event={event} tone={tone} className="mt-2" balance />}
      {/* Above, a stage without text runs its leader up through the text row. */}
      {above && (
        <span className="flex pt-3" style={{ gridRow: body ? "4" : "3 / 5" }} aria-hidden>
          {leader}
        </span>
      )}
    </div>
  );
}

function StaggeredStage({
  event,
  index,
  geometry,
  highlighted,
}: {
  event: TimelineEvent;
  index: number;
  geometry: StaggeredGeometry;
  highlighted: boolean;
}) {
  const { shift, now } = geometry;
  const line = 2 * index + 3 + shift;
  const tone = highlighted ? "text-primary" : "text-text";
  return (
    <div className="contents">
      <StaggeredCard event={event} above={index % 2 === 0} line={line} tone={tone} />
      <div
        className="relative row-start-5 flex items-center justify-center"
        style={{ gridColumn: `${line - 1} / ${line + 1}` }}
      >
        <Dot on={highlighted} future={index > now} />
      </div>
      {index > 0 && event.segment && (
        <div
          className="relative row-start-5 flex items-center justify-center"
          style={{ gridColumn: `${line - 2} / ${line}` }}
        >
          <SegmentLabel text={event.segment} tight />
        </div>
      )}
    </div>
  );
}

// Six and more stages alternate above and below the line, so each label gets two columns' width
// instead of one. The grid has two tracks per stage; a stage's dot sits on the line between them.
// Rows: date, title, text and leader above (1-4), the line (5), leader, date, title and text below
// (6-9). Each label is a subgrid over its four rows, so every date, title and text starts level
// with its neighbours on the same side, and the leader stretches to the line.
export function Staggered({ block, now }: { block: TimelineBlock; now: number }) {
  const geometry = staggeredGeometry(block, now);
  const labels = givenLabels(block.labels);
  return (
    <div
      className={`${block.continues ? "slide-timeline-continued" : ""} grid w-full grid-rows-[auto_auto_auto_--spacing(6)_--spacing(14)_--spacing(6)_auto_auto_auto]`}
      style={{
        gridTemplateColumns: `${labels ? "auto " : ""}repeat(${geometry.tracks}, minmax(0, 1fr))`,
      }}
    >
      {labels &&
        [0, 6].map((at) => (
          <div key={at} className="contents">
            <RowLabel text={labels.when} row={1 + at} />
            <RowLabel text={labels.title} row={2 + at} className="mt-3" />
            <RowLabel text={labels.text} row={3 + at} className="mt-2" />
          </div>
        ))}
      {/* Solid up to now's dot and dashed after it, as between two stages. */}
      <StaggeredAxis geometry={geometry} />
      {block.events.map((event, i) => (
        <StaggeredStage
          key={i}
          event={event}
          index={i}
          geometry={geometry}
          highlighted={block.highlight === i}
        />
      ))}
    </div>
  );
}
