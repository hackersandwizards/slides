import { ArrowRight } from "lucide-react";
import Image from "../ui/image";
import type { VisualBlock } from "../../types/slide";
import { iconMap } from "../../lib/icons";
import { highlightLines } from "../../lib/code-highlight";
import { renderMarkdown } from "../../lib/markdown";

// The diagram vocabulary of a content slide: one relationship per block, drawn so the eye reads
// the structure before the words. Shared rules, from the deck checklist:
// - one emphasis colour (the brand teal); everything else is ink or the brand's muted grey;
// - every element labelled where it sits, never through a legend;
// - labels 45px and captions 37px at 1920 (22 and 18px in a 960px Meet window), sources 32px;
// - strokes 4px and up, so video compression keeps them;
// - the brand corner (large top-left and bottom-right) on every card.

const CARD = "rounded-brand";
// The brand's muted grey: 7:1 on the page, so a context bar or a connector in it reads.
const GREY = "var(--color-muted)";
// Diagram labels are set in the body face: the mono heading face breaks a narrow label into
// fragments ("economically / viable").
const LABEL = "font-sans text-[2.125rem] font-semibold leading-tight tracking-tight text-balance";
// The smallest running text a visual sets: 36px at 1920, the checklist's floor.
const CAPTION = "text-[1.75rem] leading-snug";
// Context marks (a bar that is not the point) in a lighter grey, 3:1 on the page: the brand ink
// a little past its border-strong step, which reaches 2.9:1.
const CONTEXT = "color-mix(in srgb, var(--color-ink) 52%, white)";

type Of<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

