import { cornerMark, resolveSlideLogo } from "../lib/logo";
import { deckLang, pageLabel } from "../lib/slide-utils";
import { slideCatalogue } from "../specimen/slide-catalogue";
import type { Slide } from "../types/slide";
import SlideFrame from "./SlideFrame.astro";

export const state = (type: Slide["type"], nth: number, component: string) => {
  // Astrobook reads a story's args on the server only, so the client bundle leaves out the deck.
  if (!import.meta.env.SSR) return {};
  const slide = slideCatalogue.slides.filter((s) => s.type === type)[nth];
  if (!slide) throw new Error(`the specimen deck has no ${type} slide number ${nth + 1}`);
  const index = slideCatalogue.slides.indexOf(slide);
  return {
    args: {
      slide,
      logo: resolveSlideLogo(slideCatalogue, index),
      theme: slideCatalogue.theme,
      page: pageLabel(slideCatalogue.slides, index),
      mark: cornerMark(slideCatalogue, index),
      lang: deckLang(slideCatalogue),
    },
    decorators: [{ component: SlideFrame, props: { component } }],
  };
};

export const partFrame = (component: string) => ({
  component: SlideFrame,
  props: { component, part: true },
});
