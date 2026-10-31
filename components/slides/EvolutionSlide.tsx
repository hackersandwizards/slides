"use client";

import type { EvolutionSlide as EvolutionSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { ArrowRight } from "lucide-react";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle, Wash } from "./primitives";

interface Props {
  slide: EvolutionSlideType;
}

export function EvolutionSlide({ slide }: Props) {
  const initialIndex = slide.stages.findIndex((s) => s.isHighlighted);
  const isStatic = !!slide.static;
  const { revealedCount, footerVisible, stepped } = useProgressiveReveal({
    totalSteps: slide.stages.length,
    startFull: isStatic,
    hasFooter: !!slide.footer,
  });
  // The stage just revealed is lit, the last one included. A slide that opens with every stage
  // showing (print, a backward arrival), or whose footer has come in after them, lights none.
  const activeIndex = isStatic ? initialIndex : stepped && !footerVisible ? revealedCount - 1 : -1;

  // A badge long enough to wrap gives every badge two lines, so the dividers above them align.
  const twoLineBadges = slide.stages.some((stage) => (stage.badge?.length ?? 0) > 14);

  return (
    <SlideShell background={slide.background ?? "bg-section-intro"}>
      <Wash strength={3} />

      <TitledContent>
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>

        <div className="slide-body items-center">
          <div className="flex w-full max-w-[100rem] flex-col items-center gap-8">
            <div className="flex w-full flex-col items-center gap-4 md:flex-row md:items-stretch">
              {slide.stages.map((stage, index) => {
                // Six and more stages leave a card about ten characters a line: a narrower padding
                // and a size down keep "Fachbereich" inside its card.
                const dense = slide.stages.length >= 6;
                const isRevealed = isStatic || index < revealedCount;
                const isActive = activeIndex === index;
                // In progressive mode, only use activeIndex for highlighting
                // In static mode, use the data's isHighlighted flag
                const isHighlighted = isStatic ? stage.isHighlighted : isActive;
                const isDimmed = stage.isDimmed;

                // Every stage but the last carries its 4rem arrow, so it starts 4rem wider and all
                // stage cards come out the same width.
                return (
                  <div
                    key={index}
                    inert={!isRevealed}
                    className={`flex min-w-0 flex-col items-center transition-all duration-500 md:grow md:flex-row md:items-stretch ${
                      index < slide.stages.length - 1 ? "md:basis-16" : "md:basis-0"
                    } ${
                      !isStatic && !isRevealed
                        ? "pointer-events-none translate-y-8 opacity-0"
                        : "translate-y-0 opacity-100"
                    }`}
                  >
                    <BlurFade
                      delay={isStatic ? 0.2 + index * 0.2 : 0}
                      duration={isStatic ? 0.5 : 0.3}
                      className="flex w-72 md:w-auto md:min-w-0 md:flex-1"
                    >
                      <div
                        className={`relative flex min-h-80 w-full flex-col rounded-brand border ${dense ? "px-3 py-6" : "p-6"} transition-all duration-300 ${
                          isHighlighted
                            ? "border-primary bg-primary/7"
                            : isDimmed
                              ? "border-border bg-white"
                              : "border-border bg-white"
                        }`}
                      >
                        {/* Stage badge — uses overlay for gradient so transitions stay smooth. It
                            sits on the card's top edge but in the flow, so a long label wraps inside
                            its card and pushes the text down: kept on one line, it ran over the
                            neighbouring stage. */}
                        <div
                          className={`relative z-10 -mt-11 max-w-[calc(100%+2.5rem)] self-center rounded-[1.25rem] px-4 py-2 text-center text-lg leading-tight font-bold transition-all duration-500 ${
                            isHighlighted
                              ? "bg-gradient-to-r from-brand to-brand-accent text-white"
                              : isDimmed
                                ? "bg-text-subtle text-white"
                                : isRevealed
                                  ? "border-2 border-badge-border bg-badge-bg text-primary"
                                  : "bg-badge-bg text-text-subtle/70"
                          }`}
                        >
                          {stage.multiplier}
                        </div>

                        <div className="mt-6 mb-4 flex flex-1 flex-col items-center text-center">
                          <h2
                            className={`font-heading text-3xl leading-tight font-bold transition-colors duration-300 ${
                              isHighlighted
                                ? "text-text"
                                : isDimmed
                                  ? "text-text-subtle"
                                  : isRevealed
                                    ? "text-text"
                                    : "text-text-subtle/40"
                            }`}
                          >
                            {stage.title}
                          </h2>
                          <p
                            className={`mt-2 ${dense ? "text-base" : "text-lg"} font-semibold transition-colors duration-300 ${
                              isHighlighted
                                ? "text-primary"
                                : isDimmed
                                  ? "text-text-subtle"
                                  : isRevealed
                                    ? "text-primary"
                                    : "text-text-subtle/40"
                            }`}
                          >
                            {stage.subtitle}
                          </p>
                          <p
                            className={`card-text-lg mt-4 leading-relaxed transition-colors duration-300 ${
                              isHighlighted
                                ? "text-text-muted"
                                : isDimmed
                                  ? "text-text-subtle"
                                  : isRevealed
                                    ? "text-text-subtle"
                                    : "text-text-subtle/40"
                            }`}
                          >
                            {stage.description}
                          </p>
                        </div>

                        {/* Market position badge */}
                        {stage.badge && (
                          <div
                            className={`mt-auto border-t pt-4 text-center text-base font-semibold transition-colors duration-300 ${twoLineBadges ? "min-h-[calc(2lh+1rem)]" : ""} ${
                              isHighlighted
                                ? "border-border text-primary"
                                : isDimmed
                                  ? "border-border text-text-subtle"
                                  : isRevealed
                                    ? "border-border text-primary"
                                    : "border-border text-text-subtle/40"
                            }`}
                          >
                            {stage.badge}
                          </div>
                        )}
                      </div>
                    </BlurFade>

                    {index < slide.stages.length - 1 && (
                      <BlurFade
                        delay={isStatic ? 0.3 + index * 0.2 : 0}
                        duration={isStatic ? 0.5 : 0.3}
                      >
                        <div className="my-2 flex h-full rotate-90 items-center md:mx-3 md:my-0 md:rotate-0">
                          <ArrowRight
                            className={`h-10 w-10 ${isHighlighted ? "text-primary" : "text-text-subtle"}`}
                          />
                        </div>
                      </BlurFade>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer bar */}
            {slide.footer && (
              <div
                inert={!footerVisible}
                className={`w-full max-w-5xl transition-all duration-500 ${
                  footerVisible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0"
                }`}
              >
                <div className="mt-4 rounded-brand border border-secondary/25 bg-secondary/7 px-10 py-5 text-center">
                  <p className="text-xl font-medium text-secondary">{slide.footer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
