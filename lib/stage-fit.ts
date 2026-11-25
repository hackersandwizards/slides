/** Below `md` a slide is one column the reader scrolls (slides.css): nothing shrinks to fit, and
 *  nothing waits for a presenter's step. */
export const NARROW = "screen and (width < 48rem)";

/** The inline properties SlideShell's fit guard sets on the box it shrinks and clears on a refit;
 *  `slides-density` clears them to lay the box out at full size. No slide type sets them inline. */
export const FIT_STYLE = [
  "zoom",
  "--hw-zoom",
  "width",
  "height",
  "padding-top",
  "margin-inline",
] as const;
