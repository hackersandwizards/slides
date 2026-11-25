import Image from "../ui/image";
import type { ReactNode } from "react";
import type { FlowFrame, VisualBlock } from "../../types/slide";
import { iconMap } from "../../lib/icons";
import { renderMarkdown } from "../../lib/markdown";
import { LONG_FLOW } from "../../lib/slide-utils";
import { DashedFrame, NumberTile } from "./primitives";
import { Annotated, AnnotatedCode } from "./AnnotatedVisual";
import { Bars } from "./BarsVisual";
import { Cards } from "./CardsVisual";
import { Layers } from "./LayersVisual";
import { Numbers } from "./NumbersVisual";
import { VISUAL_CAPTION, VisualIcon } from "./DiagramVocabulary";
import { FlowLinks, FlowLoop } from "./FlowArrows";
import {
  type FlowRowLook,
  flowRowLook,
  revealVisibility,
  stepInk,
  stepNumbers,
} from "./FlowRowLook";
import { Timeline } from "./TimelineVisual";
import { Transform } from "./TransformVisual";

type Of<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

const STEP_PALETTE = {
  dim: { accent: "text-text-muted", body: "text-text-muted", labelTone: "muted" as const },
  normal: { accent: "text-primary", body: "text-text", labelTone: undefined },
} as const;

/** A flow step as the process slide passes it: the block's step plus a `label` (a
 *  multiplier or stage name: in the tile while every label fits it, else above the title), a
 *  teal `subtitle`, a closing `badge`, `dim` for a stage outside the story and `numbered: false`
 *  for a tile left out of the count. */
export type FlowStep = Of<"flow">["steps"][number] & {
  label?: string;
  subtitle?: string;
  badge?: string;
  dim?: boolean;
  numbered?: false;
};

