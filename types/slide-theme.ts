export type SectionTheme = "primary" | "secondary" | "accent" | "warning" | "success" | "deepdive";

/** A slide's ground: the brand page, or the page tinted 7% towards a section's hue. */
export type SlideGround = "intro" | "primary" | "secondary" | "accent" | "success";

/** The ground of a slide type that may stand on a section's tint. */
export interface Grounded {
  ground?: SlideGround;
  /** @deprecated `ground`: `bg-section-accent` is `ground: "accent"`. Read until every deck has
   *  moved; any other class draws the plain page. */
  background?: `bg-section-${SlideGround}`;
}
