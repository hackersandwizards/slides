/** A leading hyphen in a figure is a minus: the typographic one, which sits on the digits' axis. */
export const minus = (v: string) => v.replace(/^-(?=\d)/, "−");

// A figure's leading words ("about $2M", "up to +70%", "über 50", "ca. 5"): every lowercase word,
// an abbreviation's dot included, before the first token that is not one. They are set small, so
// only the figure itself carries weight; a quiet figure sets them in the label's face, where six
// figures on a slide would otherwise compete with them.
export const leadingWords = (value: string) =>
  /^((?:\p{Ll}+\.?\s+)+)(?=[^\p{Ll}\s])/u.exec(value)?.[1] ?? "";

/** The print route's 1920x1080 stage, which figures are sized for and slides-pptx measures off: a
 *  slide row about 1650 px wide, a rem of 21.333 px, and a mono character 0.6em wide. */
export const STAGE = { row: 1650, rem: 21.333, char: 0.6 };

/** The size in rem at which a figure `chars` mono characters wide fills `px` of the stage. */
export const figureRem = (px: number, chars: number) => px / (chars * STAGE.char) / STAGE.rem;

// A figure's width in mono characters, leading words set at about half size counting half.
export const figureChars = (value: string) => {
  const lead = leadingWords(value);
  return value.length - lead.length + 0.5 * lead.trim().length;
};

/** A numbers block's grid: up to four figures stand in one row; more wrap (`wrapped`), five and six
 *  into three columns, so a column never narrows below a quarter of the slide. One size in rem for
 *  every figure, set by the longest, so the row shares a baseline and none wraps: a column is a
 *  `cols`th of the stage row. */
export function numbersGrid(values: string[]) {
  const n = values.length;
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  const wrapped = n > 4;
  const cap = wrapped ? 5 : cols === 2 ? 9 : 7;
  const longest = Math.max(...values.map(figureChars));
  return { cols, wrapped, size: Math.min(cap, figureRem(STAGE.row / cols - 60, longest)) };
}
