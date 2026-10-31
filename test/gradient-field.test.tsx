import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

// A title slide carries one gradient field with only the headline on it; the smaller lines stay on
// the ground, and the glow and particles render only on a phone. A section divider carries none.
const cases: { slide: Slide; lead: string; aside: string }[] = [
  {
    slide: { type: "title", title: "Agentic Coding", subtitle: "Two days" },
    lead: "Agentic Coding",
    aside: "Two days",
  },
];

describe("gradient field", () => {
  it.each(cases)(
    "$slide.type slide puts only its headline on the field",
    ({ slide, lead, aside }) => {
      const SlideComponent = slideComponents[slide.type];
      const { container, getByText } = render(<SlideComponent slide={slide} />);
      expect(container.querySelectorAll(".slide-field")).toHaveLength(1);
      expect(getByText(lead).closest(".slide-split-lead")).not.toBeNull();
      expect(getByText(aside).closest(".slide-split-lead")).toBeNull();
      expect(container.querySelector(".slide-classic")).not.toBeNull();
    },
  );
});

describe("section divider", () => {
  it("centres its headline on the ground, with no field and no decoration", () => {
    const slide: Slide = { type: "transition", preText: "Part two", headline: "The pipeline" };
    const { container } = render(<slideComponents.transition slide={slide} />);
    expect(container.querySelector(".slide-field, .slide-split, .slide-classic")).toBeNull();
  });
});
