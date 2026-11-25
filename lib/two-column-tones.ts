import type { ContentBlock } from "../types/slide";

type TwoColumn = Extract<ContentBlock, { type: "two-column" }>;
export type SideTone = "success" | "error" | "neutral";

/** The tone of a two-column block's left and right side by its variant, which the slide and the
 *  .pptx both draw. */
export const TWO_COLUMN_TONES: Record<NonNullable<TwoColumn["variant"]>, [SideTone, SideTone]> = {
  "success-error": ["success", "error"],
  "error-success": ["error", "success"],
  error: ["error", "error"],
  "error-neutral": ["error", "neutral"],
  success: ["success", "success"],
  neutral: ["neutral", "neutral"],
};
