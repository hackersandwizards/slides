// Named, never the default: the whole file would bundle verbal.json's retired lines, which brand-retired fails on.
import { claim, name } from "@hackersandwizards/brand/verbal.json";
import type { ClosingSlide } from "../types/slide";

/** Companies a contact closing shows as a logo, so their name is not printed a second time under
 *  the speaker. */
export const companiesWithLogo = (slide: ClosingSlide) =>
  new Set([
    name.company.toLowerCase(),
    ...(slide.partners ?? []).map((p) => p.company.toLowerCase()),
  ]);

/** Brand's claim in a language, split around the word brand names for it: [before, word, after],
 *  the word empty where the claim does not hold it. */
export function claimParts(lang: "en" | "de"): [string, string, string] {
  const text = claim[lang];
  const word = claim.word[lang];
  const at = text.indexOf(word);
  return at < 0 ? [text, "", ""] : [text.slice(0, at), word, text.slice(at + word.length)];
}
