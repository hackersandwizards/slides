import Image from "../ui/image";
import type { CSSProperties, ReactNode } from "react";
import type { FlowFrame, VisualBlock } from "../../types/slide";
import { iconMap } from "../../lib/icons";
import { useHighlightLines } from "../../lib/use-code-highlight";
import { renderMarkdown } from "../../lib/markdown";
import { continuation } from "../../lib/slide-utils";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { BeforeAfterSides, CodePanel, DashedFrame, NumberTile, SlideCard } from "./primitives";

// The diagram vocabulary of a content slide: one relationship per block, drawn so the eye reads
// the structure before the words. Shared rules, from the deck checklist:
// - one emphasis colour (the brand teal); everything else is ink or the brand's muted grey;
// - every element labelled where it sits, never through a legend;
// - labels 48px, captions and sources 36px at 1920 (24 and 18px in a 960px Meet window);
// - strokes 4px and up, so video compression keeps them;
// - the brand corner (large top-left and bottom-right) on every card.

const CARD = "rounded-brand";
// The brand's muted grey: 7:1 on the page, so a context bar or a connector in it reads.
const GREY = "var(--color-muted)";
const LABEL = "card-title text-4xl leading-tight text-balance";
// The smallest running text a visual sets: 36px at 1920, the checklist's floor.
const CAPTION = "text-xl leading-snug";
const CONTEXT = "var(--slide-context)";

type Of<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

function Source({ text, gap = "mt-10" }: { text?: string; gap?: string }) {
  if (!text) return null;
  return <p className={`${gap} text-2xl text-text-muted`}>{renderMarkdown(text)}</p>;
}

function Icon({ name, className }: { name?: string; className?: string }) {
  const Glyph = name ? iconMap[name] : undefined;
  return Glyph ? <Glyph className={className} strokeWidth={2.75} aria-hidden /> : null;
}

// The colour a step's name states, never a status role: Red is the brand red, not the warning.
const TONES = {
  red: "text-red",
  green: "text-green-dark",
} as const;

/** A flow step as the process slide passes it: the block's step plus a `label` (a
 *  multiplier or stage name: in the tile while every label fits it, else above the title), a
 *  teal `subtitle`, a closing `badge` and `dim` for a stage outside the story. */
export type FlowStep = Of<"flow">["steps"][number] & {
  label?: string;
  subtitle?: string;
  badge?: string;
  dim?: boolean;
};

// A label of up to four characters ("10x") fits the tile; one longer moves above the title, for
// every step of the row, so the tiles stay one kind.
const TILE_LABEL = 4;

