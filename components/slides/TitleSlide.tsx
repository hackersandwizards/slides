"use client";

import type { TitleSlide as TitleSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";

/** Inline, because the `white-space` shorthand of `whitespace-pre-line` resets the class's
 *  `text-wrap: balance`, which left a lone year on the subtitle's second line. */
const BALANCED = { textWrap: "balance" } as const;

interface Props {
  slide: TitleSlideType;
}

/** The title centred on the ground, the subtitle under it in ink, the lockup in the corner. No gradient
 *  field and no decoration, as on the section divider: blind-scored against the title on the left
 *  half's gradient field and against the centred title with glow, particles and rule (2026-10-31). */
export function TitleSlide({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-8 text-center">
        <BlurFade delay={0.1} duration={0.5}>
          {/* The padding keeps the glyphs inside the box BlurFade's filter cuts while it runs, as on
              the divider; the negative margin takes it back out of the layout. */}
          <div
            className="-my-[0.2em] py-[0.2em] font-heading text-6xl leading-[1.02] font-bold tracking-[-0.03em] whitespace-pre-line text-text md:text-8xl"
            style={BALANCED}
          >
            {slide.title}
          </div>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.2} duration={0.4}>
            <p
              className="mt-10 max-w-[80rem] text-2xl font-medium whitespace-pre-line text-text md:text-3xl"
              style={BALANCED}
            >
              {slide.subtitle}
            </p>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}
