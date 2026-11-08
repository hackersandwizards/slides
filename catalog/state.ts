import { cornerMark, resolveSlideLogo } from "../lib/logo";
import { deckLang, pageLabel } from "../lib/slide-utils";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import SlideFrame from "./SlideFrame.astro";

export const state = (type: Slide["type"], nth: number, component: string) => {
  // Astrobook reads a story's args on the server only, so the client bundle leaves out the deck.
  if (!import.meta.env.SSR) return {};
  const slide = slideCatalog.slides.filter((s) => s.type === type)[nth];
  if (!slide) throw new Error(`the specimen deck has no ${type} slide number ${nth + 1}`);
  const index = slideCatalog.slides.indexOf(slide);
  return {
    args: {
      slide,
      logo: resolveSlideLogo(slideCatalog, index),
      theme: slideCatalog.theme,
      page: pageLabel(slideCatalog.slides, index),
      mark: cornerMark(slideCatalog, index),
      lang: deckLang(slideCatalog),
    },
    decorators: [{ component: SlideFrame, props: { component } }],
  };
};

export const partFrame = (component: string) => ({
  component: SlideFrame,
  props: { component, part: true },
});
