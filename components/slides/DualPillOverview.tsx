"use client";

import type { DualPillOverviewSlide as DualPillOverviewType, PillPhase } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import {
  themeToCategory,
  themeDotColor,
  themeLabelColor,
  type StageCategory,
} from "../../lib/stage-utils";
import { COLUMN_STYLES, type ColumnAccent } from "../../lib/section-styles";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: DualPillOverviewType;
}

const accentToColumnStyle: Record<
  ColumnAccent,
  { card: string; bar: string; badge: string; glow: string; titleColor: string }
> = {
  ingredients: { ...COLUMN_STYLES.ingredients, titleColor: "text-text" },
  deepdive: { ...COLUMN_STYLES.deepdive, titleColor: "text-text" },
};

const compactCategoryStyle: Record<StageCategory, string> = {
  primary: "border border-primary/40 bg-primary/7 text-text",
  secondary: "border border-secondary/40 bg-secondary/7 text-text",
  accent: "border border-accent/40 bg-accent/7 text-text",
  success: "border border-success/40 bg-success/7 text-text",
};

function CompactPill({
  number,
  title,
  category,
}: {
  number: number;
  title: string;
  category: StageCategory;
}) {
  return (
    <div
      className={`relative flex items-center gap-1.5 rounded-brand-sm px-2.5 py-1 text-sm font-semibold ${compactCategoryStyle[category]}`}
    >
      <span className="font-mono text-sm opacity-70">#{number}</span>
      <span>{title}</span>
    </div>
  );
}

function PhaseColumn({
  column,
  startDelay,
}: {
  column: DualPillOverviewType["left"];
  startDelay: number;
}) {
  const style = accentToColumnStyle[column.accent];
  let itemIndex = 0;

  return (
    <BlurFade delay={startDelay} duration={0.7}>
      <div
        className={`relative h-full overflow-hidden rounded-brand border ${style.card} ${style.glow}`}
      >
        <div className={`absolute inset-x-0 top-0 h-2 ${style.bar}`} />

        <div className="px-8 pt-10 pb-8">
          <div
            className={`label-caps inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs ${style.badge}`}
          >
            {column.label}
          </div>

          <h3
            className={`mt-4 font-heading text-3xl leading-[1.05] font-bold tracking-[-0.02em] md:text-4xl ${style.titleColor}`}
          >
            {column.title}
          </h3>

          {column.subtitle && (
            <p className="card-text-base mt-2 max-w-md leading-snug text-text-muted italic">
              {column.subtitle}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-4">
            {column.phases.map((phase: PillPhase, phaseIndex: number) => {
              const theme = phase.theme ?? "secondary";
              const category = themeToCategory[theme] ?? "secondary";
              const phaseDelay = startDelay + 0.15 + phaseIndex * 0.08;

              return (
                <div key={phaseIndex}>
                  <BlurFade delay={phaseDelay} duration={0.3}>
                    <div className="label-caps mb-2 flex items-baseline gap-2 text-xs">
                      <div
                        className={`slide-marker slide-marker-nested ${themeDotColor[theme] ?? "bg-secondary"}`}
                      />
                      <span className={themeLabelColor[theme] ?? "text-secondary"}>
                        {phase.label}
                      </span>
                    </div>
                  </BlurFade>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.items.map((item) => {
                      const delay = startDelay + 0.2 + itemIndex * 0.02;
                      itemIndex++;
                      return (
                        <BlurFade key={item.number} delay={delay} duration={0.25}>
                          <CompactPill
                            number={item.number}
                            title={item.title}
                            category={category}
                          />
                        </BlurFade>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BlurFade>
  );
}

export function DualPillOverview({ slide }: Props) {
  return (
    <SlideShell>
      <TitledContent>
        {slide.preText && (
          <BlurFade delay={0.1} duration={0.5}>
            <span className="slide-kicker label-caps block text-sm text-primary">
              {slide.preText}
            </span>
          </BlurFade>
        )}

        <SlideTitle delay={0.2} duration={0.6}>
          {slide.headline}
        </SlideTitle>

        {slide.subtitle && (
          <BlurFade delay={0.3} duration={0.5}>
            <p className="mt-3 max-w-5xl text-xl whitespace-pre-line text-text-muted">
              {slide.subtitle}
            </p>
          </BlurFade>
        )}
        <div className="slide-body">
          <div className="grid w-full grid-cols-2 gap-8">
            <PhaseColumn column={slide.left} startDelay={0.4} />
            <PhaseColumn column={slide.right} startDelay={0.55} />
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
