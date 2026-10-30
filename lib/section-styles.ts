import type { SectionTheme } from "../types/slide";

// One emphasis colour per slide: the principle pill takes the brand teal, never a third hue.
export const ACCENT_PILL = "slide-chip";

export interface SectionStyle {
  gradient: string;
  label: string;
  border: string;
  pill: string;
}

// Every section sits on the brand page; its colour is the eyebrow's, so a deck does not change
// background tint slide by slide. The deep-dive part keeps its own warm identity.
export const DEFAULT_SECTION_STYLE: SectionStyle = {
  gradient: "bg-gradient-to-br from-secondary/3 via-transparent to-primary/3",
  label: "text-secondary",
  border: "border-secondary/20",
  pill: ACCENT_PILL,
};

export const SECTION_STYLES: Record<SectionTheme, SectionStyle> = {
  primary: {
    gradient: "bg-gradient-to-br from-primary/3 via-transparent to-secondary/3",
    label: "text-primary",
    border: "border-border",
    pill: ACCENT_PILL,
  },
  secondary: DEFAULT_SECTION_STYLE,
  accent: {
    gradient: "bg-gradient-to-br from-accent/3 via-transparent to-primary/3",
    label: "text-accent",
    border: "border-accent/20",
    pill: ACCENT_PILL,
  },
  warning: {
    gradient: "bg-gradient-to-br from-accent/3 via-transparent to-brand/3",
    label: "text-accent",
    border: "border-accent/20",
    pill: ACCENT_PILL,
  },
  success: {
    gradient: "bg-gradient-to-br from-success/3 via-transparent to-primary/3",
    label: "text-success",
    border: "border-success/20",
    pill: "slide-chip [--chip:var(--color-success)]",
  },
  deepdive: {
    gradient: "bg-gradient-to-br from-secondary/3 via-transparent to-primary/3",
    label: "text-secondary",
    border: "border-secondary/20",
    pill: ACCENT_PILL,
  },
};

export function getSectionStyle(theme?: SectionTheme): SectionStyle {
  if (!theme || !(theme in SECTION_STYLES)) return DEFAULT_SECTION_STYLE;
  return SECTION_STYLES[theme];
}

export type ColumnAccent = "ingredients" | "deepdive";

// Shared card identity for the two staged-column slide types (RoadmapSlide,
// DualPillOverview). The "deepdive" accent is the load-bearing Part-Two brand;
// keeping it here prevents the two slides from drifting apart. Each slide
// spreads this and adds its own extra fields.
export interface ColumnStyle {
  card: string;
  bar: string;
  badge: string;
  glow: string;
}

export const COLUMN_STYLES: Record<ColumnAccent, ColumnStyle> = {
  ingredients: {
    card: "border-border bg-gradient-to-br from-white via-primary/5 to-secondary/10",
    bar: "bg-gradient-to-r from-primary via-secondary to-accent",
    badge: "bg-primary/10 text-primary border-border",
    glow: "shadow-card [.slide-scale-delivered_&]:shadow-[0_30px_60px_-20px]",
  },
  deepdive: {
    card: "border-deep-300/40 bg-gradient-to-br from-white via-deep-50 to-amber/5",
    bar: "bg-gradient-to-r from-deep-400 via-amber to-factory-light",
    badge: "bg-deep-100 text-deep-700 border-deep-200",
    glow: "shadow-card [.slide-scale-delivered_&]:shadow-[0_30px_60px_-20px]",
  },
};
