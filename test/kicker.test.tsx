import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

const draw = (slide: Slide) => {
  const Component = slideComponents[slide.type];
  return render(<Component slide={slide} />).container;
};

// os decisions br-slide-kicker-colour (always teal, which a night slide maps to teal-night),
// br-label-style (the website's mono caps) and br-gradient-behind-content (no tint behind text).
describe("the kicker above a slide title", () => {
  const slides: Slide[] = [
    { type: "content", headline: "H", sectionLabel: "K", sectionTheme: "secondary", content: [] },
    { type: "content", headline: "H", sectionLabel: "K", sectionTheme: "deepdive", content: [] },
    { type: "grid", headline: "H", sectionLabel: "K", sectionTheme: "accent", cards: [] },
    { type: "deep-dive-divider", headline: "H", partLabel: "Part two", kicker: "K" },
    { type: "transition", headline: "H", preText: "Stepping Back" },
  ] as Slide[];

  it.each(slides.map((s) => [`${s.type} ${"sectionTheme" in s ? s.sectionTheme : ""}`, s]))(
    "%s is teal mono caps on an untinted ground",
    (_, slide) => {
      const container = draw(slide as Slide);
      const kicker = [...container.querySelectorAll(".label-caps")].find((el) =>
        /^(K|Part two · K|Stepping Back)$/.test(el.textContent ?? ""),
      );
      expect(kicker?.className).toContain("text-primary");
      expect(container.querySelector('[class*="from-primary/7"]')).toBeNull();
    },
  );
});
