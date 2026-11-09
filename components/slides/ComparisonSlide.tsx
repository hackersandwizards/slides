"use client";

import type { ReactNode } from "react";
import type {
  ComparisonGuidanceSlide,
  ComparisonPositionsSlide,
  ComparisonSidesSlide,
  ComparisonSlide as ComparisonSlideType,
} from "../../types/slide";
import { usePrintMode } from "../../lib/print-context";
import { useCarousel } from "../../lib/use-carousel";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { keepHyphenatedWords } from "../../lib/slide-utils";
import {
  BeforeAfterSides,
  DisplayHeading,
  SideHighlight,
  SlideCard,
  SlideSubtitle,
  SlideTitle,
} from "./primitives";
import { SectionHeader } from "./SectionHeader";

/** A part of primitives.tsx since v2.14.0; this path, which consumers import, keeps it. */
export { BeforeAfterSides } from "./primitives";
import { renderMarkdown } from "../../lib/markdown";

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
  const [activeIndex] = useCarousel({
    count: lastStep + 1,
    initial: printMode ? -1 : 0,
    enabled: !printMode,
  });
  const punchlineVisible = printMode || !slide.revealPunchline || activeIndex === 2;

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
                <h2 className="mb-6 card-title text-2xl text-text">{side.label}</h2>

                <SideHighlight text={side.highlight} muted={!isActive} />

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
            className={`mt-10 max-w-3xl text-center font-heading text-2xl font-bold text-primary transition-opacity duration-500 ${punchlineVisible ? "opacity-100" : "opacity-0"}`}
          >
            {slide.punchline}
          </p>
        </BlurFade>
      )}

      <Footnotes notes={slide.footnotes} />
    </>
  );
}

/** A struck slide opens on the before side and brings in the after side and the punchline on the
 *  next press, so the strike lands as it is said; one with `strike: false` shows at once, since
 *  its before side stays. */
function BeforeAfterVariant({ slide }: { slide: ComparisonSidesSlide }) {
  const printMode = usePrintMode();
  const strike = slide.strike !== false;
  const stepped = !printMode && strike;
  const [phase] = useCarousel({ count: 2, enabled: stepped });
  const after = !stepped || phase === 1;

  return (
    <>
      <BeforeAfterSides
        left={slide.left}
        right={slide.right}
        after={after}
        strike={strike}
        adds={!strike && slide.adds}
      />

      {slide.punchline && (
        <div
          inert={!after}
          className={`mt-10 text-center transition-all duration-500 ${
            after ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="font-heading text-2xl font-bold text-primary">{slide.punchline}</p>
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
        {[slide.left, slide.right].map((side, i) => (
          <BlurFade key={i} delay={0.2 + i * 0.1} duration={0.6}>
            <SlideCard className="h-full card-pad-8">
              <h2 className="mb-6 card-title text-2xl text-text">{renderMarkdown(side.label)}</h2>
              <SideHighlight text={side.highlight} />
              <ul className="space-y-3">
                {side.items.map((item, j) => (
                  <MarkedItem key={j}>{renderMarkdown(item)}</MarkedItem>
                ))}
              </ul>
            </SlideCard>
          </BlurFade>
        ))}
      </div>

      {slide.punchline && (
        <BlurFade delay={0.5} duration={0.6}>
          <p className="mt-10 max-w-3xl text-center font-heading text-2xl font-bold text-primary">
            {slide.punchline}
          </p>
        </BlurFade>
      )}

      <Footnotes notes={slide.footnotes} />
    </>
  );
}

/** Two named stances, each on a neutral card with its quote, and the resolution under them, the
 *  `middle` word as its label: the comparison's `positions` variant, and the deprecated positions
 *  block. Neutral cards, not stances coloured apart on an ampersand. */
export function Positions({
  block,
}: {
  block: Pick<ComparisonPositionsSlide, "left" | "right" | "middle" | "resolution">;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12">
      <div className="grid w-full grid-cols-2 gap-8">
        {[block.left, block.right].map((side, i) => (
          <SlideCard key={i} className="h-full card-pad-8">
            <p className="hw-label mb-4 [--hw-label-size:var(--text-base)]" data-tone="muted">
              {side.name}
            </p>
            <h2 className="mb-6 card-title text-5xl leading-tight text-text">
              {keepHyphenatedWords(side.stance)}
            </h2>
            <p className="text-2xl leading-snug text-text-muted">{`“${side.quote}”`}</p>
          </SlideCard>
        ))}
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        {block.middle && (
          <p className="hw-label [--hw-label-size:var(--text-base)]" data-tone="muted">
            {block.middle}
          </p>
        )}
        <DisplayHeading as="h2" size="sm" className="text-center">
          {renderMarkdown(block.resolution)}
        </DisplayHeading>
      </div>
    </div>
  );
}

function GuidanceVariant({ slide }: { slide: ComparisonGuidanceSlide }) {
  const { intro, points, examples } = slide;
  const printMode = usePrintMode();
  const [activeExample] = useCarousel({ count: examples.length, enabled: !printMode });

  const renderExamples = printMode ? examples : [examples[activeExample]];

  return (
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
                <p className="hw-label mb-3 [--hw-label-size:var(--text-sm)]" data-hue="red">
                  Bad
                </p>
                <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                  {example.bad}
                </pre>
              </SlideCard>

              <SlideCard tone="success" look="soft" className="card-pad-6">
                <p className="hw-label mb-3 [--hw-label-size:var(--text-sm)]" data-hue="green">
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
  // A guidance slide's line under the headline is its `intro`, drawn in the body.
  const subtitle = slide.variant === "guidance" ? undefined : slide.subtitle;
  // A kicker or lead without a headline still stands at the top, as on a content slide.
  const titled = slide.headline || slide.sectionLabel || subtitle;

  return (
    <SlideShell>
      <div
        className={`slide-content relative z-10 flex flex-col items-center justify-center px-16 ${titled ? "slide-titled" : ""}`}
      >
        <SectionHeader label={slide.sectionLabel} />
        {slide.headline && (
          <SlideTitle as="h2" duration={0.6}>
            {slide.headline}
          </SlideTitle>
        )}
        {subtitle && <SlideSubtitle delay={0.22}>{renderMarkdown(subtitle)}</SlideSubtitle>}

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
