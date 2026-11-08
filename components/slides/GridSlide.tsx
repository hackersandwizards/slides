"use client";

import Image from "../ui/image";
import type { GridSlide as GridSlideType, GridCard } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { gridAsContent, isDeepDive } from "../../lib/slide-utils";
import { ContentSlide } from "./ContentSlide";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle } from "./primitives";

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
      {/* Every attribution row is a portrait high, so a quote with a portrait lines up with one
          without. */}
      <figure className="m-0 flex h-full flex-col">
        <blockquote className="hw-quote card-text-lg mb-6 leading-relaxed">
          {card.description ?? card.title}
        </blockquote>
        <figcaption className="mt-auto flex min-h-14 items-center gap-4">
          {card.imageSrc && (
            <Image
              src={card.imageSrc}
              alt={card.author ?? ""}
              width={56}
              height={56}
              className="h-14 w-14 rounded-brand border border-border object-cover"
            />
          )}
          {card.author && <span className="text-base font-bold text-primary">{card.author}</span>}
        </figcaption>
      </figure>
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
