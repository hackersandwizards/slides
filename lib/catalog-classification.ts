import { isOpening } from "./title-slide";
import type { Slide } from "../types/slide";

/** A catalogue entry's anchor from its name. */
export const anchorSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type SlideOf<T extends Slide["type"]> = Extract<Slide, { type: T }>;

const DECLARED_VARIANT = [
  (slide: Slide) => "variant" in slide && slide.variant,
  (slide: Slide) => "layout" in slide && slide.layout,
  (slide: Slide) => "kind" in slide && slide.kind,
];

const DERIVED_VARIANT = {
  statement: (slide: SlideOf<"statement">) =>
    slide.attribution ? "quotation" : slide.qr ? "qr" : "",
  title: (slide: SlideOf<"title">) => (isOpening(slide) ? "opening" : ""),
} as const;

type DerivedVariant = ReturnType<(typeof DERIVED_VARIANT)[keyof typeof DERIVED_VARIANT]>;

/** The variant a slide is catalogued under; empty for a type's plain form. */
export function variantOf(slide: Slide) {
  if (slide.type === "grid" && slide.variant === "quotes" && slide.cards.every((c) => c.imageSrc))
    return "quotes with portraits";
  for (const read of DECLARED_VARIANT) {
    const value = read(slide);
    if (value) return value;
  }
  if ("strike" in slide && slide.strike === false) return "without strike";

  const type = slide.type;
  if (typeof type !== "string" || !Object.hasOwn(DERIVED_VARIANT, type)) return "";
  const derive = DERIVED_VARIANT[type as keyof typeof DERIVED_VARIANT] as (
    input: Slide,
  ) => DerivedVariant;
  return derive(slide);
}
