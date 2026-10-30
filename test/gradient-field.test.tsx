import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

// Title and transition slides carry one gradient field with only the headline on it; the smaller
// lines stay on the ground, and the glow and particles render only for a delivered deck.
const cases: { slide: Slide; lead: string; aside: string }[] = [
  {
    slide: { type: "title", title: "Agentic Coding", subtitle: "Two days" },
    lead: "Agentic Coding",
    aside: "Two days",
  },
  {
    slide: { type: "transition", preText: "Part two", headline: "The pipeline", subtitle: "Next" },
    lead: "The pipeline",
    aside: "Part two",
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
