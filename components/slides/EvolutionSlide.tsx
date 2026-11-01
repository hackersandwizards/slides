"use client";

import type { EvolutionSlide as EvolutionSlideType } from "../../types/slide";
import { SlideShell } from "./SlideShell";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle, SlideCaption } from "./primitives";
import { FlowSteps } from "./Visuals";

interface Props {
  slide: EvolutionSlideType;
}

// The stages on one line as the flow block draws them: the multiplier in the tile, or above the
// title where one is too long for it.
export function EvolutionSlide({ slide }: Props) {
  const named = slide.stages.findIndex((s) => s.isHighlighted);
  const { revealedCount, footerVisible, stepped } = useProgressiveReveal({
    totalSteps: slide.stages.length,
    startFull: !!slide.static,
    hasFooter: !!slide.footer,
  });
  // While the presenter steps, the stage just revealed is lit, the last one included; a slide
  // that opens with every stage showing (print, a backward arrival, `static`), or whose footer
  // has come in, lights the named one.
  const highlight = stepped && !footerVisible ? revealedCount - 1 : named;

  return (
    <SlideShell background={slide.background ?? "bg-section-intro"}>
      <TitledContent>
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>

        <div className="slide-body items-center">
          <div className="flex w-full flex-col items-center gap-10">
            <FlowSteps
              steps={slide.stages.map((stage) => ({
                title: stage.title,
                label: stage.multiplier,
                subtitle: stage.subtitle || undefined,
                text: stage.description || undefined,
                badge: stage.badge,
                dim: stage.isDimmed,
              }))}
              highlight={highlight}
              revealed={revealedCount}
            />
            {slide.footer && <SlideCaption visible={footerVisible}>{slide.footer}</SlideCaption>}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
