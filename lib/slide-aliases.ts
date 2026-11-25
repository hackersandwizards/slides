import { highlightIndex } from "./content-block-aliases";
import type {
  ComparisonGuidanceSlide,
  ContentBlock,
  ContentSlide,
  DeepDiveDividerSlide,
  DualPillOverviewSlide,
  EvolutionSlide,
  GridSlide,
  GuidanceSlide,
  OverviewSlide,
  PhasedPillsSlide,
  ProcessSlide,
  RoadmapSlide,
  TransitionSlide,
} from "../types/slide";

/** An `evolution` slide as the `process` slide with `loop: false` that replaces it. */
export function evolutionAsProcess({ stages, ...slide }: EvolutionSlide): ProcessSlide {
  return {
    type: "process",
    sectionLabel: slide.sectionLabel,
    ground: slide.ground,
    background: slide.background,
    headline: slide.headline,
    footer: slide.footer,
    static: slide.static,
    loop: false,
    highlightPhase: stages.find((s) => s.isHighlighted)?.title,
    nodes: stages.map((s) => ({
      title: s.title,
      description: s.description,
      label: s.multiplier,
      subtitle: s.subtitle || undefined,
      badge: s.badge,
      dimmed: s.isDimmed,
    })),
  };
}

/** A `dual-pill-overview` slide as the `roadmap` slide with phased columns that replaces it. */
export function dualPillAsRoadmap({ left, right, ...slide }: DualPillOverviewSlide): RoadmapSlide {
  return {
    type: "roadmap",
    preText: slide.preText,
    headline: slide.headline,
    subtitle: slide.subtitle,
    columns: [left, right],
  };
}

/** A `grid` slide with pillars or stats as the content slide that replaces it: pillars as a
 *  `cards` block, numbered where no card names an icon, stats as a `numbers` block. A card's
 *  colour (`tone`) goes: colour comes from the role. Quotes keep the grid. */
export function gridAsContent({
  cards,
  ...slide
}: Exclude<GridSlide, { variant: "quotes" }>): ContentSlide {
  const block: ContentBlock =
    slide.variant === "stats"
      ? {
          type: "numbers",
          items: cards.map((c) => ({
            value: c.value ?? "",
            label: c.label ?? c.title,
            text: c.description,
          })),
        }
      : {
          type: "cards",
          items: cards.map((c) => ({ title: c.title, text: c.description, icon: c.icon })),
          numbered: !cards.some((c) => c.icon),
          numberFrom: slide.numberFrom,
          highlight: highlightIndex(cards.findIndex((c) => c.highlight)),
          columns: slide.columns ?? (cards.length === 4 ? 4 : undefined),
          reveal: !slide.allActive,
          dense: true,
        };
  return {
    type: "content",
    ground: slide.ground,
    background: slide.background,
    sectionLabel: slide.sectionLabel,
    sectionTheme: slide.sectionTheme,
    headline: slide.headline,
    content: [block],
  };
}

/** A `deep-dive-divider` as the night transition that replaces it. */
export function deepDiveAsTransition({
  partLabel,
  kicker,
  headline,
  subtitle,
  notes,
}: DeepDiveDividerSlide & { notes?: string }): TransitionSlide & { notes?: string } {
  const preText = [partLabel, kicker].filter(Boolean).join(" · ");
  return {
    type: "transition",
    night: true,
    headline,
    ...(preText ? { preText } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(notes ? { notes } : {}),
  };
}

/** A `guidance` slide as the comparison slide's `guidance` variant that replaces it. */
export function guidanceAsComparison({
  type: _,
  ...slide
}: GuidanceSlide): ComparisonGuidanceSlide {
  return { ...slide, type: "comparison", variant: "guidance" };
}

/** An `overview` slide as the phased-pills slide that replaces it: foundations and pipeline as two
 *  phases, unnumbered, since the foundations are no sequence. Its one marked stage, `new`, is the
 *  active pill; `active` stages, which the overview tinted all alike, draw plain, so one pill holds
 *  the focus. */
export function overviewAsPhases(slide: OverviewSlide): PhasedPillsSlide {
  const items = (stages: OverviewSlide["foundations"]) =>
    stages.map((s) => ({
      title: s.title,
      state: s.state === "new" ? ("active" as const) : undefined,
    }));
  return {
    type: "phased-pills",
    title: "The Factory",
    phases: [
      { label: "Foundations", theme: "primary", items: items(slide.foundations) },
      { label: "Pipeline", theme: "secondary", items: items(slide.pipeline) },
    ],
  };
}
