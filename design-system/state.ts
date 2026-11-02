// A story's state: the nth slide of a type in the specimen deck, the engine's regression deck, so
// the design system shows the slides the specimen page and talks show. A part's story shows its
// sheet of variants (parts.ts).
import { slideCatalogue } from "../specimen/slide-catalogue";
import type { Slide } from "../types/slide";
import SlideFrame from "./SlideFrame.astro";

export const state = (type: Slide["type"], nth: number, component: string) => {
  const slide = slideCatalogue.slides.filter((s) => s.type === type)[nth];
  if (!slide) throw new Error(`the specimen deck has no ${type} slide number ${nth + 1}`);
  return { args: { slide }, decorators: [{ component: SlideFrame, props: { component } }] };
};

export const partFrame = (component: string) => ({
  component: SlideFrame,
  props: { component, part: true },
});
