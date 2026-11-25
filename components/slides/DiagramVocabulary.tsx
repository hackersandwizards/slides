import type { CSSProperties } from "react";
import { type IconName, iconMap } from "../../lib/icons";
import { renderMarkdown } from "../../lib/markdown";

// The diagram vocabulary of a content slide: one relationship per block, drawn so the eye reads
// the structure before the words. Shared rules, from the deck checklist:
// - one emphasis colour (the brand teal); everything else is ink or the brand's muted grey;
// - every element labelled where it sits, never through a legend;
// - labels 48px, captions and sources 36px at 1920 (24 and 18px in a 960px Meet window);
// - strokes 4px and up, so video compression keeps them;
// - the brand corner (large top-left and bottom-right) on every card.

// The brand's muted grey: 7:1 on the page, so a context bar or a connector in it reads.
export const VISUAL_MUTED = "var(--color-muted)";

export const VISUAL_CARD = "rounded-brand";
export const VISUAL_LABEL = "card-title text-4xl leading-tight text-balance";
// The smallest running text a visual sets: 36px at 1920, the checklist's floor.
export const VISUAL_CAPTION = "text-xl leading-snug";

// A grid of n equal columns. The count is a custom property, never an inline column template,
// which would outrank the phone rule in slides.css that stacks every grid into one column.
export const VISUAL_COLUMNS = "grid-cols-[repeat(var(--slide-cols),minmax(0,1fr))]";
export const visualColumns = (n: number) => ({ "--slide-cols": n }) as CSSProperties;

export function VisualSource({ text, gap = "mt-10" }: { text?: string; gap?: string }) {
  if (!text) return null;
  return <p className={`${gap} text-2xl text-text-muted`}>{renderMarkdown(text)}</p>;
}

export function VisualIcon({ name, className }: { name?: IconName; className?: string }) {
  const Glyph = name && Object.hasOwn(iconMap, name) ? iconMap[name] : undefined;
  return Glyph ? <Glyph className={className} strokeWidth={2.75} aria-hidden /> : null;
}
