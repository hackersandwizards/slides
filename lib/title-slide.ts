import type { TitleSlide } from "../types/slide";
import { knownLang } from "./slide-utils";

/** Whether a title slide carries a talk's opening, which TitleSlide draws left-aligned. */
export function isOpening(slide: TitleSlide): boolean {
  return !!(slide.kicker || slide.name || slide.speakers?.length || slide.event || slide.qr);
}

/** A title slide's speakers in one line, in the slide's `lang`, else the deck's ("A and B",
 *  "A und B"). */
export function speakerLine(slide: TitleSlide, deckLang: "en" | "de"): string {
  return new Intl.ListFormat(knownLang(slide.lang) ?? deckLang, { type: "conjunction" }).format(
    slide.speakers ?? [],
  );
}
