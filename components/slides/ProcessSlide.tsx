"use client";

import type { ProcessSlide as ProcessSlideType } from "../../types/slide";
import { SlideShell, groundOf } from "./SlideShell";
import { LONG_FLOW, isHighlightPhase } from "../../lib/process-layout";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideCaption } from "./primitives";
import { FlowSteps } from "./Visuals";
import { ProcessCircle } from "./ProcessCircle";

interface Props {
  slide: ProcessSlideType;
}

export function ProcessSlide({ slide }: Props) {
  const loop = slide.loop !== false;
  // Five nodes and more overlap on a phone's circle, whose cards grow with their wrapped text: there
  // they stand as the flow block's upright list.
  const circle = loop && slide.nodes.length < LONG_FLOW;
  const { revealedCount, footerVisible, stepped } = useProgressiveReveal({
    totalSteps: slide.nodes.length,
    startFull: !!slide.static,
    hasFooter: !!slide.footer,
  });

  // The named phase stays lit once every step shows; while stepping, the step just revealed is.
  const named = slide.nodes.findIndex((node) => isHighlightPhase(node.title, slide.highlightPhase));
  return (
    <SlideShell ground={groundOf(slide)}>
      <TitledContent
        heading={{ sectionLabel: slide.sectionLabel, headline: slide.headline, duration: 0.6 }}
      >
        <div className="slide-body items-center">
          <div className="flex w-full flex-col items-center gap-10">
            {/* Desktop and print: the steps on one line as the flow block draws them, the loop
                back above. Phones keep a short loop's circle (ProcessSlide.css). */}
            <div className={`w-full ${circle ? "hidden md:block" : ""}`}>
              <FlowSteps
                steps={slide.nodes.map((node) => ({
                  title: node.title,
                  text: node.description || undefined,
                  icon: node.icon ?? undefined,
                  label: node.label,
                  subtitle: node.subtitle || undefined,
                  badge: node.badge,
                  dim: node.dimmed,
                  numbered: node.numbered,
                }))}
                highlight={revealedCount < slide.nodes.length ? revealedCount - 1 : named}
                loop={loop ? "" : undefined}
                revealed={revealedCount}
              />
            </div>
            {circle && (
              <ProcessCircle
                nodes={slide.nodes}
                highlightPhase={slide.highlightPhase}
                activeIndex={stepped ? revealedCount - 1 : -1}
                revealedCount={revealedCount}
              />
            )}

            {slide.footer && <SlideCaption visible={footerVisible}>{slide.footer}</SlideCaption>}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
