"use client";

import type { TitleSlide as TitleSlideType } from "../../types/slide";
import { Particles } from "../ui/particles";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { HwWordmark } from "./SlideContainer";

interface Props {
  slide: TitleSlideType;
}

/** The title on the left half's gradient field, the subtitle on the ground beside it, level with
 *  the title's first line, and the lockup under it on the title's last line (`.slide-split-lockup`
 *  in `slides.css`). A client theme and a phone keep the centred title with the glow, particles
 *  and rule (`.slide-classic`) and the lockup in the corner. */
export function TitleSlide({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden>
      <div className="slide-field" aria-hidden="true" />
      <div
        className="slide-classic absolute top-1/4 left-1/4 h-[37.5rem] w-[37.5rem] rounded-full bg-brand/7 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="slide-classic absolute right-1/3 bottom-1/4 h-[31.25rem] w-[31.25rem] rounded-full bg-brand-accent/7 blur-[100px]"
        aria-hidden="true"
      />

      <Particles
        className="slide-classic absolute inset-0"
        quantity={120}
        size={1.2}
        staticity={15}
        color="--color-teal"
      />

      <div className="slide-content slide-split slide-split-lockup relative z-10 flex flex-col items-center justify-center px-8">
        <BlurFade delay={0.1} duration={0.5} className="slide-split-lead">
          <div className="text-center font-heading text-7xl leading-[1.02] font-bold tracking-[-0.03em] text-balance whitespace-pre-line text-text md:text-8xl">
            {slide.title}
          </div>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.2} duration={0.4}>
            <p className="mt-10 text-3xl font-medium whitespace-pre-line text-text-muted">
              {slide.subtitle}
            </p>
          </BlurFade>
        )}

        <BlurFade delay={0.3} duration={0.4} className="slide-split-mark">
          <HwWordmark />
        </BlurFade>

        <BlurFade delay={0.3} duration={0.4} className="slide-classic">
          <div
            className="mt-12 h-1.5 w-40 bg-gradient-to-r from-brand to-brand-accent"
            aria-hidden="true"
          />
        </BlurFade>
      </div>
    </SlideShell>
  );
}