// On a phone a row of steps holds a title's longest word only where it fits a column: a mono
// glyph is 0.6em of the title's `--type-body-size` (1rem there, Visuals.css), the narrowest phone,
// 320 px, leaves the row 17.5rem inside `--slide-phone-padding` and a frame's padding 14rem, and a
// column pads 0.5rem (`--spacing` each side). A word wider than its column, which the hyphenator
// cannot always split ("Autocomplete"), stands the steps one under another instead, as five and
// more do (Visuals.css). In a frame at 17.5rem a badge broke one word a line.
function fitsPhoneRow(steps: FlowStep[], framed: boolean) {
  const word = Math.max(
    ...steps.flatMap((step) =>
      step.title
        .replace(/[*_`]/g, "")
        .split(/\s+/)
        .map((w) => w.length),
    ),
  );
  return steps.length * (word * 0.6 + 0.5) <= (framed ? 14 : 17.5);
}

function FlowStepTile({
  step,
  look,
  number,
  active,
}: {
  step: FlowStep;
  look: FlowRowLook;
  number?: number;
  active: boolean;
}) {
  const hasIcon = step.icon && Object.hasOwn(iconMap, step.icon);
  const content = hasIcon ? (
    <VisualIcon name={step.icon} className={look.icon} />
  ) : step.label && look.inTile ? (
    step.label
  ) : (
    number
  );
  return (
    <NumberTile
      size={look.size}
      tone={active ? "solid" : "none"}
      className={
        active
          ? "relative"
          : `relative border-4 border-text-muted bg-(--slide-ground) ${stepInk(step)}`
      }
    >
      {content}
    </NumberTile>
  );
}

function FlowStepColumn({
  step,
  look,
  number,
  active,
  visible,
}: {
  step: FlowStep;
  look: FlowRowLook;
  number?: number;
  active: boolean;
  visible: boolean;
}) {
  const palette = STEP_PALETTE[step.dim ? "dim" : "normal"];
  const ink = stepInk(step);
  const aboveLabel = look.inTile ? undefined : step.label;
  return (
    <div
      inert={!visible}
      className={`slide-flow-step flex flex-col items-center ${look.padding} text-center ${revealVisibility(visible)}`}
    >
      <FlowStepTile step={step} look={look} number={number} active={active} />
      {aboveLabel && (
        <span
          className="hw-label mt-5 -mb-4 text-balance [--hw-label-size:var(--text-xl)]"
          data-tone={palette.labelTone}
        >
          {aboveLabel}
        </span>
      )}
      <h2 className={`${look.heading} ${active ? "text-primary" : ink}`}>
        {renderMarkdown(step.title)}
      </h2>
      {step.subtitle && (
        <p className={`mt-2 text-xl font-semibold text-balance ${palette.accent}`}>
          {renderMarkdown(step.subtitle)}
        </p>
      )}
      {step.text && (
        // Pretty, as every slide paragraph (slides.css), not balanced: in a narrow column
        // balance broke a hyphenated word and left "Multi-" alone on its line.
        <p className={`mt-3 ${VISUAL_CAPTION} ${palette.body}`}>{renderMarkdown(step.text)}</p>
      )}
      {step.badge && (
        <p className={`mt-3 text-xl font-semibold ${palette.accent}`}>
          {renderMarkdown(step.badge)}
        </p>
      )}
    </div>
  );
}

interface FlowStepsProps {
  steps: FlowStep[];
  highlight?: number;
  loop?: string;
  revealed?: number;
  dense?: boolean;
  framed?: boolean;
}

/** Steps on one line with a tile each, as the flow block draws them; the process
 *  slides draw theirs with it too. `loop` draws the arrow from the last step back to the first,
 *  labelled when non-empty. `revealed` shows the first n steps, the line to each and the loop
 *  once all show. `dense` draws the small tiles and titles of the pipeline it replaces. `framed`: the
 *  steps stand in a frame, whose padding narrows a phone's row. */
export function FlowSteps({
  steps,
  highlight,
  loop,
  revealed = steps.length,
  dense = false,
  framed = false,
}: FlowStepsProps) {
  const n = steps.length;
  const look = flowRowLook(steps, dense);
  const numbers = stepNumbers(steps);
  return (
    <div
      className={`slide-flow relative w-full ${n >= LONG_FLOW || !fitsPhoneRow(steps, framed) ? "slide-flow-long" : ""}`}
    >
      {loop !== undefined && (
        <FlowLoop label={loop} firstTitle={steps[0]?.title} count={n} visible={revealed >= n} />
      )}
      <div className="relative">
        <FlowLinks count={n} revealed={revealed} mid={look.linkMid} />
        <div
          className="slide-flow-steps relative grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {steps.map((step, i) => (
            <FlowStepColumn
              key={i}
              step={step}
              look={look}
              number={numbers[i]}
              active={highlight === i}
              visible={i < revealed}
            />
          ))}
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
      framed={!!block.frame}
    />
  );
  return block.frame ? <Framed frame={block.frame}>{steps}</Framed> : steps;
}

function FrameHeader({ label, logos }: { label?: string; logos?: FlowFrame["logos"] }) {
  if (!label && !logos?.length) return null;
  return (
    <div className="hw-label mb-4 flex items-baseline gap-2 [--hw-label-size:var(--text-sm)]">
      {label && (
        <>
          <div className="hw-marker bg-primary" />
          <span>{label}</span>
        </>
      )}
      {logos?.map((logo, i) => (
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
  );
}

function FrameNotes({ notes }: { notes: string[] }) {
  return (
    <>
      <div className="slide-framed-rule h-16 w-px bg-primary/25" />
      <ul className="slide-framed-notes space-y-1.5">
        {notes.map((note, i) => (
          <li key={i} className="flex items-baseline gap-2 text-base text-text-muted">
            <span className="hw-marker slide-marker-nested bg-primary" />
            <span>{renderMarkdown(note)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The teal dashed frame round a group of steps: its label with logos above, its notes beside
 *  the steps, its footer under a rule. A flow's `frame` and the pipeline's container draw it. */
export function Framed({ frame, children }: { frame: FlowFrame; children: ReactNode }) {
  // Logos draw in the label's row with or without a label; notes without one draw nothing.
  const notes = frame.notes?.length ? frame.notes : undefined;
  return (
    <DashedFrame tone="primary" active={!!frame.label} className="w-full p-6">
      <FrameHeader label={frame.label} logos={frame.logos} />
      {/* On a phone the notes go under the steps, which take the frame's whole width (Visuals.css). */}
      <div className={`flex flex-wrap items-center justify-center ${notes ? "gap-6" : "gap-4"}`}>
        <div className="slide-framed-steps min-w-0 flex-1">{children}</div>
        {notes && <FrameNotes notes={notes} />}
      </div>
      {frame.footer && (
        <p className="mt-4 border-t border-primary/25 pt-3 text-base text-text-muted">
          {renderMarkdown(frame.footer)}
        </p>
      )}
    </DashedFrame>
  );
}

const VISUAL_BLOCKS: {
  [K in VisualBlock["type"]]: (props: { block: Of<K> }) => ReactNode;
} = {
  flow: Flow,
  layers: Layers,
  timeline: Timeline,
  transform: Transform,
  bars: Bars,
  numbers: Numbers,
  annotated: Annotated,
  "annotated-code": AnnotatedCode,
  cards: Cards,
};

/** One content block of the diagram vocabulary. */
export function Visual({ block }: { block: VisualBlock }) {
  if (typeof block.type !== "string" || !Object.hasOwn(VISUAL_BLOCKS, block.type)) return;
  const Component = VISUAL_BLOCKS[block.type] as (props: { block: VisualBlock }) => ReactNode;
  return <Component block={block} />;
}
