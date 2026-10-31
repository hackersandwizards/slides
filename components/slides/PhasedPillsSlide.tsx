"use client";

import type { PhasedPillsSlide as PhasedPillsSlideType, StageState } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import {
  getStageClasses,
  themeToCategory,
  themeDotColor,
  themeLabelColor,
  type StageCategory,
} from "../../lib/stage-utils";
import { GradientTitlePill, PulseDot } from "./SlideChrome";
import { DeepDiveBackdrop, HairlineRule, EyebrowRule } from "./DeepDiveBackdrop";
import { SlideShell } from "./SlideShell";
import { Wash } from "./primitives";

interface Props {
  slide: PhasedPillsSlideType;
}

function PillBox({
  number,
  title,
  state = "default",
  category,
}: {
  number: number;
  title: string;
  state?: StageState;
  category: StageCategory;
}) {
  return (
    <div
      className={`relative flex items-center gap-3 rounded-brand px-6 py-2.5 text-xl font-semibold ${getStageClasses(state, category)}`}
    >
      {state === "active" && <PulseDot category={category} offset="-top-1.5 -right-1.5" />}
      <span className="font-mono text-base opacity-70">#{number}</span>
      {/* A stage not yet reached keeps its full muted ink: faded further it read as disabled. */}
      <span>{title}</span>
    </div>
  );
}

function DefaultPhasedPills({ slide }: Props) {
  const { phases, title } = slide;
  // Up to three pills share a row; a longer phase splits into two even rows.
  const columns = Math.max(
    ...phases.map(({ items }) => (items.length > 3 ? Math.ceil(items.length / 2) : items.length)),
  );

  let itemIndex = 0;

  return (
    <SlideShell>
      <Wash strength={3} />

      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-6">
        {/* The top margin holds the title pill, which hangs over the edge, inside what the fit guard
            measures, so a shrunk slide never pushes it under the brand strip. */}
        <div className="relative mt-6 w-fit max-w-[100rem] rounded-brand border-2 border-dashed border-border bg-white px-6 pt-10 pb-8 md:px-12">
          {title && (
            <BlurFade delay={0.05} duration={0.35}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <GradientTitlePill>{title}</GradientTitlePill>
              </div>
            </BlurFade>
          )}

          {/* One grid for every phase, so the pills share columns, every column as wide as the
              widest pill, and a long phase breaks into even rows (six as 3 + 3) rather than wrapping where it runs out. */}
          <div
            className="grid gap-y-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(max-content, 1fr))` }}
          >
            {phases.map((phase, phaseIndex) => {
              const theme = phase.theme ?? "secondary";
              const category = themeToCategory[theme] ?? "secondary";
              const phaseDelay = 0.1 + phaseIndex * 0.12;

              return (
                <div
                  key={phaseIndex}
                  className="col-span-full grid grid-cols-subgrid gap-x-4 gap-y-2.5"
                >
                  <BlurFade delay={phaseDelay} duration={0.3} className="col-span-full">
                    <div className="flex items-center gap-2.5">
                      <div className={`slide-marker ${themeDotColor[theme] ?? "bg-secondary"}`} />
                      <span
                        className={`label-caps text-base ${themeLabelColor[theme] ?? "text-secondary"}`}
                      >
                        {phase.label}
                      </span>
                    </div>
                  </BlurFade>

                  {phase.items.map((item) => {
                    const delay = 0.15 + itemIndex * 0.04;
                    itemIndex++;
                    return (
                      <BlurFade key={item.number} delay={delay} duration={0.3}>
                        <PillBox
                          number={item.number}
                          title={item.title}
                          state={item.state}
                          category={category}
                        />
                      </BlurFade>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

function DeepDivePhasedPills({ slide }: Props) {
  const { phases, title } = slide;
  let itemIndex = 0;

  return (
    <SlideShell overflowHidden background="bg-section-deepdive">
      <DeepDiveBackdrop intensity="strong" />
      <HairlineRule color="rose" position="top" />
      <HairlineRule color="amber" position="bottom" />

      <div className="slide-content relative z-10 flex w-full max-w-[93.75rem] flex-col items-center justify-center px-16">
        {/* The part mark leads the content rather than sitting in the corner: a map of fifteen
            tactics grew up under a corner mark. */}
        <BlurFade delay={0.1} duration={0.5} className="mb-8 self-start">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rotate-45 bg-deep-500" />
            <span className="label-caps text-xs text-deep-700/100">Part Two · Map</span>
          </div>
        </BlurFade>
        {title && (
          <BlurFade delay={0.2} duration={0.5}>
            <EyebrowRule className="mb-12">{title}</EyebrowRule>
          </BlurFade>
        )}

        <div className="flex w-full flex-col gap-14">
          {phases.map((phase, phaseIndex) => {
            const category = "deepdive";
            const phaseDelay = 0.3 + phaseIndex * 0.12;

            return (
              <div key={phaseIndex}>
                <BlurFade delay={phaseDelay} duration={0.3}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px w-8 bg-deep-400" />
                    <span className="label-caps text-xs text-deep-700">{phase.label}</span>
                    <div className="h-1 w-1 rotate-45 bg-deep-400" />
                  </div>
                </BlurFade>

                <div className="flex flex-wrap gap-5">
                  {phase.items.map((item) => {
                    const delay = 0.35 + itemIndex * 0.035;
                    itemIndex++;
                    return (
                      <BlurFade key={item.number} delay={delay} duration={0.3}>
                        <PillBox
                          number={item.number}
                          title={item.title}
                          state={item.state}
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
        {/* The closing mark ends the content, so the footer band keeps it clear of the page
            counter like any other line. */}
        <BlurFade delay={0.15} duration={0.5} className="mt-10 self-end">
          <div className="flex items-center gap-3">
            <span className="label-caps text-xs text-deep-700">Where each tactic lives</span>
            <svg width="32" height="8" viewBox="0 0 32 8" fill="none" aria-hidden="true">
              <path
                d="M0 4h28M22 1l5 3-5 3"
                className="stroke-deep-800"
                strokeOpacity="0.55"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </BlurFade>
      </div>
    </SlideShell>
  );
}

export function PhasedPillsSlide({ slide }: Props) {
  const isDeepDive = slide.phases.some((p) => p.theme === "deepdive");
  return isDeepDive ? <DeepDivePhasedPills slide={slide} /> : <DefaultPhasedPills slide={slide} />;
}
