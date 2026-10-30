import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SlideHints } from "../components/slides/SlideHints";
import { slideComponents } from "../lib/slide-components";
import type { GridSlide, Slide } from "../types/slide";

function pressRight() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
  });
}

const grid: GridSlide = {
  type: "grid",
  headline: "Three pillars",
  cards: [{ title: "One" }, { title: "Two" }, { title: "Three" }],
};

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("SlideHints", () => {
  it("shows no reveal hint on a slide without reveal steps", () => {
    const { queryByText } = render(<SlideHints slideIndex={3} />);
    expect(queryByText("to reveal")).toBeNull();
  });

  it("shows the reveal hint exactly while a step is pending, and lights the last card", () => {
    const Grid = slideComponents.grid;
    const { queryByText, container } = render(
      <>
        <Grid slide={grid as Slide} />
        <SlideHints slideIndex={3} />
      </>,
    );
    const lit = () => container.querySelectorAll(".scale-110").length;
    expect(queryByText("to reveal")).not.toBeNull();
    pressRight();
    pressRight();
    expect(queryByText("to reveal")).not.toBeNull();
    pressRight();
    // The last step: nothing pending, and the card it revealed is lit like the ones before it.
    expect(queryByText("to reveal")).toBeNull();
    expect(lit()).toBe(1);
  });
});
