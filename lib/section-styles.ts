import type { SectionTheme } from "../types/slide";

// One emphasis colour per slide: the principle pill takes the brand teal, never a third hue.
export const ACCENT_PILL = "slide-chip";

export interface SectionStyle {
  gradient: string;
  label: string;
  border: string;
  pill: string;
}

// Every section sits on the brand page under one wash, teal top left to purple bottom right as the
// brand's --gradient-magic runs, so a deck does not change background tint slide by slide; only
// the eyebrow takes the section's colour. The deep-dive part keeps its own warm identity.
export const SECTION_WASH = "bg-gradient-to-br from-primary/7 via-transparent to-secondary/7";

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  gradient: SECTION_WASH,
  label: "text-secondary",
  border: "border-secondary/25",
  pill: ACCENT_PILL,
};

export const SECTION_STYLES: Record<SectionTheme, SectionStyle> = {
  primary: {
    gradient: SECTION_WASH,
    label: "text-primary",
    border: "border-border",
    pill: ACCENT_PILL,
  },
  secondary: DEFAULT_SECTION_STYLE,
  accent: {
    gradient: SECTION_WASH,
    label: "text-accent",
    border: "border-accent/25",
    pill: ACCENT_PILL,
  },
  warning: {
    gradient: SECTION_WASH,
    label: "text-accent",
    border: "border-accent/25",
    pill: ACCENT_PILL,
  },
  success: {
    gradient: SECTION_WASH,
    label: "text-success",
    border: "border-success/25",
    pill: "slide-chip [--chip:var(--color-success)]",
  },
  deepdive: {
    gradient: SECTION_WASH,
    label: "text-secondary",
    border: "border-secondary/25",
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
    card: "border-border bg-gradient-to-br from-white via-primary/7 to-secondary/7",
    bar: "bg-gradient-to-r from-primary via-secondary to-accent",
    badge: "bg-primary/7 text-primary border-border",
    glow: "shadow-card",
  },
  deepdive: {
    card: "border-deep-300/40 bg-gradient-to-br from-white via-deep-50 to-amber/7",
    bar: "bg-gradient-to-r from-deep-400 via-amber to-factory-light",
    badge: "bg-deep-50 text-deep-700 border-deep-200",
    glow: "shadow-card",
  },
};
