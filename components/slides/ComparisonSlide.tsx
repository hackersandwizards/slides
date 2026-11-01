"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ComparisonSlide as ComparisonSlideType } from "../../types/slide";
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
  writeStored,
} from "../../lib/slide-utils";
import { SlideTitle, SlideCard } from "./primitives";

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

function VsVariant({ slide }: { slide: ComparisonSlideType }) {
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
                className="h-full p-8 transition-all duration-300"
              >
                <h3 className="mb-6 font-heading text-2xl font-bold text-text">{side.label}</h3>

                {side.highlight && (
                  <p
                    className={`label-caps mb-4 text-sm ${
                      isActive ? "text-primary" : "text-text-subtle"
                    }`}
                  >
                    {side.highlight}
                  </p>
                )}

                {pros.length > 0 && (
                  <div className="mb-4">
                    <ul className="space-y-2.5">
                      {pros.map((pro, j) => (
                        <MarkedItem key={j} mark="+" tone="text-success">
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
                        <MarkedItem key={j} mark={"\u2212"} tone="text-error">
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

function BeforeAfterVariant({ slide }: { slide: ComparisonSlideType }) {
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
      <div className="grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-stretch gap-6">
        <div
          className={`rounded-brand border p-8 transition-all duration-500 ${
            phase >= 2 ? "border-border bg-text-subtle/7" : "border-border bg-white"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-text-subtle" />
            <h3 className="font-heading text-2xl font-bold text-text-muted">{slide.left.label}</h3>
          </div>
          <ul className="space-y-3">
            {slide.left.items.map((item, i) => (
              <li
                key={i}
                className={`text-xl transition-all duration-300 ${
                  phase >= 2
                    ? "text-text-muted line-through decoration-text-subtle/70 decoration-2"
                    : "text-text"
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          inert={phase < 2}
          className={`flex items-center transition-all duration-500 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}
        >
          <span className="rotate-90 text-3xl font-bold text-primary md:rotate-0">&rarr;</span>
        </div>

        <SlideCard
          inert={phase < 2}
          tone="primary"
          look="soft"
          className={`p-8 transition-all duration-500 ${
            phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="font-heading text-2xl font-bold text-primary">{slide.right.label}</h3>
          </div>
          <ul className="space-y-3">
            {slide.right.items.map((item, i) => (
              <li key={i} className="text-xl text-text">
                {item}
              </li>
            ))}
          </ul>
        </SlideCard>
      </div>

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

function SplitVariant({ slide }: { slide: ComparisonSlideType }) {
  return (
    <>
      <div className="grid w-full grid-cols-2 gap-8">
        <BlurFade delay={0.2} duration={0.6}>
          <SlideCard className="h-full p-8">
            <h3 className="mb-6 font-heading text-2xl font-bold text-text">{slide.left.label}</h3>
            <ul className="space-y-3">
              {slide.left.items.map((item, i) => (
                <MarkedItem key={i}>{item}</MarkedItem>
              ))}
            </ul>
          </SlideCard>
        </BlurFade>

        <BlurFade delay={0.3} duration={0.6}>
          <SlideCard className="h-full p-8">
            <h3 className="mb-6 font-heading text-2xl font-bold text-text">{slide.right.label}</h3>
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
          {variant === "vs" && <VsVariant slide={slide} />}
          {variant === "before-after" && <BeforeAfterVariant slide={slide} />}
          {variant === "split" && <SplitVariant slide={slide} />}
        </div>
      </div>
    </SlideShell>
  );
}