function Source({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-10 text-2xl text-text-muted">{renderMarkdown(text)}</p>;
}

function Icon({ name, className }: { name?: string; className?: string }) {
  const Glyph = name ? iconMap[name] : undefined;
  return Glyph ? <Glyph className={className} strokeWidth={2.75} aria-hidden /> : null;
}

// The colour a step's name states, never a status role: Red is the brand red, not the warning.
const TONES = {
  red: "text-red",
  green: "text-success",
} as const;

// ─── flow: steps in order on one line, an optional loop back ────────────────

function Flow({ block }: { block: Of<"flow"> }) {
  const n = block.steps.length;
  const centre = (i: number) => `${((i + 0.5) / n) * 100}%`;
  const edge = `${(0.5 / n) * 100}%`;
  return (
    <div className="relative w-full">
      {/* The loop runs above the nodes, out of the last one and down into the first. */}
      {block.loop && (
        <div className="relative mb-2 h-24" aria-hidden>
          <div
            className="absolute top-6 bottom-0 rounded-t-[1.25rem] border-x-4 border-t-4"
            style={{ left: edge, right: edge, borderColor: GREY }}
          />
          <svg
            className="absolute bottom-0 h-6 w-7 -translate-x-1/2"
            style={{ left: centre(0) }}
            viewBox="0 0 28 24"
          >
            <path d="M0 0 H28 L14 24 Z" fill={GREY} />
          </svg>
          <span
            className={`absolute top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-6 font-sans text-[1.75rem] font-semibold text-text`}
          >
            {block.loop}
          </span>
        </div>
      )}
      <div className="relative">
        {/* The line the steps sit on, from the first node's centre to the last one's. */}
        <div
          className="absolute top-12 h-1 -translate-y-1/2"
          style={{ left: edge, right: edge, background: GREY }}
        />
        {/* Arrowheads where the line meets the next node. */}
        {block.steps.slice(1).map((_, i) => (
          <svg
            key={i}
            className="absolute top-12 h-7 w-6 -translate-x-full -translate-y-1/2"
            style={{ left: `calc(${centre(i + 1)} - 4rem)` }}
            viewBox="0 0 24 28"
            aria-hidden
          >
            <path d="M0 0 L24 14 L0 28 Z" fill={GREY} />
          </svg>
        ))}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {block.steps.map((step, i) => {
            const on = block.highlight === i;
            // A tone (red, green) colours the step's words only, so the nodes stay one family.
            const tone = step.tone ? TONES[step.tone] : undefined;
            return (
              <div key={i} className="flex flex-col items-center px-5 text-center">
                <span
                  className={`relative flex h-24 w-24 items-center justify-center rounded-brand-sm font-heading text-4xl font-bold ${
                    on ? "bg-primary text-white" : `border-4 bg-background ${tone ?? "text-text"}`
                  }`}
                  style={on ? undefined : { borderColor: GREY }}
                >
                  {step.icon ? <Icon name={step.icon} className="h-12 w-12" /> : i + 1}
                </span>
                <h3 className={`mt-7 ${LABEL} ${tone ?? (on ? "text-primary" : "text-text")}`}>
                  {renderMarkdown(step.title)}
                </h3>
                {step.text && (
                  <p className={`mt-3 ${CAPTION} text-balance text-text`}>
                    {renderMarkdown(step.text)}
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

// ─── layers: a stack, each layer resting on the one below ───────────────────

function Layers({ block }: { block: Of<"layers"> }) {
  return (
    <div className="flex w-full flex-col gap-5">
      {block.layers.map((layer, i) => {
        // The highlighted layer keeps the white card and takes the teal edge and number.
        const on = block.highlight === i;
        return (
          <div
            key={i}
            className={`flex items-center gap-10 border-4 bg-white px-10 py-7 ${CARD} ${on ? "border-primary" : "border-border"}`}
          >
            {block.ordered && (
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-brand-sm font-heading text-3xl font-bold text-white ${
                  on ? "bg-primary" : "bg-text"
                }`}
              >
                {i + 1}
              </span>
            )}
            <h3 className={`w-[24rem] shrink-0 ${LABEL} ${on ? "text-primary" : "text-text"}`}>
              {renderMarkdown(layer.title)}
            </h3>
            {layer.text && (
              <p className={`flex-1 ${CAPTION} text-text`}>{renderMarkdown(layer.text)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── timeline: dated stages on one axis ─────────────────────────────────────

function Dot({ on, future }: { on: boolean; future: boolean }) {
  return (
    <span
      className={`relative rounded-brand-sm ${
        on
          ? "h-12 w-12 bg-primary ring-8 ring-primary/15"
          : future
            ? "h-9 w-9 border-4 bg-background"
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
      className={`col-start-1 pr-8 font-sans ${CAPTION} font-semibold text-text-muted ${className}`}
      style={{ gridRow: row }}
    >
      {text}
    </span>
  );
}

function Timeline({ block }: { block: Of<"timeline"> }) {
  const n = block.events.length;
  const now = block.now ?? n - 1;
  const tone = (i: number) => (block.highlight === i ? "text-primary" : "text-text");
  if (n >= 6) return <Staggered block={block} now={now} tone={tone} />;
  const labels = givenLabels(block.labels);
  return (
    <div className="w-full">
      {/* One row per part (date, dot, title, text) shared by every stage, so titles and texts
          start level even where a title wraps. Row labels, when given, take a first column. */}
      {/* The space after "auto" is load-bearing: without it the value is invalid CSS, the grid
          falls back to implicit columns and the axis, dots and labels come apart. */}
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `${labels ? "auto " : ""}repeat(${n}, minmax(0, 1fr))`,
        }}
      >
        <RowLabel text={labels?.when} row={1} />
        <RowLabel text={labels?.title} row={3} className="mt-7" />
        <RowLabel text={labels?.text} row={4} className="mt-3" />
        {block.events.map((e, i) => (
          <div key={i} className="relative row-span-4 row-start-1 grid grid-rows-subgrid px-4">
            <span className={`font-heading text-3xl font-bold ${tone(i)}`}>{e.when}</span>
            <div className="relative flex h-12 items-center">
              {i < n - 1 && (
                <div
                  className="absolute top-1/2 right-[-2rem] left-6 -translate-y-1/2"
                  style={{ borderTop: `4px ${i >= now ? "dashed" : "solid"} ${GREY}` }}
                />
              )}
              <Dot on={block.highlight === i} future={i > now} />
            </div>
            <h3 className={`mt-6 ${LABEL} ${tone(i)}`}>{renderMarkdown(e.title)}</h3>
            <p className={`mt-3 ${CAPTION} text-text`}>{e.text && renderMarkdown(e.text)}</p>
          </div>
        ))}
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
  return (
    <div
      className="grid w-full grid-rows-[auto_auto_auto_1.5rem_3.5rem_1.5rem_auto_auto_auto]"
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
          style={{ left: edge, right: edge, background: GREY }}
        />
      </div>
      {block.events.map((e, i) => {
        const above = i % 2 === 0;
        const line = 2 * i + 3 + shift;
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
              <h3 className={`mt-2 ${LABEL} ${tone(i)}`}>{renderMarkdown(e.title)}</h3>
              {e.text && (
                <p className={`mt-2 ${CAPTION} text-balance text-text`}>{renderMarkdown(e.text)}</p>
              )}
              {/* Above, a stage without text runs its leader up through the text row. */}
              {above && (
                <span className="flex pt-3" style={{ gridRow: e.text ? "4" : "3 / 5" }} aria-hidden>
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
          </div>
        );
      })}
    </div>
  );
}

// ─── transform: what the before list becomes ────────────────────────────────

// The two sides are separate lists, not rows: their items rarely pair one to one, and aligned
// rows would claim that each old task turned into the new one beside it.
function Transform({ block }: { block: Of<"transform"> }) {
  return (
    <div className="grid w-full grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.15fr)] grid-rows-[auto_1fr] gap-x-12 gap-y-5 pt-4">
      <span className="font-heading text-3xl font-bold text-text-muted">{block.before.label}</span>
      <span />
      <span className="font-heading text-3xl font-bold text-primary">{block.after.label}</span>
      <ul className={`flex flex-col gap-4 border-4 border-dashed border-border px-9 py-7 ${CARD}`}>
        {block.before.items.map((item, i) => (
          <li key={i} className={`${CAPTION} text-text-muted`}>
            {renderMarkdown(item)}
          </li>
        ))}
      </ul>
      <ArrowRight
        className="h-16 w-16 self-center"
        style={{ color: GREY }}
        strokeWidth={3}
        aria-hidden
      />
      <ul className="flex flex-col gap-3">
        {block.after.items.map((item, i) => (
          <li
            key={i}
            className={`border-y-2 border-r-2 border-l-[6px] border-y-border border-r-border border-l-primary bg-white px-6 py-3.5 ${CAPTION} font-semibold text-text`}
          >
            {renderMarkdown(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── bars: categories against one value, labelled at the bar ────────────────

function Bars({ block }: { block: Of<"bars"> }) {
  const anyHighlight = block.bars.some((b) => b.highlight);
  const bars =
    block.order === "given" ? block.bars : [...block.bars].sort((a, b) => b.value - a.value);
  const max = block.max ?? (Math.max(...bars.map((b) => b.value), 0) || 1);
  const tall = bars.length <= 3;
  return (
    <div className="w-full">
      <div className={`flex flex-col ${tall ? "gap-12" : "gap-7"}`}>
        {bars.map((bar, i) => (
          <div key={i}>
            <span className={`${LABEL} ${bar.highlight ? "text-primary" : "text-text"}`}>
              {renderMarkdown(bar.label)}
            </span>
            {/* A track shows the scale's full length when the block names one; the value stands
                in its own column right of the track, level with its bar. The column and its gap
                take 16rem, which a callout on the same slide leaves free (ContentSlide). */}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_14rem] items-center gap-8">
              <div
                className={`relative ${tall ? "h-20" : "h-14"} ${block.max != null ? "border-r-4 border-text/25 bg-text/[0.1]" : ""} rounded-r-sm`}
              >
                <div
                  className="h-full rounded-r-sm"
                  style={{
                    width: `${Math.max((bar.value / max) * 100, 0.5)}%`,
                    // Grey is context for a highlighted bar; with none highlighted every bar is data.
                    background: bar.highlight || !anyHighlight ? "var(--color-primary)" : CONTEXT,
                  }}
                />
              </div>
              <span
                className={`font-heading text-5xl font-bold whitespace-nowrap ${bar.highlight ? "text-primary" : "text-text"}`}
              >
                {bar.display ?? bar.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Source text={block.source} />
    </div>
  );
}

// ─── numbers: one to three figures, each with what it counts ────────────────

// A leading hyphen in a figure is a minus: set the typographic one, which sits on the digits' axis.
const minus = (v: string) => v.replace(/^-(?=\d)/, "−");

// A figure's leading words ("about $2M") are set small, so only the figure itself carries weight.
function Figure({ value }: { value: string }) {
  const m = /^([a-z][a-z\s]*?)\s+(.*)$/.exec(value);
  if (!m) return <>{minus(value)}</>;
  return (
    <>
      <span className="mr-[0.2em] text-[0.55em]">{m[1]}</span>
      {minus(m[2])}
    </>
  );
}

function Numbers({ block }: { block: Of<"numbers"> }) {
  const n = block.items.length;
  if (n === 1) {
    const item = block.items[0];
    return (
      <div className="w-full">
        <div className="flex items-center gap-16">
          <span
            className={`font-heading text-[13rem] leading-none font-bold tracking-tight text-primary`}
          >
            <Figure value={item.value} />
          </span>
          <span className="max-w-[38rem] text-5xl leading-tight font-semibold text-balance text-text">
            {renderMarkdown(item.label)}
          </span>
        </div>
        <Source text={block.source} />
      </div>
    );
  }
  // One size for every figure, set by the longest, so the row shares a baseline and none wraps:
  // a column is about 1650/n px wide at 1920, a mono digit 0.6em, a rem 21.333px.
  const longest = Math.max(
    ...block.items.map((i) => i.value.replace(/^[a-z][a-z\s]*\s/, "").length),
  );
  const size = Math.min(n === 2 ? 9 : 7, (1650 / n - 60) / (longest * 0.6) / 21.333);
  return (
    <div className="w-full">
      <div
        className="grid w-full gap-14"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {block.items.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span
              className={`font-heading leading-none font-bold tracking-tight whitespace-nowrap text-primary`}
              style={{ fontSize: `${size}rem` }}
            >
              <Figure value={item.value} />
            </span>
            <span className="mt-6 border-t-4 border-border pt-6 text-3xl leading-snug text-text">
              {renderMarkdown(item.label)}
            </span>
          </div>
        ))}
      </div>
      <Source text={block.source} />
    </div>
  );
}

// ─── annotated: a screenshot with its lines that matter marked ──────────────

function Annotated({ block }: { block: Of<"annotated"> }) {
  const [w, h] = block.size;
  const top = block.crop?.top ?? 0;
  // A right crop drops an editor's minimap and scrollbar: the image is set wider than the frame.
  const right = block.crop?.right ?? 1;
  const span = (block.crop?.bottom ?? 1) - top;
  // A note's y is a fraction of the whole image; inside the crop it is a fraction of the window.
  const at = (y: number) => `${((y - top) / span) * 100}%`;
  return (
    <div className="flex w-full items-center gap-12">
      {/* The numbers stand in a gutter left of the frame, level with their bands, off the code. */}
      <div className="relative flex shrink-0 pl-16">
        {/* The frame takes the crop's shape at the largest size that fits 60rem by 38rem. */}
        <div
          className={`relative shrink-0 overflow-hidden border-4 border-text bg-text ${CARD}`}
          style={{
            width: `${Math.min(58, (38 * w * right) / (h * span))}rem`,
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
              className="absolute inset-x-0 -translate-y-1/2 border-y-[3px] border-primary bg-primary/25"
              style={{ top: at(n.y), height: `${((n.h ?? 0.03) / span) * 100}%` }}
            />
          ))}
        </div>
        {block.notes.map((n, i) => (
          <span
            key={i}
            className="absolute left-0 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-brand-sm bg-primary font-heading text-xl font-bold text-white"
            style={{ top: at(n.y) }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <ol className="flex flex-1 flex-col gap-9">
        {block.notes.map((n, i) => (
          <li key={i} className="flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-brand-sm bg-primary font-heading text-2xl font-bold text-white">
              {i + 1}
            </span>
            <p className="pt-1 text-3xl leading-snug text-text [&_strong]:block [&_strong]:text-[2.25rem]">
              {renderMarkdown(n.text)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── annotated code: code as text, its lines that matter marked ─────────────

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
  const tokens = highlightLines(lines.map((l) => l.slice(indent)).join("\n"), block.language);
  return (
    <div className="flex w-full items-center gap-12">
      <pre
        className={`min-w-0 flex-[1.4] overflow-hidden border-4 border-text bg-code-bg py-6 ${CARD}`}
      >
        <code className="block font-code text-[1.6875rem] leading-snug">
          {lines.map((line, i) => {
            const n = marked.get(i + 1);
            return (
              <div
                key={i}
                className={`flex items-start gap-4 pr-6 pl-4 ${n ? "border-l-[6px] border-primary bg-primary/25" : "border-l-[6px] border-transparent"}`}
              >
                {marked.size > 0 && (
                  <span className="flex w-10 shrink-0 justify-center pt-1">
                    {n && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-brand-sm bg-primary font-heading text-lg font-bold text-white">
                        {n}
                      </span>
                    )}
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
      </pre>
      {block.notes.length > 0 && (
        <ol className="flex flex-1 flex-col gap-9">
          {block.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-brand-sm bg-primary font-heading text-2xl font-bold text-white">
                {i + 1}
              </span>
              <p className="pt-1 text-3xl leading-snug text-text [&_strong]:block [&_strong]:text-[2.25rem]">
                {renderMarkdown(n.text)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── cards: parallel points, each under an icon or a number ─────────────────

function Cards({ block }: { block: Of<"cards"> }) {
  const cols = block.items.length === 4 ? 2 : Math.min(block.items.length, 3);
  return (
    <div
      className="grid w-full gap-6"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {block.items.map((item, i) => (
        <div
          key={i}
          className={`flex flex-col gap-5 border border-border bg-white px-9 py-8 ${CARD}`}
        >
          {block.numbered ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-brand-sm bg-primary font-heading text-3xl font-bold text-white">
              {i + 1}
            </span>
          ) : item.icon ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-brand-sm bg-primary/7 text-primary">
              <Icon name={item.icon} className="h-9 w-9" />
            </span>
          ) : (
            <span className="h-1.5 w-16 bg-primary" aria-hidden />
          )}
          {item.title && <h3 className={`${LABEL} text-text`}>{renderMarkdown(item.title)}</h3>}
          <p className={`${CAPTION} text-text [&_strong]:text-text`}>{renderMarkdown(item.text)}</p>
        </div>
      ))}
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
