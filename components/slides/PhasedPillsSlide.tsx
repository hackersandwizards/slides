"use client";

import type { PhasedPillsSlide as PhasedPillsSlideType, StageState } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import {
  getStageClasses,
  themeToCategory,
  themeDotColor,
  themeHue,
  type StageCategory,
} from "../../lib/stage-utils";
import { FrameTitle, PulseDot } from "./SlideChrome";
import { SlideShell } from "./SlideShell";
import { DashedFrame } from "./primitives";
import { isDeepDive } from "../../lib/slide-utils";

interface Props {
  slide: PhasedPillsSlideType;
}

function PillBox({
  number,
  title,
  state = "default",
  category,
}: {
  number?: number;
  title: string;
  state?: StageState;
  category: StageCategory;
}) {
  return (
    <div
      className={`relative flex items-center gap-3 rounded-brand px-6 py-2.5 text-xl font-semibold ${getStageClasses(state, category)}`}
    >
      {state === "active" && <PulseDot category={category} offset="-top-1.5 -right-1.5" />}
      {number !== undefined && <span className="font-mono text-base opacity-70">#{number}</span>}
      {/* A stage not yet reached keeps its full muted ink: faded further it read as disabled. */}
      <span>{title}</span>
    </div>
  );
}

export function PhasedPillsSlide({ slide }: Props) {
  const { phases, title } = slide;
  const columns = Math.max(
    ...phases.map(({ items }) => (items.length > 6 ? Math.ceil(items.length / 2) : items.length)),
  );

  // A phase of more than three pills no longer fits shared columns across the slide: each phase
  // then wraps its pills in rows of their own width.
  const wrap = columns > 3;

  let itemIndex = 0;

  return (
    <SlideShell night={isDeepDive(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-6">
        {/* The top margin holds the title pill, which hangs over the edge, inside what the fit guard
            measures, so a shrunk slide never pushes it under the brand strip. */}
        <DashedFrame
          className={`relative mt-6 ${wrap ? "w-full" : "w-fit"} max-w-(--slide-measure-phases) px-6 pt-10 pb-8 md:px-12`}
        >
          {title && (
            // The fade itself is placed: test/enter-animation-anchor.test.ts says why.
            <BlurFade
              delay={0.05}
              duration={0.35}
              className="absolute -top-5 left-1/2 -translate-x-1/2"
            >
              <FrameTitle>{title}</FrameTitle>
            </BlurFade>
          )}

          {/* One grid for every phase, so the pills share columns, every column as wide as the
              widest pill. Up to six stay on one row, since a split loses their order. */}
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
                    <div
                      className="hw-label flex items-baseline gap-2.5 [--hw-label-size:var(--text-base)]"
                      data-hue={Object.hasOwn(themeHue, theme) ? themeHue[theme] : "purple"}
                    >
                      <div className={`hw-marker ${themeDotColor[theme] ?? "bg-secondary"}`} />
                      <span>{phase.label}</span>
                    </div>
                  </BlurFade>

                  {phase.items.map((item, i) => {
                    const delay = 0.15 + itemIndex * 0.04;
                    itemIndex++;
                    return (
                      <BlurFade key={i} delay={delay} duration={0.3}>
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
        </DashedFrame>
      </div>
    </SlideShell>
  );
}
