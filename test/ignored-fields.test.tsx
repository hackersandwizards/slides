import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
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
  const named = (s: Slide) => ignoredFields(s).some((f) => f.startsWith("sectionTheme"));

  it("changes nothing where it is named, and the drawing everywhere else", () => {
    let dead = 0;
    let live = 0;
    for (const base of bases) {
      const plain = markup(base);
      for (const sectionTheme of themes) {
        const slide = { ...base, sectionTheme } as Slide;
        if (named(slide)) dead++;
        else live++;
        if (named(slide)) expect(markup(slide), slide.type).toBe(plain);
        else expect(markup(slide), slide.type).not.toBe(plain);
      }
    }
    // Controls: both sides hold cases.
    expect(dead).toBeGreaterThan(20);
    expect(live).toBeGreaterThan(5);
  });
});
