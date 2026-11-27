import type { TitleSlide } from "../types/slide";

type Profile = { linkedIn?: string; github?: string };

export function profileLinks({ linkedIn, github }: Profile) {
  const links = [
    { url: linkedIn, variant: "linkedin" },
    { url: github, variant: "github" },
  ] as const;
  return links.flatMap(({ url, variant }) => (url ? [{ url, variant }] : []));
}

export const profileUrls = (profile: Profile): string[] =>
  profileLinks(profile).map(({ url }) => url);

/** The alt text of a slide's QR code, in the deck's language. */
export function qrAlt(href: string, lang?: TitleSlide["lang"]): string {
  return `${lang === "de" ? "QR-Code" : "QR code"}: ${linkLabel(href)}`;
}

/** A link as a slide spells it out under a linked image, where a projected or printed slide hides
 *  the link itself: without its scheme, `www.` and a closing slash. */
export function linkLabel(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** A LinkedIn or GitHub profile as a slide spells it out, short enough for one line: `in/name`,
 *  `name`. */
export function profileLabel(href: string): string {
  return linkLabel(href.replace(/[?#].*$/, "")).replace(
    /^(([a-z]{2,3}\.)?linkedin\.com|github\.com)\//,
    "",
  );
}
