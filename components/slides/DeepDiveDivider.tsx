"use client";

import type { DeepDiveDividerSlide as DeepDiveDividerSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeepDiveBackdrop, HairlineRule, EyebrowRule } from "./DeepDiveBackdrop";
import { SlideShell } from "./SlideShell";

interface Props {
  slide: DeepDiveDividerSlideType;
}

export function DeepDiveDivider({ slide }: Props) {
  return (
    <SlideShell overflowHidden background="bg-section-deepdive">
      <DeepDiveBackdrop intensity="strong" />

      <HairlineRule color="rose" position="top" />
      <HairlineRule color="amber" position="bottom" />

      {/* Top-left chapter mark */}
      {slide.partLabel && (
        <BlurFade delay={0.05} duration={0.4} className="absolute top-20 left-20 z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rotate-45 bg-deep-500" />
            <span className="label-caps text-xs text-deep-700/80">{slide.partLabel}</span>
          </div>
        </BlurFade>
      )}

      {/* Centered content stack */}
      <div className="slide-content relative z-10 flex w-full max-w-[75rem] flex-col items-center justify-center px-16 text-center">
        {slide.kicker && (
          <BlurFade delay={0.1} duration={0.4}>
            <EyebrowRule className="mb-8">{slide.kicker}</EyebrowRule>
          </BlurFade>
        )}

        <BlurFade delay={0.15} duration={0.5}>
          {/* Padding with a matching negative margin, as on the transition slide's headline: it keeps
              the descenders inside the box BlurFade's filter cuts its layer to. */}
          <h1 className="-my-[0.2em] py-[0.2em] font-heading text-[5rem] leading-[0.95] font-bold tracking-(--type-h1-tracking) text-balance whitespace-pre-line text-deep-950 xl:text-[6.5rem]">
            {slide.headline}
          </h1>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.25} duration={0.4}>
            <p className="mt-10 max-w-2xl text-2xl leading-snug font-medium text-balance whitespace-pre-line text-deep-900/75">
              {slide.subtitle}
            </p>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}
