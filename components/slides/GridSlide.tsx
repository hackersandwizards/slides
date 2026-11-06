"use client";

import Image from "../ui/image";
import type { GridSlide as GridSlideType, GridCard } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { gridAsContent, isDeepDive } from "../../lib/slide-utils";
import { ContentSlide } from "./ContentSlide";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle, SlideCard } from "./primitives";

interface Props {
  slide: GridSlideType;
}

function QuoteCard({ card, isRevealed }: { card: GridCard; isRevealed: boolean }) {
  return (
    <div
      inert={!isRevealed}
      className={`transition-all duration-500 ${
        isRevealed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <SlideCard className="flex h-full flex-col items-center text-center card-pad-8">
        {card.imageSrc && (
          <Image
            src={card.imageSrc}
            alt={card.author ?? ""}
            width={80}
            height={80}
            className="mb-4 h-20 w-20 rounded-brand border-2 border-border object-cover"
          />
        )}
        <p className="card-text-lg mb-4 leading-relaxed text-text-muted italic">
          &ldquo;{card.description ?? card.title}&rdquo;
        </p>
        {card.author && <p className="mt-auto text-base font-bold text-primary">{card.author}</p>}
      </SlideCard>
    </div>
  );
}

/** Quotes in a grid. Pillars and stats render as a content slide with a cards or numbers block
 *  (`gridAsContent`). */
export function GridSlide({ slide }: Props) {
  if ((slide.variant ?? "pillars") !== "quotes")
    return <ContentSlide slide={gridAsContent(slide)} />;
  return <QuoteGrid slide={slide} />;
}

function QuoteGrid({ slide }: Props) {
  const { revealedCount } = useProgressiveReveal({
    totalSteps: slide.cards.length,
    startFull: slide.allActive,
  });
  const gridCols =
    slide.columns === 2 ? "grid-cols-2" : slide.columns === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <SlideShell ground={groundOf(slide)} night={isDeepDive(slide)}>
      <TitledContent>
        {slide.sectionLabel && (
          <BlurFade delay={0.05} duration={0.5}>
            <span className="slide-kicker hw-label block [--hw-label-size:var(--text-base)]">
              {slide.sectionLabel}
            </span>
          </BlurFade>
        )}
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>

        <div className="slide-body items-center">
          <div className={`grid w-full max-w-5xl gap-8 ${gridCols}`}>
            {slide.cards.map((card, index) => (
              <QuoteCard key={index} card={card} isRevealed={index < revealedCount} />
            ))}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