// On a phone a row of steps holds a title's longest word only where it fits a column: a mono
// glyph is 0.6em of the title's `--type-body-size` (1rem there, Visuals.css), the narrowest phone
// leaves the row 20rem inside `--slide-phone-padding`, and a column pads 0.5rem (`--spacing` each
// side). A word wider than its column, which the hyphenator cannot always split ("Autocomplete"),
// stands the steps one under another instead, as five and more do (Visuals.css).
function fitsPhoneRow(steps: FlowStep[]) {
  const word = Math.max(
    ...steps.flatMap((step) =>
      step.title
        .replace(/[*_`]/g, "")
        .split(/\s+/)
        .map((w) => w.length),
    ),
  );
  return steps.length * (word * 0.6 + 0.5) <= 20;
}

/** Steps on one line with a tile each, as the flow block draws them; the process
 *  slides draw theirs with it too. `loop` draws the arrow from the last step back to the first,
 *  labelled when non-empty. `revealed` shows the first n steps, the line to each and the loop
 *  once all show. `dense` draws the small tiles and titles of the pipeline it replaces. */
export function FlowSteps({
  steps,
  highlight,
  loop,
  revealed = steps.length,
  dense = false,
}: {
  steps: FlowStep[];
  highlight?: number;
  loop?: string;
  revealed?: number;
  dense?: boolean;
}) {
  const n = steps.length;
  // Six and more steps leave a column about a sixth of the slide: a size down keeps the labels
  // whole words.
  const narrow = n >= 6;
  // The line runs through the tiles' middle: half an xl tile, or half a sm one when dense.
  const mid = dense ? "top-5" : "top-12";
  const centre = (i: number) => `${((i + 0.5) / n) * 100}%`;
  const edge = `${(0.5 / n) * 100}%`;
  const inTile = steps.every((step) => (step.label?.length ?? 0) <= TILE_LABEL);
  // A label carrying a number ("Stage 1", "Monat 2 und 3") already counts: the tiles stay empty
  // rather than repeat or contradict it.
  const counted = !steps.some((step) => /\d/.test(step.label ?? ""));
  const show = (on: boolean) =>
    `transition-opacity duration-500 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`;
  return (
    <div
      className={`slide-flow relative w-full ${n >= 5 || !fitsPhoneRow(steps) ? "slide-flow-long" : ""}`}
    >
      {/* The loop runs above the nodes, out of the last one and down into the first. */}
      {loop !== undefined && (
        <div
          className={`slide-flow-loop relative mb-2 ${loop ? "h-24" : "h-16"} ${show(revealed >= n)}`}
          data-back={steps[0]?.title}
          aria-hidden
        >
          <div
            className={`absolute ${loop ? "top-6" : "top-2"} bottom-0 rounded-t-(--slide-loop-bend) border-x-4 border-t-4`}
            style={{ left: edge, right: edge, borderColor: GREY }}
          />
          <svg
            className="absolute bottom-0 h-6 w-7 -translate-x-1/2"
            style={{ left: centre(0) }}
            viewBox="0 0 28 24"
          >
            <path d="M0 0 H28 L14 24 Z" fill={GREY} />
          </svg>
          {loop && (
            <span
              className={`absolute top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--slide-ground) px-6 font-sans text-xl font-semibold text-text`}
            >
              {loop}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        {steps.slice(1).map((_, i) => (
          <div key={i} className={`slide-flow-link ${show(i + 1 < revealed)}`} aria-hidden>
            <div
              className={`absolute ${mid} h-1 -translate-y-1/2`}
              style={{
                left: centre(i),
                right: `${100 - ((i + 1.5) / n) * 100}%`,
                background: GREY,
              }}
            />
            <svg
              className={`absolute ${mid} h-7 w-6 -translate-x-full -translate-y-1/2`}
              style={{ left: `calc(${centre(i + 1)} - var(--slide-arrow-inset))` }}
              viewBox="0 0 24 28"
            >
              <path d="M0 0 L24 14 L0 28 Z" fill={GREY} />
            </svg>
          </div>
        ))}
        <div
          className="slide-flow-steps relative grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {steps.map((step, i) => {
            const on = highlight === i;
            // A tone (red, green) colours the step's words only, so the nodes stay one family.
            const tone = step.tone ? TONES[step.tone] : undefined;
            const ink = step.dim ? "text-text-muted" : (tone ?? "text-text");
            const accent = step.dim ? "text-text-muted" : "text-primary";
            return (
              <div
                key={i}
                inert={i >= revealed}
                className={`slide-flow-step flex flex-col items-center ${narrow ? "px-2" : "px-5"} text-center ${show(i < revealed)}`}
              >
                <NumberTile
                  size={dense ? "sm" : "xl"}
                  tone={on ? "solid" : "none"}
                  className={
                    on
                      ? "relative"
                      : `relative border-4 border-text-muted bg-(--slide-ground) ${ink}`
                  }
                >
                  {step.icon && iconMap[step.icon] ? (
                    <Icon name={step.icon} className={dense ? "h-5 w-5" : "h-12 w-12"} />
                  ) : step.label && inTile ? (
                    step.label
                  ) : (
                    counted && i + 1
                  )}
                </NumberTile>
                {step.label && !inTile && (
                  <span
                    className="hw-label mt-5 -mb-4 text-balance [--hw-label-size:var(--text-xl)]"
                    data-tone={step.dim ? "muted" : undefined}
                  >
                    {step.label}
                  </span>
                )}
                <h2
                  className={`${dense ? "mt-2" : "mt-7"} ${dense ? LABEL.replace("text-4xl", "text-xl") : narrow ? LABEL.replace("text-4xl", "text-2xl") : LABEL} ${on ? "text-primary" : ink}`}
                >
                  {renderMarkdown(step.title)}
                </h2>
                {step.subtitle && (
                  <p className={`mt-2 text-xl font-semibold text-balance ${accent}`}>
                    {renderMarkdown(step.subtitle)}
                  </p>
                )}
                {step.text && (
                  // Pretty, as every slide paragraph (slides.css), not balanced: in a narrow column
                  // balance broke a hyphenated word and left "Multi-" alone on its line.
                  <p className={`mt-3 ${CAPTION} ${step.dim ? "text-text-muted" : "text-text"}`}>
                    {renderMarkdown(step.text)}
                  </p>
                )}
                {step.badge && (
                  <p className={`mt-3 text-xl font-semibold ${accent}`}>
                    {renderMarkdown(step.badge)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Flow({ block }: { block: Of<"flow"> }) {
  const steps = (
    <FlowSteps
      steps={block.steps}
      highlight={block.highlight}
      loop={block.loop}
      dense={block.dense}
    />
  );
  return block.frame ? <Framed frame={block.frame}>{steps}</Framed> : steps;
}

/** The teal dashed frame round a group of steps: its label with logos above, its notes beside
 *  the steps, its footer under a rule. A flow's `frame` and the pipeline's container draw it. */
export function Framed({ frame, children }: { frame: FlowFrame; children: ReactNode }) {
  return (
    <DashedFrame tone="primary" active={!!frame.label} className="w-full p-6">
      {frame.label && (
        <div className="hw-label mb-4 flex items-baseline gap-2 [--hw-label-size:var(--text-sm)]">
          <div className="hw-marker bg-primary" />
          <span>{frame.label}</span>
          {frame.logos?.map((logo, i) => (
            <Image
              key={i}
              src={logo.src}
              alt={logo.alt}
              width={28}
              height={28}
              className="ml-1 h-7 w-auto self-center"
            />
          ))}
        </div>
      )}
      {/* On a phone the notes go under the steps, which take the frame's whole width (Visuals.css). */}
      <div
        className={`flex flex-wrap items-center justify-center ${frame.notes ? "gap-6" : "gap-4"}`}
      >
        <div className="slide-framed-steps min-w-0 flex-1">{children}</div>
        {frame.notes && (
          <>
            <div className="slide-framed-rule h-16 w-px bg-primary/25" />
            <ul className="slide-framed-notes space-y-1.5">
              {frame.notes.map((note, i) => (
                <li key={i} className="flex items-baseline gap-2 text-base text-text-muted">
                  <span className="hw-marker slide-marker-nested bg-primary" />
                  <span>{renderMarkdown(note)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {frame.footer && (
        <p className="mt-4 border-t border-primary/25 pt-3 text-base text-text-muted">
          {renderMarkdown(frame.footer)}
        </p>
      )}
    </DashedFrame>
  );
}

function Layers({ block }: { block: Of<"layers"> }) {
  return (
    <div className="flex w-full flex-col gap-5">
      {block.layers.map((layer, i) => {
        const on = block.highlight === i;
        return (
          <div
            key={i}
            className={`flex items-center gap-10 border-4 bg-white px-10 py-7 max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-3 max-md:px-6 max-md:py-5 ${CARD} ${on ? "border-primary" : "border-border"}`}
          >
            {block.ordered && (
              <NumberTile size="lg" tone={on ? "solid" : "ink"}>
                {i + 1}
              </NumberTile>
            )}
            <h2
              className={`min-w-0 flex-1 md:w-96 md:flex-none ${LABEL} ${on ? "text-primary" : "text-text"}`}
            >
              {renderMarkdown(layer.title)}
            </h2>
            {layer.text && (
              <p className={`flex-1 max-md:basis-full ${CAPTION} text-text`}>
                {renderMarkdown(layer.text)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ on, future }: { on: boolean; future: boolean }) {
  return (
    <span
      className={`relative rounded-brand-sm ${
        on
          ? "h-12 w-12 bg-primary ring-8 ring-primary/15"
          : future
            ? "h-9 w-9 border-4 bg-(--slide-ground)"
            : "h-9 w-9 bg-text"
      }`}
      style={future && !on ? { borderColor: GREY } : undefined}
    />
  );
}

// A row label: the column header of the table a timeline replaced, level with its row.
// `className` carries the top margin of the row's own text, so the label starts level with it.
// Row labels count only when one carries text: an empty object would open an empty column.
function givenLabels(labels?: { when?: string; title?: string; text?: string }) {
  return labels && (labels.when || labels.title || labels.text) ? labels : undefined;
}

function RowLabel({
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
      className={`slide-timeline-row-label col-start-1 pr-8 font-sans ${CAPTION} font-semibold text-text-muted ${className}`}
      style={{ gridRow: row }}
    >
      {text}
    </span>
  );
}

// A segment's label, such as a duration, set on the line it labels: the line breaks for it, so it
// reads as the time between two events. Above the line it reads less clearly as a duration, and
// set as the event's date it reads as a point in time.
function SegmentLabel({ text, tight }: { text: string; tight?: boolean }) {
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
function EventBody({
  event,
  tone,
  className,
  balance,
}: {
  event: Of<"timeline">["events"][number];
  tone: string;
  className: string;
  balance?: boolean;
}) {
  return (
    <div className={className}>
      {event.text && (
        <p className={`${CAPTION} text-text ${balance ? "text-balance" : ""}`}>
          {renderMarkdown(event.text)}
        </p>
      )}
      {event.figure && (
        <span
          className={`${event.text ? "mt-8" : "mt-4"} block font-heading text-(length:--slide-figure-size) leading-(--slide-figure-leading) font-bold tracking-(--slide-figure-tracking) ${tone}`}
        >
          <Figure value={event.figure} />
        </span>
      )}
    </div>
  );
}

// The line between two stages, solid up to now and dashed after: a variable Visuals.css draws as
// the top border, and on a phone, where the timeline stands upright, as the left one.
const timelineRule = (dashed: boolean) =>
  ({
    "--slide-timeline-rule": `var(--slide-rule-heavy) ${dashed ? "dashed" : "solid"} ${GREY}`,
  }) as CSSProperties;

// How far a continued timeline's line runs past its column or grid: beyond the slide's edge, which
// clips it, whatever row labels stand before the first column or how far the fit guard shrinks.
const BLEED = "calc(-1 * (var(--slide-side) + 100%))";

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

function Timeline({ block }: { block: Of<"timeline"> }) {
  const n = block.events.length;
  const now = block.now ?? n - 1;
  const tone = (i: number) => (block.highlight === i ? "text-primary" : "text-text");
  if (n < 6) return <Stages block={block} now={now} tone={tone} />;
  // A phone stands every timeline as one column of stages (Visuals.css), the staggered one too.
  return (
    <>
      <div className="w-full max-md:hidden">
        <Staggered block={block} now={now} tone={tone} />
      </div>
      <div className="w-full md:hidden">
        <Stages block={block} now={now} tone={tone} />
      </div>
    </>
  );
}

function Stages({
  block,
  now,
  tone,
}: {
  block: Of<"timeline">;
  now: number;
  tone: (i: number) => string;
}) {
  const n = block.events.length;
  const { into, onward } = continuation(block);
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
        {block.events.map((e, i) => {
          const segment = block.events[i + 1]?.segment;
          return (
            <div
              key={i}
              className="slide-timeline-stage relative row-span-4 row-start-1 grid grid-rows-subgrid px-4"
            >
              <span className={`font-heading text-3xl font-bold ${tone(i)}`}>{e.when}</span>
              <div className="slide-timeline-axis relative flex h-12 items-center">
                {i === 0 && into && <Lead side="in" dashed={now < 0} />}
                {i === n - 1 && onward && <Lead side="out" dashed={i >= now} />}
                {i < n - 1 && (
                  <div
                    className="slide-timeline-link absolute top-1/2 -right-8 left-6 -translate-y-1/2"
                    style={timelineRule(i >= now)}
                  />
                )}
                {/* Halfway between this stage's dot and the next one's, a column and a dot apart. */}
                {segment && (
                  <span className="slide-timeline-segment absolute top-1/2 left-1/2 ml-8 -translate-x-1/2 -translate-y-1/2">
                    <SegmentLabel text={segment} />
                  </span>
                )}
                <Dot on={block.highlight === i} future={i > now} />
              </div>
              <h2 className={`mt-6 ${LABEL} ${tone(i)}`}>{renderMarkdown(e.title)}</h2>
              <EventBody event={e} tone={tone(i)} className="mt-3" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Six and more stages alternate above and below the line, so each label gets two columns' width
// instead of one. The grid has two tracks per stage; a stage's dot sits on the line between them.
// Rows: date, title, text and leader above (1-4), the line (5), leader, date, title and text below
// (6-9). Each label is a subgrid over its four rows, so every date, title and text starts level
// with its neighbours on the same side, and the leader stretches to the line.
function Staggered({
  block,
  now,
  tone,
}: {
  block: Of<"timeline">;
  now: number;
  tone: (i: number) => string;
}) {
  const n = block.events.length;
  // Two half-width tracks per stage plus one at each end, so the first and last labels can centre
  // on their dots too: stage i's dot sits on grid line 2i + 3, its label spans two tracks each side.
  // Row labels, when given, take a first column and shift every line by one.
  const tracks = 2 * n + 2;
  const labels = givenLabels(block.labels);
  const shift = labels ? 1 : 0;
  const edge = `${(2 / tracks) * 100}%`;
  const leader = <span className="mx-auto h-full min-h-6 w-1" style={{ background: GREY }} />;
  const { into, onward } = continuation(block);
  return (
    <div
      className={`${block.continues ? "slide-timeline-continued" : ""} grid w-full grid-rows-[auto_auto_auto_--spacing(6)_--spacing(14)_--spacing(6)_auto_auto_auto]`}
      style={{
        gridTemplateColumns: `${labels ? "auto " : ""}repeat(${tracks}, minmax(0, 1fr))`,
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
      <div className="relative row-start-5" style={{ gridColumn: `${1 + shift} / -1` }} aria-hidden>
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2"
          style={{ left: into ? BLEED : edge, right: onward ? BLEED : edge, background: GREY }}
        />
      </div>
      {block.events.map((e, i) => {
        const above = i % 2 === 0;
        const line = 2 * i + 3 + shift;
        const body = e.text || e.figure;
        return (
          <div key={i} className="contents">
            <div
              className={`grid grid-rows-subgrid px-3 text-center ${above ? "row-[1/5]" : "row-[6/10]"}`}
              style={{ gridColumn: `${line - 2} / ${line + 2}` }}
            >
              {!above && (
                <span className="flex" aria-hidden>
                  {leader}
                </span>
              )}
              <span className={`font-heading text-3xl font-bold ${tone(i)}`}>{e.when}</span>
              <h2 className={`mt-2 ${LABEL} ${tone(i)}`}>{renderMarkdown(e.title)}</h2>
              {body && <EventBody event={e} tone={tone(i)} className="mt-2" balance />}
              {/* Above, a stage without text runs its leader up through the text row. */}
              {above && (
                <span className="flex pt-3" style={{ gridRow: body ? "4" : "3 / 5" }} aria-hidden>
                  {leader}
                </span>
              )}
            </div>
            <div
              className="relative row-start-5 flex items-center justify-center"
              style={{ gridColumn: `${line - 1} / ${line + 1}` }}
            >
              <Dot on={block.highlight === i} future={i > now} />
            </div>
            {i > 0 && e.segment && (
              <div
                className="relative row-start-5 flex items-center justify-center"
                style={{ gridColumn: `${line - 2} / ${line}` }}
              >
                <SegmentLabel text={e.segment} tight />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Transform({ block }: { block: Of<"transform"> }) {
  return (
    <div className="flex w-full justify-center">
      <BeforeAfterSides left={block.before} right={block.after} after strike={false} />
    </div>
  );
}

function Bars({ block }: { block: Of<"bars"> }) {
  const anyHighlight = block.bars.some((b) => b.highlight);
  const bars =
    block.order === "given" ? block.bars : [...block.bars].sort((a, b) => b.value - a.value);
  const max = block.max ?? (Math.max(...bars.map((b) => b.value), 0) || 1);
  const tall = bars.length <= 3;
  // Five bars and more set each label left of its track, one row per bar, so six ranges and a
  // callout fit one slide above the fit guard's 0.8.
  const inline = bars.length > 4;
  const track = (bar: (typeof bars)[number]) => (
    <div
      className={`relative ${inline ? "h-12" : tall ? "h-20" : "h-14"} ${block.max != null ? "border-r-4 border-text/25 bg-text/[0.07]" : ""} rounded-r-sm`}
    >
      {/* A named scale marks its quarters, so a bar's ends read against it. */}
      {block.max != null &&
        [25, 50, 75].map((q) => (
          <div
            key={q}
            className="absolute inset-y-0 border-l-2 border-bg"
            style={{ left: `${q}%` }}
          />
        ))}
      {/* A range starts at its low end, rounded at both ends since neither is the axis. */}
      <div
        className={`relative h-full ${bar.from != null ? "rounded-sm" : "rounded-r-sm"}`}
        style={{
          marginLeft: `${((bar.from ?? 0) / max) * 100}%`,
          width: `${Math.max(((bar.value - (bar.from ?? 0)) / max) * 100, 0.5)}%`,
          // Grey is context for a highlighted bar; with none highlighted every bar is data.
          background: bar.highlight || !anyHighlight ? "var(--color-primary)" : CONTEXT,
        }}
      />
    </div>
  );
  // With a highlight, a bar that is not one is context: its label and value in the muted grey at
  // the regular weight, so the eye lands on the highlighted ones first: in bold ink, context bars
  // would outweigh the teal highlighted ones.
  const context = (bar: (typeof bars)[number]) => anyHighlight && !bar.highlight;
  const tone = (bar: (typeof bars)[number], weight: string) =>
    context(bar)
      ? "font-normal text-text-muted"
      : `${weight} ${bar.highlight ? "text-primary" : "text-text"}`;
  // A named scale is numbered under the last track at its ends and quarters, in the track's
  // column of the bars' grid.
  const scale = block.max != null && (
    <div aria-hidden className={`${CAPTION} relative mt-3 text-text-muted tabular-nums`}>
      {/* The 0 stands in the flow and gives the row its height; the others sit on their mark. */}
      {[0, 25, 50, 75, 100].map((q) => (
        <span
          key={q}
          className={`${q ? "absolute" : "inline-block"} -translate-x-1/2 ${q === 100 ? "max-md:-translate-x-full" : ""}`}
          style={q ? { left: `${q}%` } : undefined}
        >
          {Math.round((max * q) / 100)}
        </span>
      ))}
    </div>
  );
  const value = (bar: (typeof bars)[number]) => (
    <span
      className={`font-heading ${inline ? "text-4xl" : "text-5xl"} whitespace-nowrap ${tone(bar, "font-bold")}`}
    >
      {bar.display ?? (bar.from != null ? `${bar.from}–${bar.value}` : bar.value)}
    </span>
  );
  return (
    <div className="w-full">
      <div className={`flex flex-col ${inline ? "gap-5" : tall ? "gap-12" : "gap-7"}`}>
        {bars.map((bar, i) =>
          inline ? (
            <div
              key={i}
              className="grid grid-cols-[--spacing(72)_minmax(0,1fr)_--spacing(56)] items-center gap-8"
            >
              <span
                className={`font-sans text-3xl leading-tight text-balance ${tone(bar, "font-semibold")}`}
              >
                {renderMarkdown(bar.label)}
              </span>
              {track(bar)}
              {value(bar)}
            </div>
          ) : (
            <div key={i}>
              <span
                className={`font-sans text-4xl leading-tight tracking-tight text-balance ${tone(bar, "font-semibold")}`}
              >
                {renderMarkdown(bar.label)}
              </span>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_--spacing(56)] items-center gap-8">
                {track(bar)}
                {value(bar)}
              </div>
            </div>
          ),
        )}
      </div>
      {scale &&
        (inline ? (
          <div className="grid grid-cols-[--spacing(72)_minmax(0,1fr)_--spacing(56)] gap-8">
            <div className="col-start-2">{scale}</div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_--spacing(56)] gap-8">{scale}</div>
        ))}
      <Source text={block.source} />
    </div>
  );
}

// A leading hyphen in a figure is a minus: set the typographic one, which sits on the digits' axis.
const minus = (v: string) => v.replace(/^-(?=\d)/, "−");

// A figure's leading words ("about $2M", "up to +70%"): every lowercase word before the first
// token that is not one. They are set small, so only the figure itself carries weight; `quiet`
// sets them in the label's face, where six figures on a slide would otherwise compete with them.
const leadingWords = (value: string) => /^((?:[a-z]+\s+)+)(?=[^a-z\s])/.exec(value)?.[1] ?? "";

// A grid of n equal columns. The count is a custom property, never an inline column template,
// which would outrank the phone rule in slides.css that stacks every grid into one column.
const COLUMNS = "grid-cols-[repeat(var(--slide-cols),minmax(0,1fr))]";
const columns = (n: number) => ({ "--slide-cols": n }) as CSSProperties;
// A figure's width in mono characters (0.6em each), leading words set at about half size counting
// half.
const figureChars = (value: string) => {
  const lead = leadingWords(value);
  return value.length - lead.length + 0.5 * lead.trim().length;
};
// The size, in % of its column's width, at which the widest figure fits on one line, which the
// phone rule in Visuals.css caps the figures at: one character more where leading words stand, for
// their gap and their true size (0.55em), which a half undercounts.
const figureFit = (values: string[]) => {
  const chars = Math.max(...values.map((v) => figureChars(v) + (leadingWords(v) ? 1 : 0)));
  return { "--slide-figure-fit": `${+(100 / (chars * 0.6)).toFixed(2)}cqi` } as CSSProperties;
};

function Figure({ value, quiet }: { value: string; quiet?: boolean }) {
  const lead = leadingWords(value);
  if (!lead) return <>{minus(value)}</>;
  return (
    <>
      <span
        className={`mr-(--slide-figure-unit-gap) ${quiet ? "font-sans text-3xl font-medium tracking-(--type-body-tracking) text-text-muted" : "text-(length:--slide-figure-unit)"}`}
      >
        {lead.trim()}
        {/* The gap is the margin; this space, set too small to draw, keeps the words apart in the
            text a PDF, a search or a screen reader takes ("about 4", never "about4"). */}
        <span className="text-(length:--slide-figure-space)"> </span>
      </span>
      {minus(value.slice(lead.length))}
    </>
  );
}

function Numbers({ block }: { block: Of<"numbers"> }) {
  const n = block.items.length;
  if (n === 1) {
    const item = block.items[0];
    return (
      <div className="w-full">
        <div className="slide-figure-row flex items-center gap-16" style={figureFit([item.value])}>
          <span
            className={`font-heading text-(length:--slide-figure-hero) leading-none font-bold tracking-tight text-primary`}
          >
            <Figure value={item.value} />
          </span>
          <span className="max-w-(--slide-measure-figure-label) text-5xl leading-tight font-semibold text-balance text-text">
            {renderMarkdown(item.label)}
            {item.text && (
              <span className={`mt-4 block font-normal ${CAPTION} text-text-muted`}>
                {renderMarkdown(item.text)}
              </span>
            )}
          </span>
        </div>
        <Source text={block.source} />
      </div>
    );
  }
  // Up to four figures stand in one row; more wrap, five and six into three columns, so a column
  // never narrows below a quarter of the slide.
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  // One size for every figure, set by the longest, so the row shares a baseline and none wraps:
  // a column is about 1650/cols px wide at 1920, a rem 21.333px.
  const longest = Math.max(...block.items.map((i) => figureChars(i.value)));
  // Wrapped figures read as one grid at a glance: no rule, the label bold against its line, each
  // pair close to its figure, and in three columns the rows far apart, so a note never reads as
  // the next figure's. Open space groups them better than a card or a rule per figure, which crowd
  // the slide. Four columns keep the closer rows, or two rows of notes run past the slide's foot.
  const wrapped = n > 4;
  const look = wrapped
    ? {
        cap: 5,
        grid: cols === 3 ? "mt-8 gap-x-16 gap-y-28" : "gap-16",
        label: "mt-4 leading-tight font-semibold",
        text: "mt-1 text-pretty",
        source: "mt-16",
      }
    : {
        cap: cols === 2 ? 9 : 7,
        grid: "gap-x-14 gap-y-12",
        label: "mt-6 border-t-4 border-border pt-6 leading-snug",
        text: "mt-3",
        source: undefined,
      };
  const size = Math.min(look.cap, (1650 / cols - 60) / (longest * 0.6) / 21.333);
  return (
    <div className="w-full">
      <div
        className={`grid w-full ${COLUMNS} ${look.grid}`}
        style={{ ...columns(cols), ...figureFit(block.items.map((i) => i.value)) }}
      >
        {block.items.map((item, i) => (
          <div key={i} className="slide-figure-cell flex flex-col">
            <span
              className="font-heading text-(length:--slide-figure-grid-size) leading-none font-bold tracking-tight whitespace-nowrap text-primary"
              style={{ "--slide-figure-grid-size": `${size}rem` } as CSSProperties}
            >
              <Figure value={item.value} quiet={wrapped} />
            </span>
            <span className={`text-3xl text-text ${look.label}`}>{renderMarkdown(item.label)}</span>
            {item.text && (
              <span className={`${look.text} ${CAPTION} text-text-muted`}>
                {renderMarkdown(item.text)}
              </span>
            )}
          </div>
        ))}
      </div>
      <Source text={block.source} gap={look.source} />
    </div>
  );
}

const BESIDE_NOTES = "flex w-full items-center gap-12 max-md:flex-col max-md:items-stretch";

/** The numbered notes beside an annotated picture or code. A note of one line centres on its tile,
 *  a longer one starts level with it. */
function Notes({ notes }: { notes: { text: string }[] }) {
  return (
    <ol className="flex min-w-0 flex-1 flex-col gap-9">
      {notes.map((n, i) => (
        <li key={i} className="flex items-start gap-5">
          <NumberTile size="lg">{i + 1}</NumberTile>
          <p className="flex min-h-16 flex-col justify-center text-3xl leading-snug text-text [&_strong]:block [&_strong]:text-4xl">
            <span>{renderMarkdown(n.text)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function Annotated({ block }: { block: Of<"annotated"> }) {
  const [w, h] = block.size;
  const top = block.crop?.top ?? 0;
  // A right crop drops an editor's minimap and scrollbar: the image is set wider than the frame.
  const right = block.crop?.right ?? 1;
  const span = (block.crop?.bottom ?? 1) - top;
  // A note's y is a fraction of the whole image; inside the crop it is a fraction of the window.
  const at = (y: number) => `${((y - top) / span) * 100}%`;
  return (
    <div className={BESIDE_NOTES}>
      {/* The numbers stand in a gutter left of the frame, level with their bands, off the code. */}
      <div className="relative flex shrink-0 pl-16 max-md:pl-9">
        {/* The frame takes the crop's shape at the largest size that fits 50rem by 38rem, which
            leaves the notes room for a line of a few words. */}
        <div
          className={`relative max-w-full shrink-0 overflow-hidden border-4 border-text bg-text ${CARD}`}
          style={{
            width: `${Math.min(50, (38 * w * right) / (h * span))}rem`,
            aspectRatio: `${w * right} / ${h * span}`,
          }}
        >
          <Image
            src={block.src}
            alt={block.alt ?? ""}
            width={w}
            height={h}
            className="absolute left-0 h-auto max-w-none"
            style={{ top: `${(-top / span) * 100}%`, width: `${100 / right}%` }}
          />
          {block.notes.map((n, i) => (
            <div
              key={i}
              className="absolute inset-x-2 -translate-y-1/2 rounded-brand-sm border-(length:--slide-rule-strong) border-primary bg-primary/25"
              style={{ top: at(n.y), height: `${((n.h ?? 0.03) / span) * 100}%` }}
            />
          ))}
        </div>
        {block.notes.map((n, i) => (
          <span key={i} className="absolute left-0 -translate-y-1/2" style={{ top: at(n.y) }}>
            <NumberTile className="max-md:size-7 max-md:text-sm">{i + 1}</NumberTile>
          </span>
        ))}
      </div>
      <Notes notes={block.notes} />
    </div>
  );
}

// A wrapped code line continues two characters right of its own indent, never at column 0.
const hang = (line: string) => {
  const ch = line.length - line.trimStart().length + 2;
  return { paddingLeft: `${ch}ch`, textIndent: `-${ch}ch` };
};

function AnnotatedCode({ block }: { block: Of<"annotated-code"> }) {
  const marked = new Map(block.notes.map((n, i) => [n.line, i + 1]));
  // An excerpt cut from deeper in a file keeps its indent; drop the indent every line shares.
  const lines = block.code.split("\n");
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  );
  const highlightLines = useHighlightLines();
  const tokens = highlightLines(lines.map((l) => l.slice(indent)).join("\n"), block.language);
  return (
    <div className={BESIDE_NOTES}>
      <CodePanel as="pre" className="min-w-0 flex-[1.4] overflow-hidden py-6">
        <code className="block font-code text-xl leading-snug max-md:text-(length:--type-small-size)">
          {lines.map((line, i) => {
            const n = marked.get(i + 1);
            // Under a marked line's teal a comment in night-subtle falls to 4.3:1 (dark theme):
            // there it takes the grey halfway to night-muted, 5.6:1, still below the code's. The
            // badge's numeral stands on the line's first baseline, so a wrapped line keeps it there.
            return (
              <div
                key={i}
                className={`flex items-baseline gap-4 border-l-(length:--slide-rule-accent) pr-6 pl-4 ${n ? "border-primary bg-primary/25 [--code-comment:var(--slide-code-comment-lit)]" : "border-transparent"}`}
              >
                {marked.size > 0 && (
                  <span className="flex w-10 shrink-0 justify-center">
                    {n && <NumberTile size="sm">{n}</NumberTile>}
                  </span>
                )}
                <span
                  className="min-w-0 break-words whitespace-pre-wrap"
                  style={hang(line.slice(indent))}
                >
                  {tokens[i]}
                </span>
              </div>
            );
          })}
        </code>
      </CodePanel>
      {block.notes.length > 0 && <Notes notes={block.notes} />}
    </div>
  );
}

function Cards({ block }: { block: Of<"cards"> }) {
  const n = block.items.length;
  const cols = block.columns ?? (n === 4 ? 2 : Math.min(n, 3));
  const wide = cols >= 4;
  const dense = !!block.dense;
  // Four columns leave a card about a quarter of the slide: the title steps down one size. Dense
  // cards keep the sizes of the four-column and labeled-grid blocks they replace.
  const label = dense
    ? `card-title ${wide ? "text-lg" : "text-xl"}`
    : wide
      ? LABEL.replace("text-4xl", "text-3xl")
      : LABEL;
  const text = dense ? "card-text-lg text-text-muted" : `${CAPTION} text-text`;
  const entry = dense ? "card-text-base text-text-muted" : `${CAPTION} text-text`;
  const pad = dense ? (wide ? "card-pad-5" : "card-pad-6") : wide ? "card-pad-6" : "card-pad-8/9";
  const { revealedCount } = useProgressiveReveal({ totalSteps: n, startFull: !block.reveal });
  const from = block.numberFrom ?? 1;
  return (
    <div className={`grid w-full ${COLUMNS} ${dense ? "gap-5" : "gap-6"}`} style={columns(cols)}>
      {block.items.map((item, i) => {
        const on = block.highlight === i;
        const shown = i < revealedCount;
        return (
          <SlideCard
            key={i}
            inert={!shown}
            tone={on ? "primary" : "neutral"}
            className={`flex flex-col transition-all duration-500 ${dense ? "gap-1" : "gap-5"} ${pad} ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          >
            {block.numbered ? (
              <NumberTile size="lg">{i + from}</NumberTile>
            ) : item.icon ? (
              <NumberTile size="lg" tone={on ? "solid" : "soft"}>
                <Icon name={item.icon} className="h-9 w-9" />
              </NumberTile>
            ) : (
              !dense && <span className="h-1.5 w-16 bg-primary" aria-hidden />
            )}
            {item.title && (
              <h2 className={`${label} ${on ? "text-primary" : "text-text"}`}>
                {renderMarkdown(item.title)}
              </h2>
            )}
            {item.text && (
              <p className={`${text} [&_strong]:text-text`}>{renderMarkdown(item.text)}</p>
            )}
            {item.items && (
              <ul className={`flex flex-col ${dense ? "mt-2 gap-2" : "gap-3"}`}>
                {item.items.map((line, j) => (
                  <li key={j} className={`flex items-baseline gap-3 ${entry}`}>
                    <span className="hw-marker" />
                    <span>{renderMarkdown(line)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SlideCard>
        );
      })}
    </div>
  );
}

/** One content block of the diagram vocabulary. */
export function Visual({ block }: { block: VisualBlock }) {
  switch (block.type) {
    case "flow":
      return <Flow block={block} />;
    case "layers":
      return <Layers block={block} />;
    case "timeline":
      return <Timeline block={block} />;
    case "transform":
      return <Transform block={block} />;
    case "bars":
      return <Bars block={block} />;
    case "numbers":
      return <Numbers block={block} />;
    case "annotated":
      return <Annotated block={block} />;
    case "annotated-code":
      return <AnnotatedCode block={block} />;
    case "cards":
      return <Cards block={block} />;
  }
}
