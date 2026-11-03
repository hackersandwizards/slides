"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import type {
  ComparisonGuidanceSlide,
  ComparisonPositionsSlide,
  ComparisonSide,
  ComparisonSidesSlide,
  ComparisonSlide as ComparisonSlideType,
} from "../../types/slide";
import { usePrintMode } from "../../lib/print-context";
import { useSlideKeyboard } from "../../lib/use-slide-keyboard";
import { useCarousel } from "../../lib/use-carousel";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import XCircle from "lucide-react/icons/circle-x";
import CheckCircle from "lucide-react/icons/circle-check-big";
import {
  arrivedBackwards as readArrivedBackwards,
  directionKey,
  personAccent,
  writeStored,
} from "../../lib/slide-utils";
import { SlideTitle, SlideCard, DisplayHeading } from "./primitives";
import { renderMarkdown } from "../../lib/markdown";

/** A list item behind its mark: plus or minus in the tone of its side, or without a `mark` the
 *  square list marker every other list uses. */
function MarkedItem({
  mark,
  tone = "",
  children,
}: {
  mark?: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-baseline gap-3 text-xl text-text">
      {mark ? (
        <span className={`w-5 shrink-0 text-center text-2xl leading-none font-bold ${tone}`}>
          {mark}
        </span>
      ) : (
        <span className="hw-marker" />
      )}
      <span>{children}</span>
    </li>
  );
}

interface Props {
  slide: ComparisonSlideType;
}

/** A side's highlight under its heading, on every two-sided variant; `muted` for a side that is
 *  not the point. A step over the label size: at text-sm it read about 12 px in a 1000 px stream
 *  (blind check 03.11., every reviewer). */
function Highlight({ text, muted = false }: { text?: string; muted?: boolean }) {
  if (!text) return null;
  return (
    <p
      className="hw-label mb-4 [--hw-label-size:var(--text-base)]"
      data-tone={muted ? "muted" : undefined}
    >
      {text}
    </p>
  );
}

/** The sources under a comparison, on every variant. */
function Footnotes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;
  return (
    <div className="mt-6 max-w-4xl">
      {notes.map((note, i) => (
        <p key={i} className="text-sm text-text-subtle">
          {note}
        </p>
      ))}
    </div>
  );
}

function VsVariant({ slide }: { slide: ComparisonSidesSlide }) {
  const printMode = usePrintMode();
  // With `revealPunchline`, step 2 keeps the right side lit and adds the punchline.
  const lastStep = slide.punchline && slide.revealPunchline ? 2 : 1;
  const [activeIndex, setActiveIndex] = useState(printMode ? -1 : 0);
  // A backward arrival opens at the last step, after hydration so the server markup still matches.
  const [arrivedBackwards] = useState(() => !printMode && readArrivedBackwards());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount reveal, as in useProgressiveReveal
    if (arrivedBackwards) setActiveIndex(lastStep);
    // Consumed, as useProgressiveReveal does, so a reload opens at step 0.
    writeStored("session", directionKey(), null);
  }, [arrivedBackwards, lastStep]);
  const punchlineVisible = printMode || !slide.revealPunchline || activeIndex === 2;

  useSlideKeyboard({
    onRight: () => {
      if (activeIndex < lastStep) {
        setActiveIndex(activeIndex + 1);
        return true;
      }
      return false;
    },
    onLeft: () => {
      if (activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
        return true;
      }
      return false;
    },
    enabled: !printMode,
    pending: activeIndex < lastStep,
    undoable: activeIndex > 0,
  });

  const sides = [slide.left, slide.right];

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-8">
        {sides.map((side, i) => {
          const isActive = Math.min(activeIndex, 1) === i || printMode;
          const pros = side.items.filter((item) => !item.startsWith("-"));
          const cons = side.items.filter((item) => item.startsWith("-"));

          return (
            <BlurFade key={i} delay={0.2 + i * 0.1} duration={0.6}>
              <SlideCard
                tone={isActive ? "primary" : "neutral"}
                className="h-full transition-all duration-300 card-pad-8"
              >
                <h2 className="mb-6 font-heading text-2xl font-bold text-text">{side.label}</h2>

                <Highlight text={side.highlight} muted={!isActive} />

                {pros.length > 0 && (
                  <div className="mb-4">
                    <ul className="space-y-2.5">
                      {pros.map((pro, j) => (
                        <MarkedItem key={j} mark="+" tone="text-green-dark">
                          {pro.startsWith("+") ? pro.slice(1).trim() : pro}
                        </MarkedItem>
                      ))}
                    </ul>
                  </div>
                )}

                {cons.length > 0 && (
                  // The rule separates the minus items from the plus items above them, so a side
                  // of minus items alone carries none.
                  <div className={pros.length > 0 ? "mt-4 border-t border-border pt-4" : ""}>
                    <ul className="space-y-2.5">
                      {cons.map((con, j) => (
                        <MarkedItem key={j} mark={"\u2212"} tone="text-red">
                          {con.slice(1).trim()}
                        </MarkedItem>
                      ))}
                    </ul>
                  </div>
                )}
              </SlideCard>
            </BlurFade>
          );
        })}
      </div>

      {slide.punchline && (
        <BlurFade delay={0.5} duration={0.6}>
          <p
            inert={!punchlineVisible}
            className={`text-gradient-brand mt-10 max-w-3xl text-center font-heading text-2xl font-bold transition-opacity duration-500 ${punchlineVisible ? "opacity-100" : "opacity-0"}`}
          >
            {slide.punchline}
          </p>
        </BlurFade>
      )}

      <Footnotes notes={slide.footnotes} />
    </>
  );
}

