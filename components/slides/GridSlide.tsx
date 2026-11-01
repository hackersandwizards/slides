"use client";

import Image from "../ui/image";
import type { GridSlide as GridSlideType, GridCard } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { isDeepDive } from "../../lib/slide-utils";
import { iconMap, type LucideIcon } from "../../lib/icons";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: GridSlideType;
}

const defaultIcons: LucideIcon[] = [iconMap.brain, iconMap.shield, iconMap.wrench];

const ACCENT_STYLES = {
  neutral: {
    border: "border-border",
    bg: "bg-text-subtle/7",
    badgeBg: "bg-text-subtle",
    gradient: "bg-gradient-to-r from-text-subtle to-text-muted",
    icon: "text-text-muted",
    text: "text-text-muted",
  },
  primary: {
    border: "border-primary",
    bg: "bg-primary/7",
    badgeBg: "bg-primary",
    gradient: "bg-gradient-to-r from-primary to-secondary",
    icon: "text-primary",
    text: "text-primary",
  },
  secondary: {
    border: "border-secondary",
    bg: "bg-secondary/7",
    badgeBg: "bg-secondary",
    gradient: "bg-secondary",
    icon: "text-secondary",
    text: "text-secondary",
  },
  accent: {
    border: "border-accent",
    bg: "bg-accent/7",
    badgeBg: "bg-accent",
    gradient: "bg-accent",
    icon: "text-accent",
    text: "text-accent",
  },
  success: {
    border: "border-success",
    bg: "bg-success/7",
    badgeBg: "bg-success",
    gradient: "bg-success",
    icon: "text-success",
    text: "text-success",
  },
};

