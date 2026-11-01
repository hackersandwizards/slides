"use client";

import type { RoadmapSlide as RoadmapSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { renderMarkdown } from "../../lib/markdown";
import { COLUMN_STYLES, type ColumnAccent } from "../../lib/section-styles";
import { themeDotColor, themeLabelColor } from "../../lib/stage-utils";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideSubtitle } from "./primitives";

// Draws both two-part slide types, roadmap and dual-pill-overview, so they stay one layout (os
// decision roadmap-dual-pill-slides): a roadmap column is one group of rows, a dual-pill column
// one group per phase, its pills numbered rows. A pill's `state` draws nothing, as before.
interface Props {
  slide: RoadmapSlideType;
}

interface PartItem {
  title: string;
  description?: string;
  /** Stands in place of the marker, in the group's colour. */
  number?: number;
  dotColor?: string;
}

interface PartGroup {
  /** A caps label over the group, in its theme's colour. */
  label?: string;
  theme?: string;
  items: PartItem[];
}

/** One part: the accent bar, a square label, title and subtitle, then groups of rows, each a
 *  marker or a number, a bold title and a grey line. */
function PartCard({
  label,
  title,
  subtitle,
  accent,
  groups,
  delay,
}: {
  label: string;
  title: string;
  subtitle?: string;
  accent: ColumnAccent;
  groups: PartGroup[];
  delay: number;
}) {
  const style = COLUMN_STYLES[accent];
  const [defaultDot, defaultText] =
    accent === "ingredients" ? ["bg-primary", "text-primary"] : ["bg-secondary", "text-secondary"];
  let row = 0;

  return (
    <BlurFade delay={delay} duration={0.5}>
      <div
        className={`relative h-full overflow-hidden rounded-brand border ${style.card} ${style.glow}`}
      >
        <div className={`absolute inset-x-0 top-0 h-2 ${style.bar}`} />

        <div className="px-10 pt-12 pb-10">
          <div
            className={`label-caps inline-flex items-center rounded-brand-sm border px-4 py-1.5 text-xs ${style.badge}`}
          >
            {label}
          </div>

          <h3 className="mt-6 font-heading text-4xl leading-[1.05] font-bold tracking-[-0.02em] text-text md:text-5xl">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-4 text-lg leading-snug text-text-muted">{renderMarkdown(subtitle)}</p>
          )}

          <div className="mt-6 space-y-6">
            {groups.map((group, g) => {
              const dot = (group.theme && themeDotColor[group.theme]) || defaultDot;
              const text = (group.theme && themeLabelColor[group.theme]) || defaultText;
              return (
                <div key={g}>
                  {group.label && (
                    <p className={`label-caps mb-3 text-base ${text}`}>{group.label}</p>
                  )}
                  <ul className="space-y-4">
                    {group.items.map((item, i) => (
                      <BlurFade key={i} delay={delay + 0.05 + row++ * 0.04} duration={0.35}>
                        <li className="flex items-baseline gap-4 text-xl leading-snug">
                          {item.number === undefined ? (
                            <span className={`slide-marker ${item.dotColor ?? dot}`} />
                          ) : (
                            <span
                              className={`w-10 shrink-0 font-heading text-xl font-bold tabular-nums ${text}`}
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
                        </li>
                      </BlurFade>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BlurFade>
  );
}

export function RoadmapSlide({ slide }: Props) {
  const parts = slide.columns.map((c) => ({
    ...c,
    groups: c.phases
      ? c.phases.map((p) => ({ ...p, theme: p.theme ?? "secondary" }))
      : [{ items: c.items ?? [] }],
  }));

  return (
    <SlideShell overflowHidden>
      <TitledContent>
        {slide.preText && (
          <BlurFade delay={0.05} duration={0.4}>
            {/* The kicker every titled slide carries (SectionHeader): a grey caps line here read as
                a fourth eyebrow style. */}
            <p className="slide-kicker label-caps mb-4 text-xl leading-tight text-primary">
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
              <PartCard key={i} {...part} delay={0.15 + i * 0.05} />
            ))}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
