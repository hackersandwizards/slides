import { slideFrame } from "../lib/slide-utils";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import slidesCss from "../styles/slides.css?url";
import SlideFrame from "./SlideFrame.astro";

export const state = (type: Slide["type"], nth: number, component: string) => {
  // Astrobook reads a story's args on the server only, so the client bundle leaves out the deck.
  if (!import.meta.env.SSR) return {};
  const slide = slideCatalog.slides.filter((s) => s.type === type)[nth];
  if (!slide) throw new Error(`the specimen deck has no ${type} slide number ${nth + 1}`);
  const index = slideCatalog.slides.indexOf(slide);
  return {
    args: { slide, ...slideFrame(slideCatalog, index) },
    decorators: [{ component: SlideFrame, props: { component, css: slidesCss } }],
  };
};

export const partFrame = (component: string) => ({
  component: SlideFrame,
  props: { component, part: true, css: slidesCss },
});
