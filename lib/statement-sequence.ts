import type { StatementSlide } from "../types/slide";

export function statementDelays(slide: Pick<StatementSlide, "lines" | "points">) {
  const afterLines = 0.1 + slide.lines.length * 0.08;
  return { afterLines, closing: afterLines + (slide.points?.length ?? 0) * 0.06 + 0.05 };
}

export function closingLineOf(slide: Pick<StatementSlide, "closing" | "closingStyle">) {
  if (!slide.closing) return undefined;
  const kind: "plain" | "quote" = slide.closingStyle === "quote" ? "quote" : "plain";
  return { text: slide.closing, kind };
}
