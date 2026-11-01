import type { SectionTheme } from "../types/slide";

// One emphasis colour per slide: the principle pill takes the brand teal, never a third hue.
export const ACCENT_PILL = "slide-chip";

// Every section sits on the plain brand page, no tint behind the text (os decision
// br-gradient-behind-content), and its kicker is teal like every other (br-slide-kicker-colour):
// the section shows in its rule and pill only.
export interface SectionStyle {
  border: string;
  pill: string;
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  border: "border-secondary/25",
  pill: ACCENT_PILL,
};

export const SECTION_STYLES: Record<SectionTheme, SectionStyle> = {
  primary: {
    border: "border-border",
    pill: ACCENT_PILL,
  },
  secondary: DEFAULT_SECTION_STYLE,
  accent: {
    border: "border-accent/25",
    pill: ACCENT_PILL,
  },
  warning: {
    border: "border-accent/25",
    pill: ACCENT_PILL,
  },
  success: {
    border: "border-success/25",
    pill: "slide-chip [--chip:var(--color-success)]",
  },
  deepdive: {
    border: "border-secondary/25",
    pill: ACCENT_PILL,
  },
};

export function getSectionStyle(theme?: SectionTheme): SectionStyle {
  if (!theme || !(theme in SECTION_STYLES)) return DEFAULT_SECTION_STYLE;
  return SECTION_STYLES[theme];
}

export type ColumnAccent = "ingredients" | "deepdive";

// The card identity of the two-part slides (roadmap and dual-pill-overview, both
// drawn by RoadmapSlide on a neutral SlideCard). The "deepdive" accent is the load-bearing Part-Two
// brand. The cards stay flat white: body text never sits on a tint of the
// gradient (design guide); the accent is the bar and the badge.
export interface ColumnStyle {
  bar: string;
  badge: string;
  glow: string;
}

export const COLUMN_STYLES: Record<ColumnAccent, ColumnStyle> = {
  ingredients: {
    bar: "bg-gradient-to-r from-primary via-secondary to-accent",
    badge: "bg-primary/7 text-primary border-border",
    glow: "shadow-card",
  },
  deepdive: {
    bar: "bg-secondary",
    badge: "bg-secondary/7 text-secondary border-secondary/25",
    glow: "shadow-card",
  },
};
