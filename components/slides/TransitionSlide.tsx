"use client";

import type { TransitionSlide as TransitionSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { keepHyphenatedWords } from "../../lib/slide-utils";
import { DisplayHeading, SlideCard } from "./primitives";

interface Props {
  slide: TransitionSlideType;
}

/** The headline centred on the ground, the label above it, the subtitle and speaker below. A section
 *  divider carries no gradient field and no decoration: blind-scored against the headline on the left
 *  half's gradient field, which read as pushed into the corner beside an empty half (2026-10-31). */
export function TransitionSlide({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-4 text-center">
        {slide.preText && (
          <BlurFade delay={0.05} duration={0.4}>
            <p className="label-caps mb-6 text-xl text-primary sm:mb-8 sm:text-2xl md:text-3xl">
              {slide.preText}
            </p>
          </BlurFade>
        )}

        <BlurFade delay={0.1} duration={0.5}>
          <DisplayHeading as="div">{keepHyphenatedWords(slide.headline)}</DisplayHeading>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.2} duration={0.4}>
            <p className="mt-6 max-w-3xl text-lg font-medium whitespace-pre-line text-text sm:mt-8 sm:text-xl md:mt-10 md:text-2xl lg:text-3xl">
              {slide.subtitle}
            </p>
          </BlurFade>
        )}

        {slide.speakerName && (
          <BlurFade delay={0.3} duration={0.4}>
            <SlideCard
              tone="primary"
              look="line"
              className="mt-12 px-12 py-8 sm:mt-14 sm:px-14 sm:py-10 md:mt-18 md:px-18 md:py-12"
            >
              <p className="font-heading text-3xl font-bold text-brand sm:text-4xl md:text-5xl">
                {slide.speakerName}
              </p>
              {slide.speakerCompany && (
                <p className="mt-3 text-lg font-medium text-text-muted sm:text-xl md:text-2xl">
                  {slide.speakerCompany}
                </p>
              )}
            </SlideCard>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}
