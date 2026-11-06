import type { SectionTheme } from "../types/slide";

// Every section sits on the plain brand page, no tint behind the text (os decision
// br-gradient-behind-content), and its kicker is teal like every other (br-slide-kicker-colour):
// the section shows in its rule and pill only.
export interface SectionStyle {
  border: string;
  /** One emphasis colour per slide: without one, the principle pill keeps the brand teal. */
  pill?: string;
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  border: "border-secondary/25",
};

export const SECTION_STYLES: Record<SectionTheme, SectionStyle> = {
  primary: {
    border: "border-border",
  },
  secondary: DEFAULT_SECTION_STYLE,
  accent: {
    border: "border-accent/25",
  },
  warning: {
    border: "border-accent/25",
  },
  success: {
    border: "border-green-dark/25",
    pill: "[--hw-pill-hue:var(--color-green-dark)] [--hw-pill-hue-night:var(--color-green-dark)]",
  },
  deepdive: {
    border: "border-secondary/25",
  },
};

export function getSectionStyle(theme?: SectionTheme): SectionStyle {
  if (!theme || !(theme in SECTION_STYLES)) return DEFAULT_SECTION_STYLE;
  return SECTION_STYLES[theme];
}

export type ColumnAccent = "ingredients" | "deepdive";

// The two-part slides' cards stay flat white: the accent is the teal rule on top (brand's hw-rule,
// purple on the second part) and the part's label box in the same hue.
export const COLUMN_HUE: Record<ColumnAccent, "teal" | "purple"> = {
  ingredients: "teal",
  deepdive: "purple",
};
