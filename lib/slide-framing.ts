import { cornerMark, resolveSlideLogo } from "./logo";
import { deckLang } from "./slide-utils";
import type { Presentation, SectionTheme } from "../types/slide";

/** The corner counter, "05 / 24", on every slide but a title slide, which carries none. */
export function pageLabel(slides: ReadonlyArray<{ type: string }>, index: number) {
  if (slides[index]?.type === "title") return undefined;
  const width = Math.max(2, String(slides.length).length);
  const pad = (n: number) => String(n).padStart(width, "0");
  return `${pad(index + 1)} / ${pad(slides.length)}`;
}

/** A slide of a deep-dive part stands on night, the brand's ground for a whole section (os design
 *  guide), so the part reads as one from the back row, where its label alone would not mark it: the
 *  deep-dive divider, a night transition, a slide whose `sectionTheme` is `deepdive` and a pill map
 *  whose phases are. */
export function isDeepDive(slide: {
  type: string;
  night?: boolean;
  sectionTheme?: SectionTheme;
  phases?: { theme?: SectionTheme }[];
}): boolean {
  return (
    slide.type === "deep-dive-divider" ||
    (slide.type === "transition" && !!slide.night) ||
    slide.sectionTheme === "deepdive" ||
    (slide.phases?.some((p) => p.theme === "deepdive") ?? false)
  );
}

/** A deck page and a catalog story frame a slide alike. */
export function slideFrame(deck: Presentation, index: number) {
  return {
    logo: resolveSlideLogo(deck, index),
    theme: deck.theme,
    confidential: deck.confidential,
    page: pageLabel(deck.slides, index),
    mark: cornerMark(deck, index),
    lang: deckLang(deck),
  };
}
