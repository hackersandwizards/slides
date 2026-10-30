"use client";

import type { AgendaSlide as AgendaSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: AgendaSlideType;
}

export function AgendaSlide({ slide }: Props) {
  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        <div className="slide-body">
          <ol className="flex flex-col gap-6">
            {slide.items.map((item, i) => (
              <BlurFade key={item} delay={0.15 + i * 0.04} duration={0.4}>
                <li className="flex items-baseline gap-4 text-2xl text-text md:gap-6 md:text-4xl">
                  <span className="w-9 shrink-0 text-right font-mono font-bold text-primary md:w-14">
                    {i + 1}.
                  </span>
                  {item}
                </li>
              </BlurFade>
            ))}
          </ol>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
