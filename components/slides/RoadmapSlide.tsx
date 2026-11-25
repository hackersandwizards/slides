"use client";

import type {
  MarkerTone,
  RoadmapColumn,
  RoadmapSlide as RoadmapSlideType,
} from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { renderMarkdown } from "../../lib/markdown";
import { COLUMN_HUE, type ColumnAccent } from "../../lib/section-styles";
import { themeDotColor, themeHue, themeLabelColor } from "../../lib/stage-utils";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideSubtitle, DisplayHeading, SlideCard } from "./primitives";

// Draws both two-part slide types, roadmap and dual-pill-overview, so they stay one layout: a
// roadmap column is one group of rows, a dual-pill column one group per phase, its pills numbered
// rows. A pill's `state` draws nothing.
interface Props {
  slide: RoadmapSlideType;
}

interface PartItem {
  title: string;
  description?: string;
  /** Stands in place of the marker, in the group's colour. */
  number?: number;
  tone?: MarkerTone;
  dotColor?: `bg-${MarkerTone}`;
}

interface PartGroup {
  /** A caps label over the group, in its theme's colour. */
  label?: string;
  theme: string;
  rows: PartRow[];
}

interface PartRow {
  item: PartItem;
  delay: number;
}

interface RoadmapPart {
  label: string;
  title: string;
  subtitle?: string;
  hue: (typeof COLUMN_HUE)[ColumnAccent] | undefined;
  groups: PartGroup[];
  delay: number;
}

function normalizeRoadmapPart(column: RoadmapColumn, index: number): RoadmapPart {
  const hue = Object.hasOwn(COLUMN_HUE, column.accent) ? COLUMN_HUE[column.accent] : undefined;
  const fallback = hue === "teal" ? "primary" : "secondary";
  const delay = 0.15 + index * 0.05;
  const groups = column.phases || [
    { label: undefined, items: column.items ?? [], theme: fallback },
  ];
  let firstRow = 0;
  const normalizedGroups = groups.map((group) => {
    const requested = group.theme ?? "secondary";
    const theme = Object.hasOwn(themeDotColor, requested) ? requested : fallback;
    const rows = group.items.map((item, i) => ({
      item,
      delay: delay + 0.05 + (firstRow + i) * 0.04,
    }));
    firstRow += rows.length;
    return { label: group.label, theme, rows };
  });
  return {
    label: column.label,
    title: column.title,
    subtitle: column.subtitle,
    hue,
    groups: normalizedGroups,
    delay,
  };
}

/** A row's own marker colour, from `tone` or the class its deprecated `dotColor` names. */
function markerColour(item: PartItem): string | undefined {
  const tone = item.tone ?? item.dotColor?.slice(3);
  return tone ? themeDotColor[tone] : undefined;
}

/** One part: the accent rule, a square label, title and subtitle, then groups of rows, each a
 *  marker or a number, a bold title and a grey line. */
function PartCard({ part }: { part: RoadmapPart }) {
  const { label, title, subtitle, hue, groups, delay } = part;

  return (
    <BlurFade delay={delay} duration={0.5}>
      <SlideCard className="relative h-full overflow-hidden shadow-card card-pad-0">
        <div className="hw-rule absolute inset-x-0 top-0" data-hue={hue} aria-hidden="true" />

        <div className="px-10 pt-12 pb-10">
          <div className="hw-label hw-label-box [--hw-label-size:var(--text-xs)]" data-hue={hue}>
            {label}
          </div>

          {/* The heading's own margin is its descender bleed, so the gap above sits outside it. */}
          <div className="mt-6">
            <DisplayHeading as="h2" size="sm">
              {title}
            </DisplayHeading>
          </div>

          {subtitle && (
            <p className="mt-4 text-lg leading-snug text-text-muted">{renderMarkdown(subtitle)}</p>
          )}

          <div className="mt-6 space-y-6">
            {groups.map((group, i) => (
              <RoadmapPhase key={i} group={group} />
            ))}
          </div>
        </div>
      </SlideCard>
    </BlurFade>
  );
}

export function RoadmapSlide({ slide }: Props) {
  const parts = slide.columns.map(normalizeRoadmapPart);

  return (
    <SlideShell overflowHidden>
      <TitledContent>
        {slide.preText && (
          <BlurFade delay={0.05} duration={0.4}>
            {/* The kicker every titled slide carries (SectionHeader): a grey caps line here read as
                a fourth eyebrow style. */}
            <p className="slide-kicker hw-label mb-4 [--hw-label-size:var(--text-xl)]">
              {slide.preText}
            </p>
          </BlurFade>
        )}

        <SlideTitle as="h2" delay={0.05}>
          {slide.headline}
        </SlideTitle>

        {slide.subtitle && (
          <SlideSubtitle delay={0.1}>{renderMarkdown(slide.subtitle)}</SlideSubtitle>
        )}
        <div className="slide-body">
          <div className="grid w-full grid-cols-2 gap-8">
            {parts.map((part, i) => (
              <PartCard key={i} part={part} />
            ))}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}

function RoadmapPhase({ group }: { group: PartGroup }) {
  const { theme } = group;
  return (
    <div>
      {group.label && (
        <p className="hw-label mb-3 [--hw-label-size:var(--text-base)]" data-hue={themeHue[theme]}>
          {group.label}
        </p>
      )}
      <ul className="space-y-4">
        {group.rows.map(({ item, delay }, i) => (
          <RoadmapPhaseRow key={i} item={item} theme={theme} delay={delay} />
        ))}
      </ul>
    </div>
  );
}

function RoadmapPhaseRow({ item, theme, delay }: { item: PartItem; theme: string; delay: number }) {
  return (
    <BlurFade
      delay={delay}
      duration={0.35}
      as="li"
      className="flex items-baseline gap-4 text-xl leading-snug"
    >
      {item.number === undefined ? (
        <span className={`hw-marker ${markerColour(item) ?? themeDotColor[theme]}`} />
      ) : (
        <span
          className={`w-10 shrink-0 font-heading text-xl font-bold tabular-nums ${themeLabelColor[theme]}`}
        >
          {item.number}
        </span>
      )}
      <div className="flex-1">
        <p className="font-heading text-xl leading-snug font-bold text-text">
          {renderMarkdown(item.title)}
        </p>
        {item.description && (
          <p className="card-text-base mt-1 leading-snug text-text-muted">
            {renderMarkdown(item.description)}
          </p>
        )}
      </div>
    </BlurFade>
  );
}
