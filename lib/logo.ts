import type { LogoConfig, Presentation, SlideLogo } from "../types/slide";

/** The default logo, and the one a deck names to stand for the h&w corner mark (`HwWordmark`):
 *  the brand package's lockup, which `postinstall` copies into each consumer's `public/`. */
export const HW_LOGO: LogoConfig = { src: "/hw-lockup.svg", alt: "hackers&wizards" };

// Resolve the logo(s) for a given slide. An explicit per-slide entry in
// `slideLogos` wins over the deck-wide `logo` — including a `null`, which means
// "use the default h&w logo on this slide" rather than the deck logo. Returns
// undefined when neither is set. Callers apply their own default-logo fallback
// (the on-screen container and the print watermark use different sizes).
export function resolveSlideLogo(
  presentation: Pick<Presentation, "logo" | "slideLogos">,
  index: number,
): SlideLogo | undefined {
  if (presentation.slideLogos && index in presentation.slideLogos) {
    return presentation.slideLogos[index];
  }
  return presentation.logo;
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