/** The before and the after side by side, the after shown once `after` is set. With `strike`
 *  (the default) the before side is struck through and crossed out; without it, it stays as
 *  plain text, for a before that stays. The transform block draws with it too. */
export function BeforeAfterSides({
  left,
  right,
  after,
  strike = true,
}: {
  left: Pick<ComparisonSide, "label" | "items" | "highlight">;
  right: Pick<ComparisonSide, "label" | "items" | "highlight">;
  after: boolean;
  strike?: boolean;
}) {
  return (
    <div className="grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-stretch gap-6">
      <div
        className={`rounded-brand border p-8 transition-all duration-500 ${
          after ? "border-border bg-text-subtle/7" : "border-border bg-white"
        }`}
      >
        <div className="mb-6 flex items-center gap-3">
          {strike && <XCircle className="h-6 w-6 text-text-subtle" />}
          <h2 className="font-heading text-2xl font-bold text-text-muted">{left.label}</h2>
        </div>
        <Highlight text={left.highlight} muted />
        <ul className="space-y-3">
          {left.items.map((item, i) => (
            <li
              key={i}
              className={`text-xl transition-all duration-300 ${
                after && strike
                  ? "text-text-muted line-through decoration-text-subtle/70 decoration-2"
                  : "text-text"
              }`}
            >
              {renderMarkdown(item)}
            </li>
          ))}
        </ul>
      </div>

      <div
        inert={!after}
        className={`flex items-center transition-all duration-500 ${after ? "opacity-100" : "opacity-0"}`}
      >
        <span className="rotate-90 text-3xl font-bold text-primary md:rotate-0">&rarr;</span>
      </div>

      <SlideCard
        inert={!after}
        tone="primary"
        look="soft"
        className={`transition-all duration-500 card-pad-8 ${
          after ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="mb-6 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold text-primary">{right.label}</h2>
        </div>
        <Highlight text={right.highlight} />
        <ul className="space-y-3">
          {right.items.map((item, i) => (
            <li key={i} className="text-xl text-text">
              {renderMarkdown(item)}
            </li>
          ))}
        </ul>
      </SlideCard>
    </div>
  );
}

function BeforeAfterVariant({ slide }: { slide: ComparisonSidesSlide }) {
  const printMode = usePrintMode();
  // Phase 1 shows the before, phase 2 adds the after.
  const [phase] = useCarousel({
    count: 3,
    min: 1,
    initial: printMode ? 2 : 1,
    enabled: !printMode,
  });

  return (
    <>
      <BeforeAfterSides
        left={slide.left}
        right={slide.right}
        after={phase >= 2}
        strike={slide.strike}
      />

      {slide.punchline && (
        <div
          inert={phase < 2}
          className={`mt-10 text-center transition-all duration-500 ${
            phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="text-gradient-brand font-heading text-2xl font-bold">{slide.punchline}</p>
        </div>
      )}

      <Footnotes notes={slide.footnotes} />
    </>
  );
}

