"use client";

import type { GanttSlide as GanttSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { isDeepDive } from "../../lib/slide-utils";
import { SectionHeader } from "./SectionHeader";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: GanttSlideType;
}

// Every bar takes the one data hue, teal, as every bar of the engine and the survey readout does
// (os docs/tracking/2026-11-01-bar-colours.md): a bar's label names its work, so a hue per
// workstream added colour without meaning. Work that runs continuously rather than as a block is
// the same teal at the ladder's 40 % fill with a 70 % edge, which clears 3:1 on its white guide.
const BAR = { solid: "bg-primary", soft: "bg-primary/40 border-2 border-primary/70" };

export function GanttSlide({ slide }: Props) {
  const columnCount = slide.columns.length;
  const track = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };

  return (
    <SlideShell night={isDeepDive(slide)}>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} principle={slide.principle} />

        <SlideTitle>{slide.headline}</SlideTitle>

        <div className="slide-body">
          <BlurFade delay={0.15} duration={0.4}>
            <div className="mb-2 flex items-end gap-4">
              <div className="hidden w-80 shrink-0 md:block" />
              <div className="grid flex-1 gap-1" style={track}>
                {slide.columns.map((col, i) => (
                  <div
                    key={i}
                    className="label-caps border-b-2 border-border pb-1.5 text-center text-sm text-text-subtle"
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>

          <div className="flex flex-1 flex-col gap-2">
            {slide.rows.map((row, rowIndex) => (
              <BlurFade
                key={rowIndex}
                delay={0.2 + rowIndex * 0.05}
                duration={0.4}
                className="flex flex-1 md:max-h-28"
              >
                <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-stretch md:gap-4">
                  <div className="flex shrink-0 flex-col justify-center md:w-80 md:text-right">
                    <div className="text-lg leading-tight text-text">{row.label}</div>
                    {row.sublabel && (
                      <div className="text-sm leading-tight text-text-muted">{row.sublabel}</div>
                    )}
                    {/* Below md a column is too narrow for a bar's label, so it moves up here. */}
                    <div className="text-sm leading-tight text-text md:hidden">
                      {row.bars.map((bar) => bar.label).join("·")}
                    </div>
                  </div>

                  <div
                    className="relative grid flex-1 grid-rows-[auto_1fr] gap-x-1 gap-y-1.5"
                    style={track}
                  >
                    {slide.columns.map((_, i) => (
                      <div
                        key={`guide-${i}`}
                        className="row-start-2 min-h-9 rounded-brand-sm bg-white"
                        style={{ gridColumn: i + 1 }}
                      />
                    ))}

                    {/* Every label sits above its bar, left-aligned with its start, so a row
                        never mixes labels inside a bar with labels beside one. */}
                    {row.bars.map((bar, barIndex) => (
                      <span
                        key={`label-${barIndex}`}
                        className="row-start-1 hidden self-end text-sm leading-tight font-bold text-primary md:block"
                        style={{ gridColumn: `${bar.start} / span ${bar.span}` }}
                      >
                        {bar.label}
                      </span>
                    ))}
                    {row.bars.map((bar, barIndex) => (
                      <div
                        key={barIndex}
                        className={`row-start-2 min-h-9 rounded-brand-sm ${bar.continuous ? BAR.soft : BAR.solid}`}
                        style={{ gridColumn: `${bar.start} / span ${bar.span}` }}
                      />
                    ))}
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>

          {slide.milestones && slide.milestones.length > 0 && (
            <BlurFade delay={0.25 + slide.rows.length * 0.05} duration={0.4}>
              <div className="mt-3 md:hidden">
                <div className="label-caps mb-1 text-sm text-text-subtle">Meilensteine</div>
                {slide.milestones.map((m, i) => (
                  <div key={i} className="text-sm leading-tight font-semibold text-secondary">
                    {slide.columns[m.column - 1]}: {m.label}
                  </div>
                ))}
              </div>
              <div className="mt-3 hidden items-start gap-4 md:flex">
                <div className="label-caps w-80 shrink-0 text-right text-sm text-text-subtle">
                  Meilensteine
                </div>
                <div className="grid flex-1 gap-1" style={track}>
                  {slide.milestones.map((m, i) => (
                    <div
                      key={i}
                      className="row-start-1 border-t-2 border-secondary pt-1.5 text-sm leading-tight font-semibold text-secondary"
                      style={{ gridColumn: m.column }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>
          )}

          {slide.footer && (
            <BlurFade delay={0.35 + slide.rows.length * 0.05} duration={0.4}>
              <p className="mt-5 text-lg text-text-muted">{slide.footer}</p>
            </BlurFade>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
