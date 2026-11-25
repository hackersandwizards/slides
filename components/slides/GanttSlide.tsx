"use client";

import { useContext, type CSSProperties } from "react";
import type { GanttBar, GanttRow, GanttSlide as GanttSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang, SlideShell } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { isDeepDive, WORDS } from "../../lib/slide-utils";
import { SectionHeader } from "./SectionHeader";
import { TitledContent, SlideTitle, SlideFooter } from "./primitives";

interface Props {
  slide: GanttSlideType;
}

// Every bar takes the one data hue, teal, as every bar of the engine and the survey readout does:
// a bar's label names its work, so a hue per workstream would add colour without meaning. Work
// that runs continuously rather than as a block is the same teal at the ladder's 40 % fill with a
// 70 % edge, which clears 3:1 on its white guide.
const BAR = { solid: "bg-primary", soft: "bg-primary/40 border-2 border-primary/70" };

function ganttColumnTrack(columnCount: number): CSSProperties {
  return { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };
}

function GanttColumnHeader({ columns }: { columns: string[] }) {
  return (
    <BlurFade delay={0.15} duration={0.4}>
      <div className="mb-2 flex items-end gap-4">
        <div className="hidden w-80 shrink-0 md:block" />
        <div className="grid flex-1 gap-1" style={ganttColumnTrack(columns.length)}>
          {columns.map((col, i) => (
            <div
              key={i}
              className="hw-label border-b-2 border-border pb-1.5 text-center [--hw-label-size:var(--text-sm)]"
              data-tone="muted"
            >
              {col}
            </div>
          ))}
        </div>
      </div>
    </BlurFade>
  );
}

function GanttBarTrack({ bars, columns }: { bars: GanttBar[]; columns: string[] }) {
  return (
    <div
      className="relative grid flex-1 grid-rows-[auto_1fr] gap-x-1 gap-y-1.5"
      style={ganttColumnTrack(columns.length)}
    >
      {columns.map((_, i) => (
        <div
          key={`guide-${i}`}
          className="row-start-2 min-h-9 rounded-brand-sm bg-white"
          style={{ gridColumn: i + 1 }}
        />
      ))}

      {/* Every label sits above its bar, left-aligned with its start, so a row
          never mixes labels inside a bar with labels beside one. */}
      {bars.map((bar, barIndex) => (
        <span
          key={`label-${barIndex}`}
          className="row-start-1 hidden self-end text-sm leading-tight font-bold text-primary md:block"
          style={{ gridColumn: `${bar.start} / span ${bar.span}` }}
        >
          {bar.label}
        </span>
      ))}
      {bars.map((bar, barIndex) => (
        <div
          key={barIndex}
          className={`row-start-2 min-h-9 rounded-brand-sm ${bar.continuous ? BAR.soft : BAR.solid}`}
          style={{ gridColumn: `${bar.start} / span ${bar.span}` }}
        />
      ))}
    </div>
  );
}

function GanttTimelineRow({
  row,
  columns,
  rowIndex,
}: {
  row: GanttRow;
  columns: string[];
  rowIndex: number;
}) {
  return (
    <BlurFade delay={0.2 + rowIndex * 0.05} duration={0.4} className="flex flex-1 md:max-h-28">
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

        <GanttBarTrack bars={row.bars} columns={columns} />
      </div>
    </BlurFade>
  );
}

function GanttMilestones({
  milestones,
  columns,
  milestonesLabel,
  rowCount,
}: {
  milestones: NonNullable<GanttSlideType["milestones"]>;
  columns: string[];
  milestonesLabel?: string;
  rowCount: number;
}) {
  const words = WORDS[useContext(DeckLang)];
  const label = milestonesLabel ?? words.milestones;
  return (
    <BlurFade delay={0.25 + rowCount * 0.05} duration={0.4}>
      <div className="mt-3 md:hidden">
        <div className="hw-label mb-1 [--hw-label-size:var(--text-sm)]" data-tone="muted">
          {label}
        </div>
        {milestones.map((m, i) => (
          <div key={i} className="text-sm leading-tight font-semibold text-secondary">
            {columns[m.column - 1]}: {m.label}
          </div>
        ))}
      </div>
      <div className="mt-3 hidden items-start gap-4 md:flex">
        <div
          className="hw-label w-80 shrink-0 text-right [--hw-label-size:var(--text-sm)]"
          data-tone="muted"
        >
          {label}
        </div>
        <div className="grid flex-1 gap-1" style={ganttColumnTrack(columns.length)}>
          {/* One cell per column, its milestones stacked: two in one cell overlapped. */}
          {[...Map.groupBy(milestones, (m) => m.column)].map(([column, ms]) => (
            <div
              key={column}
              className="row-start-1 border-t-2 border-secondary pt-1.5 text-sm leading-tight font-semibold text-secondary"
              style={{ gridColumn: column }}
            >
              {ms.map((m, i) => (
                <div key={i}>{m.label}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </BlurFade>
  );
}

export function GanttSlide({ slide }: Props) {
  return (
    <SlideShell night={isDeepDive(slide)}>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} principle={slide.principle} />

        <SlideTitle>{slide.headline}</SlideTitle>

        <div className="slide-body">
          <GanttColumnHeader columns={slide.columns} />

          <div className="flex flex-1 flex-col gap-2">
            {slide.rows.map((row, rowIndex) => (
              <GanttTimelineRow
                key={rowIndex}
                row={row}
                columns={slide.columns}
                rowIndex={rowIndex}
              />
            ))}
          </div>

          {slide.milestones && slide.milestones.length > 0 && (
            <GanttMilestones
              milestones={slide.milestones}
              columns={slide.columns}
              milestonesLabel={slide.milestonesLabel}
              rowCount={slide.rows.length}
            />
          )}

          {slide.footer && (
            <SlideFooter delay={0.35 + slide.rows.length * 0.05}>
              {renderMarkdown(slide.footer)}
            </SlideFooter>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