function SplitVariant({ slide }: { slide: ComparisonSidesSlide }) {
  return (
    <>
      <div className="grid w-full grid-cols-2 gap-8">
        <BlurFade delay={0.2} duration={0.6}>
          <SlideCard className="h-full card-pad-8">
            <h2 className="mb-6 font-heading text-2xl font-bold text-text">{slide.left.label}</h2>
            <Highlight text={slide.left.highlight} />
            <ul className="space-y-3">
              {slide.left.items.map((item, i) => (
                <MarkedItem key={i}>{item}</MarkedItem>
              ))}
            </ul>
          </SlideCard>
        </BlurFade>

        <BlurFade delay={0.3} duration={0.6}>
          <SlideCard className="h-full card-pad-8">
            <h2 className="mb-6 font-heading text-2xl font-bold text-text">{slide.right.label}</h2>
            <Highlight text={slide.right.highlight} />
            <ul className="space-y-3">
              {slide.right.items.map((item, i) => (
                <MarkedItem key={i}>{item}</MarkedItem>
              ))}
            </ul>
          </SlideCard>
        </BlurFade>
      </div>

      {slide.punchline && (
        <BlurFade delay={0.5} duration={0.6}>
          <p className="text-gradient-brand mt-10 max-w-3xl text-center font-heading text-2xl font-bold">
            {slide.punchline}
          </p>
        </BlurFade>
      )}

      <Footnotes notes={slide.footnotes} />
    </>
  );
}

/** Two named stances with a quote each, an ampersand between them, and the verdict under them:
 *  the comparison's `positions` variant, and the deprecated positions block. */
