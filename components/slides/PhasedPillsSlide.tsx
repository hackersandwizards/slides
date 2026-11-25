"use client";

import type { CSSProperties } from "react";
import type {
  PhasedPillsSlide as PhasedPillsSlideType,
  PillPhase,
  SectionTheme,
  StageState,
} from "../../types/slide";
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
import { isDeepDive } from "../../lib/slide-framing";

interface Props {
  slide: PhasedPillsSlideType;
}

type PhaseLayout = "subgrid" | "row" | "wrap";

const PHASE_LAYOUTS: Record<
  PhaseLayout,
  { container: string; heading: string; track?: (itemCount: number) => CSSProperties }
> = {
  subgrid: { container: "col-span-full grid grid-cols-subgrid", heading: "col-span-full" },
  row: {
    container: "grid",
    heading: "col-span-full",
    track: (itemCount) => ({
      gridTemplateColumns: `repeat(${itemCount}, minmax(min-content, max-content))`,
    }),
  },
  wrap: { container: "flex flex-wrap", heading: "basis-full" },
};

function phaseLayout(wrap: boolean, itemCount: number): PhaseLayout {
  if (!wrap) return "subgrid";
  return itemCount <= 6 ? "row" : "wrap";
}

function phaseThemeStyle(theme: SectionTheme) {
  const key = Object.hasOwn(themeToCategory, theme) ? theme : "secondary";
  return {
    category: themeToCategory[key],
    hue: themeHue[key],
    dot: themeDotColor[key],
  };
}

function phasesWithItemOffsets(phases: PillPhase[]) {
  let nextItem = 0;
  return phases.map((phase) => {
    const firstItem = nextItem;
    nextItem += phase.items.length;
    return { phase, firstItem };
  });
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

function PhaseGroup({
  phase,
  layout,
  phaseIndex,
  firstItem,
}: {
  phase: PillPhase;
  layout: PhaseLayout;
  phaseIndex: number;
  firstItem: number;
}) {
  const { category, hue, dot } = phaseThemeStyle(phase.theme ?? "secondary");
  const styles = PHASE_LAYOUTS[layout];

  return (
    <div
      className={`gap-x-4 gap-y-2.5 ${styles.container}`}
      style={styles.track?.(phase.items.length)}
    >
      <BlurFade delay={0.1 + phaseIndex * 0.12} duration={0.3} className={styles.heading}>
        <div
          className="hw-label flex items-baseline gap-2.5 [--hw-label-size:var(--text-base)]"
          data-hue={hue}
        >
          <div className={`hw-marker ${dot}`} />
          <span>{phase.label}</span>
        </div>
      </BlurFade>

      {phase.items.map((item, i) => (
        <BlurFade key={i} delay={0.15 + (firstItem + i) * 0.04} duration={0.3}>
          <PillBox number={item.number} title={item.title} state={item.state} category={category} />
        </BlurFade>
      ))}
    </div>
  );
}

export function PhasedPillsSlide({ slide }: Props) {
  const { phases, title } = slide;
  const columns = Math.max(...phases.map(({ items }) => items.length));

  // A phase of more than three pills no longer fits shared columns across the slide: each phase
  // then wraps its pills in rows of their own width.
  const wrap = columns > 3;

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

          {/* One grid for phases of up to three, so the pills share columns as wide as the widest
              pill. A phase of four to six keeps one row of its own, since a split loses their
              order; more than six wrap. */}
          <div
            className={wrap ? "flex flex-col gap-y-4" : "grid gap-y-4"}
            style={
              wrap
                ? undefined
                : { gridTemplateColumns: `repeat(${columns}, minmax(max-content, 1fr))` }
            }
          >
            {phasesWithItemOffsets(phases).map(({ phase, firstItem }, phaseIndex) => (
              <PhaseGroup
                key={phaseIndex}
                phase={phase}
                layout={phaseLayout(wrap, phase.items.length)}
                phaseIndex={phaseIndex}
                firstItem={firstItem}
              />
            ))}
          </div>
        </DashedFrame>
      </div>
    </SlideShell>
  );
}
