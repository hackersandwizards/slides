import type { CSSProperties } from "react";
import { STAGE, figureChars, figureRem, leadingWords, minus } from "../../lib/figure-layout";

// A figure's width in characters for its cap: one character more where leading words stand, for
// their gap and their true size (0.55em), which a half undercounts.
const fitChars = (value: string) => figureChars(value) + (leadingWords(value) ? 1 : 0);

// The size, in % of its column's width, at which the widest figure fits on one line, which
// TimelineVisual.css caps timeline figures at every width; NumbersVisual.css caps the others on a phone.
export const figureFit = (values: string[]) => {
  const chars = Math.max(...values.map(fitChars));
  return {
    "--slide-figure-fit": `${+(100 / (chars * STAGE.char)).toFixed(2)}cqi`,
  } as CSSProperties;
};

// A lone figure's size on the stage, under the hero size: at most two thirds of its row, so it
// stays on its line and its label keeps a column.
export const loneFigureSize = (value: string) =>
  ({
    "--slide-figure-lone-size": `${+figureRem((STAGE.row * 2) / 3, fitChars(value)).toFixed(2)}rem`,
  }) as CSSProperties;

export function Figure({ value, quiet }: { value: string; quiet?: boolean }) {
  const lead = leadingWords(value);
  if (!lead) return <>{minus(value)}</>;
  return (
    <>
      <span
        className={`mr-(--slide-figure-unit-gap) ${quiet ? "font-sans text-3xl font-medium tracking-(--type-body-tracking) text-text-muted" : "text-(length:--slide-figure-unit)"}`}
      >
        {lead.trim()}
        {/* The gap is the margin; this space, set too small to draw, keeps the words apart in the
            text a PDF, a search or a screen reader takes ("about 4", never "about4"). */}
        <span className="text-(length:--slide-figure-space)"> </span>
      </span>
      {minus(value.slice(lead.length))}
    </>
  );
}