export function Positions({
  block,
}: {
  block: Pick<ComparisonPositionsSlide, "left" | "right" | "middle" | "resolution">;
}) {
  // The two sides are people or their stances: coloured by position, teal first, purple
  // second, like every person on a slide (`personAccent`).
  const POSITION_ACCENT = {
    primary: { text: "text-primary", rule: "bg-primary/40", border: "border-primary/40" },
    secondary: {
      text: "text-secondary",
      rule: "bg-secondary/40",
      border: "border-secondary/40",
    },
  };

  const renderSide = (side: typeof block.left, index: number, alignRight = false) => {
    const a = POSITION_ACCENT[personAccent(index)];
    const numeral = String(index + 1).padStart(2, "0");
    return (
      <div
        className={`relative flex flex-col gap-8 ${alignRight ? "items-end text-right" : "items-start text-left"}`}
      >
        <div className="flex items-baseline gap-3">
          {!alignRight && (
            <span
              className={`text-xs font-bold tracking-(--slide-index-tracking) tabular-nums ${a.text} opacity-70`}
            >
              {numeral}
            </span>
          )}
          {!alignRight && <span className={`h-px w-10 self-center ${a.rule}`} />}
          <span
            className={`hw-label [--hw-label-size:var(--text-sm)] ${a.text}`}
            data-hw-exception="label-hue"
          >
            {side.name}
          </span>
          {alignRight && <span className={`h-px w-10 self-center ${a.rule}`} />}
          {alignRight && (
            <span
              className={`text-xs font-bold tracking-(--slide-index-tracking) tabular-nums ${a.text} opacity-70`}
            >
              {numeral}
            </span>
          )}
        </div>

        <h2
          className={`font-heading text-8xl leading-(--slide-figure-leading) font-bold tracking-(--slide-figure-tracking) lg:text-(length:--slide-figure-size) ${a.text}`}
        >
          {/* A line breaks only between words: "All-in" never splits at its hyphen. */}
          {side.stance.split(" ").map((word, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className="whitespace-nowrap">{word}</span>
            </Fragment>
          ))}
        </h2>

        <p
          className={`mt-2 font-heading text-2xl leading-snug font-medium text-text-muted italic md:text-3xl ${alignRight ? "border-r-2 pr-5" : "border-l-2 pl-5"} ${a.border}`}
        >
          {`“${side.quote}”`}
        </p>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-stretch gap-20">
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-14 pt-4">
        {renderSide(block.left, 0, true)}

        <div aria-hidden="true" className="relative flex flex-col items-center self-stretch px-2">
          <div className="w-px flex-1 bg-text-subtle/25" />
          <span className="my-4 text-6xl leading-none text-text-subtle/40 md:text-7xl">&amp;</span>
          <div className="w-px flex-1 bg-text-subtle/25" />
        </div>

        {renderSide(block.right, 1, false)}
      </div>

      {block.middle && (
        <p className="text-center text-lg text-text-subtle italic">{block.middle}</p>
      )}

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-px w-16 bg-text-subtle/25" />
          <span className="hw-label" data-tone="muted">
            The verdict
          </span>
          <div className="h-px w-16 bg-text-subtle/25" />
        </div>
        <DisplayHeading as="h2" size="sm" className="max-w-4xl text-center">
          {renderMarkdown(block.resolution)}
        </DisplayHeading>
      </div>
    </div>
  );
}

/** Examples, each a bad and a good version, one at a time live and all on a page, with an
 *  intro and points above them. */
function GuidanceVariant({ slide }: { slide: ComparisonGuidanceSlide }) {
  const { intro, points, examples } = slide;
  const printMode = usePrintMode();
  const [activeExample] = useCarousel({ count: examples.length, enabled: !printMode });

  const renderExamples = printMode ? examples : [examples[activeExample]];

  return (
    // Left-aligned, as the guidance slide drew it before it became a variant.
    <div className="w-full max-w-6xl self-start">
      {intro && (
        <BlurFade delay={0.15} duration={0.6}>
          <p className="mb-6 text-xl text-text-muted">{intro}</p>
        </BlurFade>
      )}

      {points && points.length > 0 && (
        <BlurFade delay={0.2} duration={0.6}>
          <ul className="mb-8 space-y-2">
            {points.map((point, i) => (
              <li key={i} className="flex items-baseline gap-3 text-lg text-text-muted">
                <span className="hw-marker" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </BlurFade>
      )}

      {renderExamples.map((example, i) => (
        <BlurFade key={printMode ? i : activeExample} delay={0.25} duration={0.5}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-text">{example.title}</h2>
              {!printMode && examples.length > 1 && (
                <span className="text-base font-medium text-text-subtle">
                  {activeExample + 1} / {examples.length}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <SlideCard tone="error" look="soft" className="card-pad-6">
                <p
                  className="hw-label mb-3 text-red [--hw-label-size:var(--text-sm)]"
                  data-hw-exception="label-hue"
                >
                  Bad
                </p>
                <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                  {example.bad}
                </pre>
              </SlideCard>

              <SlideCard tone="success" look="soft" className="card-pad-6">
                <p
                  className="hw-label mb-3 text-(--slide-success-ink) [--hw-label-size:var(--text-sm)]"
                  data-hw-exception="label-hue"
                >
                  Good
                </p>
                <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                  {example.good}
                </pre>
              </SlideCard>
            </div>
          </div>
        </BlurFade>
      ))}

      {!printMode && examples.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {examples.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 transition-colors ${
                i === activeExample ? "bg-primary" : "bg-primary-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparisonSlide({ slide }: Props) {
  const variant = slide.variant ?? "vs";

  return (
    <SlideShell>
      <div
        className={`slide-content relative z-10 flex flex-col items-center justify-center px-16 ${slide.headline ? "slide-titled" : ""}`}
      >
        {slide.headline && (
          <SlideTitle as="h2" duration={0.6}>
            {slide.headline}
          </SlideTitle>
        )}

        <div className="slide-body items-center">
          {slide.variant === "guidance" ? (
            <GuidanceVariant slide={slide} />
          ) : slide.variant === "positions" ? (
            <Positions block={slide} />
          ) : (
            <>
              {variant === "vs" && <VsVariant slide={slide} />}
              {variant === "before-after" && <BeforeAfterVariant slide={slide} />}
              {variant === "split" && <SplitVariant slide={slide} />}
            </>
          )}
        </div>
      </div>
    </SlideShell>
  );
}
