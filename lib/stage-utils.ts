import type { StageState } from "../types/slide";

export type StageCategory = "primary" | "secondary" | "accent" | "success";

// The new stage stands out by an outline, which takes no layout: a 3px border and a 6% scale made
// it taller than its row and pushed its left edge out of line.
const categoryStyles = {
  primary: {
    new: "border border-primary outline-2 outline-primary bg-primary/15 text-text",
    active: "border border-primary bg-primary/15 text-text",
    default: "border border-border bg-white text-text-muted",
  },
  secondary: {
    new: "border border-secondary outline-2 outline-secondary bg-secondary/15 text-text",
    active: "border border-secondary bg-secondary/15 text-text",
    default: "border border-secondary-border bg-white text-text-muted",
  },
  accent: {
    new: "border border-accent outline-2 outline-accent bg-accent/15 text-text",
    active: "border border-accent bg-accent/15 text-text",
    default: "border border-accent/40 bg-white text-text-muted",
  },
  success: {
    new: "border border-success outline-2 outline-success bg-success/15 text-text",
    active: "border border-success bg-success/15 text-text",
    default: "border border-success/40 bg-white text-text-muted",
  },
} as const;

export function getStageClasses(
  state: StageState = "default",
  category: StageCategory = "secondary",
): string {
  return `transition-all duration-300 ${categoryStyles[category][state]}`;
}

// Section theme → stage category / Tailwind color token. Shared by the
// phased-pill slide types (PhasedPillsSlide, DualPillOverview); callers fall
// back to 'secondary' for unknown themes.
export const themeToCategory: Record<string, StageCategory> = {
  accent: "accent",
  primary: "primary",
  secondary: "secondary",
  success: "success",
  deepdive: "secondary",
};

export const themeDotColor: Record<string, string> = {
  accent: "bg-accent",
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  deepdive: "bg-secondary",
};

export const themeLabelColor: Record<string, string> = {
  accent: "text-accent",
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  deepdive: "text-secondary",
};
