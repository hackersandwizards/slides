// Named, never the default, as in slide-utils.ts.
import { name } from "@hackersandwizards/brand/verbal.json";
import type { LogoConfig, Presentation, SlideLogo } from "../types/slide";

/** The root paths a deck names the h&w marks by, the file's name as group 1. */
export const BRAND_MARK = /^\/hw-((?:lockup|wordmark)(?:-night)?)\.svg$/;

/** The default logo, and the one a deck names to stand for the h&w corner mark (`HwWordmark`). Its
 *  `src` is a name, not a file: `Image` draws it from brand's exports, `slides-pptx` its PNG cut. */
export const HW_LOGO: LogoConfig = { src: "/hw-lockup.svg", alt: name.company };

/** A slide's entry in `slideLogos` wins over the deck's `logo`, a `null` included, which means the
 *  default h&w logo; undefined when neither is set, since each caller draws its own default size. */
export function resolveSlideLogo(
  presentation: Pick<Presentation, "logo" | "slideLogos">,
  index: number,
): SlideLogo | undefined {
  if (presentation.slideLogos && index in presentation.slideLogos) {
    return presentation.slideLogos[index];
  }
  return presentation.logo;
}

/** Where a slide's logos stand, on screen, in print and in `slides-pptx`: a list's last logo in the
 *  corner and the others at the bottom left; none, `null` or an empty list, the h&w mark. */
export function logoPlaces(logo: SlideLogo | undefined): {
  corner: LogoConfig;
  start: LogoConfig[];
} {
  const logos = Array.isArray(logo) ? logo : [logo ?? HW_LOGO];
  return { corner: logos.at(-1) ?? HW_LOGO, start: logos.slice(0, -1) };
}

/** The h&w corner mark: the lockup, wizard and wordmark, on a title and a closing slide, the
 *  wordmark alone on every other slide. */
export function cornerMark(
  presentation: Pick<Presentation, "slides">,
  index: number,
): "lockup" | "wordmark" {
  const type = presentation.slides[index]?.type;
  return type === "title" || type === "closing" ? "lockup" : "wordmark";
}
