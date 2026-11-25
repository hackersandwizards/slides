import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import { ignoredFields } from "../scripts/usage";
import { slideCatalog } from "../specimen/slide-catalog";
import { SECTION_STYLES } from "../lib/section-styles";
import type { SectionTheme, Slide } from "../types/slide";

const markup = (slide: Slide) => {
  const Component = slideComponents[slide.type];
  const { container, unmount } = render(<Component slide={slide} />);
  const html = container.innerHTML;
  unmount();
  return html;
};
const without = (slide: Slide): Slide => {
  const { sectionTheme: _, ...rest } = slide as Slide & { sectionTheme?: string };
  return rest as Slide;
};

// slides-usage calls a section's colour dead where removing it leaves the slide as it was: each
// colour planted on each specimen slide that may take one, drawn with and without it, proves or
// refutes the rule both ways.
describe("a section colour slides-usage names as drawing nothing", () => {
  const themes = (Object.keys(SECTION_STYLES) as SectionTheme[]).filter((t) => t !== "deepdive");
  // The specimen has no centred slide with a footer or a principle: one is planted.
  const centred = {
    type: "content",
    layout: "centered",
    headline: "h",
    footer: "f",
    principle: "p",
    content: [{ type: "paragraph", text: "t" }],
  } as Slide;
  const bases = [...slideCatalog.slides, centred]
    .filter((s) => ["content", "grid", "media", "lanes", "gantt"].includes(s.type))
    .map(without);
  const themedSlides = (base: Slide) =>
    themes.map((sectionTheme) => ({ ...base, sectionTheme }) as Slide);
  const named = (s: Slide) => ignoredFields(s).some((f) => f.startsWith("sectionTheme"));

  it.each(bases)("$type [%#] changes the drawing only where the colour is live", (base) => {
    const plain = markup(base);
    for (const slide of themedSlides(base)) {
      expect(markup(slide) !== plain, slide.type).toBe(!named(slide));
    }
  });

  it("names some section colours as dead and leaves others live", () => {
    const slides = bases.flatMap(themedSlides);
    const dead = slides.filter(named).length;
    const live = slides.length - dead;
    expect(dead).toBeGreaterThan(20);
    expect(live).toBeGreaterThan(5);
  });
});
