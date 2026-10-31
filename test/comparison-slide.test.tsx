import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { ComparisonSlide, Slide } from "../types/slide";

const slide = (left: string[], right: string[]): ComparisonSlide => ({
  type: "comparison",
  headline: "Chat or agent",
  variant: "vs",
  left: { label: "Chat", items: left },
  right: { label: "Agent", items: right },
});

function rules(s: ComparisonSlide): number {
  const SlideComponent = slideComponents.comparison;
  const { container } = render(<SlideComponent slide={s as Slide} />);
  return container.querySelectorAll(".border-t").length;
}

describe("ComparisonSlide", () => {
  // A "- " item is a minus item. The rule separates minus items from plus items, so a side of
  // minus items alone renders like a side of plus items alone: no rule under its label.
  it("draws no rule on a side that holds only minus items", () => {
    expect(rules(slide(["- Copy and paste", "- No repository context"], ["Edits files"]))).toBe(0);
  });

  it("draws the rule between plus and minus items on one side", () => {
    expect(rules(slide(["Fast", "- No repository context"], ["Edits files"]))).toBe(1);
  });

  // Arriving backwards opens the slide at its last step: the right side lit, no step left.
  it("opens at the last step when the slide is entered backwards", () => {
    sessionStorage.setItem("slide-direction", "back");
    const SlideComponent = slideComponents.comparison;
    const { getByText } = render(
      <SlideComponent slide={slide(["Fast"], ["Edits files"]) as Slide} />,
    );
    sessionStorage.removeItem("slide-direction");
    expect(getByText("Agent").parentElement?.className).toContain("border-primary bg-primary/7");
  });

  // The flag is consumed, so a reload of the same slide opens at step 0.
  it("clears the backward-arrival flag after mount", () => {
    sessionStorage.setItem("slide-direction", "back");
    const SlideComponent = slideComponents.comparison;
    render(<SlideComponent slide={slide(["Fast"], ["Edits files"]) as Slide} />);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
  });
});
