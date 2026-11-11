import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";
import { wholeText } from "./fixtures/whole-text";
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
      expect(getAllByText(wholeText(text))).toHaveLength(2);
    }
  });

  it("draws the desktop need, question and outcome as the cards the phone draws", () => {
    const SlideComponent = slideComponents.decision;
    const { container } = render(<SlideComponent slide={decisionSlide as Slide} />);
    const { need, question, outcome } = decisionSlide;
    const grid = container.querySelector(".decision-grid")!;
    for (const text of [need, question, outcome]) {
      const box = [...grid.children].find((el) => el.textContent === text)!;
      expect(box.matches('.hw-card, [data-hw-exception="card-tone"]')).toBe(true);
    }
  });
});
