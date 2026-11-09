import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";
import { decisionSlide } from "./fixtures/decision";

describe("DecisionSlide", () => {
  it("renders the need, the question, both branches and the outcome in both layouts", () => {
    const SlideComponent = slideComponents.decision;
    const { getAllByText } = render(<SlideComponent slide={decisionSlide as Slide} />);
    const { need, question, yes, no, outcome } = decisionSlide;
    for (const text of [
      need,
      question,
      outcome,
      ...[yes, no].flatMap((b) => [b.label, b.title, b.text]),
    ]) {
      // In the stacked phone flow and the desktop grid; CSS shows one of them.
      // A compound sits in its own span, so match the innermost element holding the whole text.
      const holds = (el: Element | null) => el?.textContent === text;
      expect(
        getAllByText((_, el) => holds(el) && ![...(el?.children ?? [])].some(holds)),
      ).toHaveLength(2);
    }
  });
});
