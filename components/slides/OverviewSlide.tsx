"use client";

import type { OverviewSlide as OverviewSlideType, Stage, StageState } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { getStageClasses, type StageCategory } from "../../lib/stage-utils";
import { GradientTitlePill, PulseDot } from "./SlideChrome";
import { SlideShell } from "./SlideShell";

interface Props {
  slide: OverviewSlideType;
}

function StageBox({
  title,
  description,
  state = "default",
  category,
}: {
  title: string;
  description: string;
  state?: StageState;
  category: StageCategory;
}) {
  const isHighlighted = state === "new" || state === "active";

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`relative w-full rounded-brand px-2 py-3.5 text-base font-bold text-balance ${getStageClasses(state, category)}`}
      >
        {state === "new" && <PulseDot category={category} />}
        {title}
      </div>
      <p
        className={`card-text-base mt-2.5 ${isHighlighted ? "font-medium text-text-muted" : "text-text-subtle"}`}
      >
        {description}
      </p>
    </div>
  );
}

// One equal column per stage: a fixed six-column grid left three stages in the left half, their
// one-line titles overrunning each other (DK-1: slide-master/21).
const columns = (n: number) => `repeat(${Math.max(n, 1)}, minmax(0, 1fr))`;

export function OverviewSlide({ slide }: Props) {
  const {
    foundations,
    pipeline,
    foundationsActive,
    pipelineActive,
    ideateExternal,
    parallelLanes,
  } = slide;

  const foundationsContainerClasses = `rounded-brand border-2 border-dashed p-5 transition-all duration-300  ${
    foundationsActive ? "border-primary bg-primary/7" : "border-primary-border/70 bg-white"
  }`;

  const pipelineContainerClasses = `rounded-brand border-2 border-dashed p-7 transition-all duration-300  ${
    pipelineActive ? "border-secondary bg-secondary/7" : "border-secondary-border/70 bg-white"
  }`;

  return (
    <SlideShell>
      {/* The vertical padding keeps the fit guard's shrink inside the safe margins, and clear of
 the label that sits above the frame. */}
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-6 py-16">
        <BlurFade delay={0.1} duration={0.5}>
          <div className="relative w-full max-w-[81rem] rounded-brand border-2 border-dashed border-border bg-white px-6 pt-12 pb-10">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <GradientTitlePill>The Factory</GradientTitlePill>
            </div>

            <div className={foundationsContainerClasses}>
              <div className="label-caps mb-4 flex items-baseline gap-2 text-base">
                <div className="hw-marker bg-primary" />
                <span className="text-primary">Foundations</span>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: columns(foundations.length) }}
              >
                {foundations.map((stage: Stage, index: number) => (
                  <StageBox
                    key={index}
                    title={stage.title}
                    description={stage.description}
                    state={stage.state}
                    category="primary"
                  />
                ))}
              </div>
            </div>

            {ideateExternal ? (
              <div className="mt-6 flex flex-col items-stretch gap-4 md:flex-row">
                <div className="flex items-center">
                  <div
                    className={`rounded-brand px-4 py-3 text-base font-semibold ${getStageClasses(pipeline[0]?.state, "secondary")}`}
                  >
                    {pipeline[0]?.title || "Ideate"}
                  </div>
                </div>

                {parallelLanes && parallelLanes > 1 ? (
                  <div className="flex flex-1 flex-col gap-3">
                    {Array.from({ length: parallelLanes }).map((_, laneIndex) => (
                      // Each lane's label sits left of its row, so three lanes cost three rows.
                      <div
                        key={laneIndex}
                        className={`flex flex-col gap-3 md:flex-row md:items-center md:gap-5 ${pipelineContainerClasses} md:py-4`}
                      >
                        <div className="label-caps flex shrink-0 items-baseline gap-2 text-base">
                          <div className="hw-marker bg-secondary" />
                          <span className="whitespace-nowrap text-secondary tabular-nums">
                            Pipeline {laneIndex + 1}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 md:flex-row">
                          {pipeline.slice(1).map((stage: Stage, index: number) => (
                            <div
                              key={index}
                              className="flex flex-1 flex-col items-center text-center"
                            >
                              <div
                                className={`w-full rounded-brand px-3 py-2 text-sm font-semibold ${getStageClasses(stage.state, "secondary")}`}
                              >
                                {stage.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex-1 ${pipelineContainerClasses}`}>
                    <div className="label-caps mb-3 flex items-baseline gap-2 text-base">
                      <div className="hw-marker bg-secondary" />
                      <span className="text-secondary">Pipeline</span>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row">
                      {pipeline.slice(1).map((stage: Stage, index: number) => (
                        <div key={index} className="flex flex-1 flex-col items-center text-center">
                          <div
                            className={`w-full rounded-brand px-3 py-2 text-sm font-semibold ${getStageClasses(stage.state, "secondary")}`}
                          >
                            {stage.title}
                          </div>
                          {stage.description && (
                            <p className="mt-1 text-sm text-text-subtle">{stage.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`mt-6 ${pipelineContainerClasses}`}>
                <div className="label-caps mb-4 flex items-baseline gap-2 text-base">
                  <div className="hw-marker bg-secondary" />
                  <span className="text-secondary">Pipeline</span>
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: columns(pipeline.length) }}
                >
                  {pipeline.map((stage: Stage, index: number) => (
                    <StageBox
                      key={index}
                      title={stage.title}
                      description={stage.description}
                      state={stage.state}
                      category="secondary"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </BlurFade>
      </div>
    </SlideShell>
  );
}
