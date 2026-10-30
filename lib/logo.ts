import type { Presentation, SlideLogo } from "../types/slide";

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