function PillarCard({
  card,
  index,
  isRevealed,
  isActive,
}: {
  card: GridCard;
  index: number;
  isRevealed: boolean;
  isActive: boolean;
}) {
  const Icon = (card.icon ? iconMap[card.icon] : null) ?? defaultIcons[index] ?? iconMap.brain;
  const isPast = isRevealed && !isActive;
  const hasExplicitColor = !!card.accentColor;
  const retainPastColor = isPast && hasExplicitColor;
  const accent = ACCENT_STYLES[card.accentColor ?? "primary"];

  return (
    <div
      className={`relative flex w-full flex-col items-center rounded-brand border p-8 text-center transition-all duration-500 ${
        isActive
          ? accent.border
          : isPast
            ? retainPastColor
              ? `${accent.border} `
              : "border-border bg-white"
            : "border-border bg-white"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-brand bg-white transition-opacity duration-500 ${
          isActive || retainPastColor ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        className={`absolute inset-0 rounded-brand ${accent.bg} transition-opacity duration-500 ${
          isActive ? "opacity-100" : retainPastColor ? "opacity-70" : "opacity-0"
        }`}
      />

      <div
        className={`absolute -top-6 left-1/2 z-20 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-brand-sm text-xl font-bold transition-all duration-500 ${
          isActive
            ? `${accent.gradient} scale-110 text-white`
            : retainPastColor
              ? `${accent.badgeBg} text-white`
              : "border border-badge-border bg-badge-bg text-primary"
        }`}
      >
        {index + 1}
      </div>

      <div className="relative z-10 mt-4 mb-4">
        <Icon
          className={`h-12 w-12 transition-colors duration-500 ${
            isActive || retainPastColor ? accent.icon : "text-primary"
          }`}
        />
      </div>

      <h2
        className={`relative z-10 mb-3 font-heading text-2xl font-bold transition-colors duration-500 ${
          isRevealed ? "text-text" : "text-text-subtle"
        }`}
      >
        {card.title}
      </h2>

      {card.description && (
        <p
          className={`card-text-lg relative z-10 leading-relaxed transition-colors duration-500 ${
            isRevealed ? "text-text-muted" : "text-text-subtle/70"
          }`}
        >
          {card.description}
        </p>
      )}
    </div>
  );
}

function StatCard({
  card,
  isRevealed,
  columns,
}: {
  card: GridCard;
  isRevealed: boolean;
  columns?: number;
}) {
  const accent = ACCENT_STYLES[card.accentColor ?? "primary"];
  const isHighlight = card.highlight || card.accentColor === "accent";
  // A value is one token: "+220 %" never breaks before its unit.
  const valueSize = (columns ?? 2) >= 4 ? "text-5xl" : "text-6xl";

  return (
    <div
      inert={!isRevealed}
      className={`transition-all duration-500 ${
        isRevealed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`flex h-full flex-col rounded-brand border p-8 transition-all ${
          isHighlight ? `${accent.border} ${accent.bg}` : "border-border bg-white"
        }`}
      >
        <div
          className={`font-heading font-bold tracking-tight whitespace-nowrap tabular-nums ${valueSize} ${accent.text}`}
        >
          {card.value}
        </div>
        <div className="mt-3 text-xl font-bold text-text">{card.label ?? card.title}</div>
        {card.description && (
          <p className="card-text-lg mt-2 leading-relaxed text-text-muted">{card.description}</p>
        )}
      </div>
    </div>
  );
}

function QuoteCard({ card, isRevealed }: { card: GridCard; isRevealed: boolean }) {
  return (
    <div
      inert={!isRevealed}
      className={`transition-all duration-500 ${
        isRevealed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex h-full flex-col items-center rounded-brand border-2 border-border bg-white p-8 text-center">
        {card.imageSrc && (
          <Image
            src={card.imageSrc}
            alt={card.author ?? ""}
            width={80}
            height={80}
            className="mb-4 h-20 w-20 rounded-full border-2 border-border object-cover"
          />
        )}
        <p className="card-text-lg mb-4 leading-relaxed text-text-muted italic">
          &ldquo;{card.description ?? card.title}&rdquo;
        </p>
        {card.author && <p className="mt-auto text-base font-bold text-primary">{card.author}</p>}
      </div>
    </div>
  );
}

export function GridSlide({ slide }: Props) {
  const variant = slide.variant ?? "pillars";
  const { revealedCount, stepped } = useProgressiveReveal({
    totalSteps: slide.cards.length,
    startFull: slide.allActive,
  });

  const columns = slide.columns || (variant === "stats" ? 2 : undefined);
  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : columns === 4
          ? "grid-cols-4"
          : "";

  return (
    <SlideShell background={slide.background ?? "bg-section-intro"} night={isDeepDive(slide)}>
      <TitledContent>
        {slide.sectionLabel && (
          <BlurFade delay={0.05} duration={0.5}>
            <span className={`slide-kicker label-caps block text-base text-primary`}>
              {slide.sectionLabel}
            </span>
          </BlurFade>
        )}
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>

        <div className="slide-body items-center">
          {variant === "pillars" && (
            <div
              className={
                slide.cards.length > 5
                  ? "flex w-full flex-col items-center gap-6 pt-6 md:flex-row md:flex-wrap md:items-stretch md:justify-center md:gap-y-12"
                  : `flex w-full flex-col items-center justify-center gap-6 pt-6 md:flex-row md:items-stretch ${slide.cards.length > 3 ? "" : "max-w-6xl"}`
              }
            >
              {slide.cards.map((card, index) => {
                const isRevealed = index < revealedCount;
                // The card just revealed is lit, the last one included. A slide that opens with
                // every card showing (print, a backward arrival) lights none, so no card reads as
                // the one that matters most.
                const isActive = stepped && index === revealedCount - 1;

                return (
                  <div
                    key={index}
                    inert={!isRevealed}
                    className={`flex w-full transition-all duration-500 ${slide.cards.length > 5 ? "md:w-[calc((100%-3rem)/3)]" : "md:w-auto md:min-w-0 md:flex-1"} ${
                      isRevealed
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-8 opacity-0"
                    }`}
                  >
                    <PillarCard
                      card={card}
                      index={index + (slide.numberFrom ?? 1) - 1}
                      isRevealed={isRevealed}
                      isActive={isActive}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {variant === "stats" && (
            <div className={`grid w-full max-w-6xl auto-rows-fr gap-6 ${gridCols}`}>
              {slide.cards.map((card, index) => (
                <StatCard
                  key={index}
                  card={card}
                  isRevealed={index < revealedCount}
                  columns={columns}
                />
              ))}
            </div>
          )}

          {variant === "quotes" && (
            <div className={`grid w-full max-w-5xl gap-8 ${gridCols || "grid-cols-3"}`}>
              {slide.cards.map((card, index) => (
                <QuoteCard key={index} card={card} isRevealed={index < revealedCount} />
              ))}
            </div>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
