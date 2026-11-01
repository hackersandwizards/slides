"use client";

import type { DeepDiveDividerSlide as DeepDiveDividerSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";

interface Props {
  slide: DeepDiveDividerSlideType;
}

/** The section divider of a deep-dive part: the transition slide's centred headline on the plain
 *  ground, its label in teal, on night teal-night, "Part Two · Deep Dive". No field, no decoration. */
export function DeepDiveDivider({ slide }: Props) {
  const label = [slide.partLabel, slide.kicker].filter(Boolean).join(" · ");
  return (
    <SlideShell direction="col" overflowHidden night>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-4 text-center">
        {label && (
          <BlurFade delay={0.05} duration={0.4}>
            <p className="label-caps mb-8 text-3xl text-primary">{label}</p>
          </BlurFade>
        )}

        <BlurFade delay={0.1} duration={0.5}>
          {/* Padding with a matching negative margin, as on the transition slide's headline: it keeps
              the descenders inside the box BlurFade's filter cuts its layer to. */}
          <h1 className="-my-[0.2em] py-[0.2em] font-heading text-7xl leading-[0.95] font-bold tracking-[-0.04em] whitespace-pre-line text-text xl:text-8xl">
            {slide.headline}
          </h1>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.2} duration={0.4}>
            <p className="mt-10 max-w-3xl text-3xl font-medium whitespace-pre-line text-text">
              {slide.subtitle}
            </p>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}
