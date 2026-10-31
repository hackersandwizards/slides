"use client";

import type { RoadmapSlide as RoadmapSlideType, RoadmapColumn } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { renderMarkdown } from "../../lib/markdown";
import { COLUMN_STYLES } from "../../lib/section-styles";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: RoadmapSlideType;
}

const ACCENT_STYLES: Record<
  RoadmapColumn["accent"],
  { card: string; bar: string; badge: string; glow: string; defaultDot: string; iconBg: string }
> = {
  ingredients: { ...COLUMN_STYLES.ingredients, defaultDot: "bg-primary", iconBg: "bg-primary/15" },
  deepdive: { ...COLUMN_STYLES.deepdive, defaultDot: "bg-deep-400", iconBg: "bg-deep-100" },
};

function ColumnCard({ column, delay }: { column: RoadmapColumn; delay: number }) {
  const style = ACCENT_STYLES[column.accent];

  return (
    <BlurFade delay={delay} duration={0.5}>
      <div
        className={`relative h-full rounded-brand border ${style.card} ${style.glow} overflow-hidden`}
      >
        <div className={`absolute inset-x-0 top-0 h-2 ${style.bar}`} />

        <div className="px-10 pt-12 pb-10">
          <div
            className={`label-caps inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs ${style.badge}`}
          >
            {column.label}
          </div>

          <h3 className="mt-6 font-heading text-4xl leading-[1.05] font-bold tracking-[-0.02em] text-text md:text-5xl">
            {column.title}
          </h3>

          {column.subtitle && (
            <p className="mt-4 max-w-md text-lg leading-snug text-text-muted">
              {renderMarkdown(column.subtitle)}
            </p>
          )}

          <ul className="mt-8 space-y-4">
            {column.items.map((item, i) => (
              <BlurFade key={i} delay={delay + 0.05 + i * 0.04} duration={0.35}>
                <li className="flex items-start gap-4">
                  <span className={`slide-marker ${item.dotColor ?? style.defaultDot}`} />
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
      </div>
    </BlurFade>
  );
}

export function RoadmapSlide({ slide }: Props) {
  return (
    <SlideShell overflowHidden>
      <div
        className="absolute top-1/4 left-1/4 h-[37.5rem] w-[37.5rem] rounded-full bg-primary/7 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute right-1/4 bottom-1/4 h-[31.25rem] w-[31.25rem] rounded-full bg-deep-300/15 blur-[100px]"
        aria-hidden="true"
      />

      <TitledContent>
        {slide.preText && (
          <BlurFade delay={0.05} duration={0.4}>
            {/* The kicker every titled slide carries (SectionHeader): a grey caps line here read as
                a fourth eyebrow style. */}
            <p className="slide-kicker mb-4 text-xl leading-tight font-medium text-primary">
              {slide.preText}
            </p>
          </BlurFade>
        )}

        <SlideTitle as="h2" delay={0.05}>
          {slide.headline}
        </SlideTitle>

        {slide.subtitle && (
          <BlurFade delay={0.1} duration={0.4}>
            <p className="mt-4 max-w-5xl text-2xl whitespace-pre-line text-text-muted">
              {renderMarkdown(slide.subtitle)}
            </p>
          </BlurFade>
        )}
        <div className="slide-body">
          <div className="grid w-full grid-cols-2 gap-8">
            <ColumnCard column={slide.columns[0]} delay={0.15} />
            <ColumnCard column={slide.columns[1]} delay={0.2} />
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
