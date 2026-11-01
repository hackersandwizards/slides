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
import { SlideShell } from "./SlideShell";
import { isDeepDive } from "../../lib/slide-utils";
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

  // A phase of more than six pills no longer fits shared columns across the slide: each phase then
  // wraps its pills in rows of their own width.
  const wrap = columns > 3;

  let itemIndex = 0;

  return (
    <SlideShell night={isDeepDive(slide)}>
      <Wash strength={3} />

      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-6">
        {/* The top margin holds the title pill, which hangs over the edge, inside what the fit guard
            measures, so a shrunk slide never pushes it under the brand strip. */}
        <div
          className={`relative mt-6 ${wrap ? "w-full" : "w-fit"} max-w-[100rem] rounded-brand border-2 border-dashed border-border bg-white px-6 pt-10 pb-8 md:px-12`}
        >
          {title && (
            // The fade itself is placed: a transform on a wrapper anchors an absolute child to
            // the wrapper until the fade ends, and the pill jumped 53 px up when it did.
            <BlurFade
              delay={0.05}
              duration={0.35}
              className="absolute -top-5 left-1/2 -translate-x-1/2"
            >
              <GradientTitlePill>{title}</GradientTitlePill>
            </BlurFade>
          )}

          {/* One grid for every phase, so the pills share columns, every column as wide as the
              widest pill, and a long phase breaks into even rows (six as 3 + 3) rather than wrapping where it runs out. */}
          <div
            className={wrap ? "flex flex-col gap-y-4" : "grid gap-y-4"}
            style={
              wrap
                ? undefined
                : { gridTemplateColumns: `repeat(${columns}, minmax(max-content, 1fr))` }
            }
          >
            {phases.map((phase, phaseIndex) => {
              const theme = phase.theme ?? "secondary";
              const category = themeToCategory[theme] ?? "secondary";
              const phaseDelay = 0.1 + phaseIndex * 0.12;

              return (
                <div
                  key={phaseIndex}
                  className={`gap-x-4 gap-y-2.5 ${wrap ? "flex flex-wrap" : "col-span-full grid grid-cols-subgrid"}`}
                >
                  <BlurFade
                    delay={phaseDelay}
                    duration={0.3}
                    className={wrap ? "basis-full" : "col-span-full"}
                  >
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

export function PhasedPillsSlide({ slide }: Props) {
  return <DefaultPhasedPills slide={slide} />;
}
