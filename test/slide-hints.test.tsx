import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  history.replaceState(null, "", "/");
  sessionStorage.clear();
  localStorage.clear();
});

describe("SlideHints", () => {
  it("shows no reveal hint on a slide without reveal steps", () => {
    const { queryByText } = render(<SlideHints slideIndex={3} />);
    expect(queryByText("to reveal")).toBeNull();
  });

  it("shows the reveal hint exactly while a step is pending", () => {
    const Grid = slideComponents.grid;
    const { queryByText } = render(
      <>
        <Grid slide={grid as Slide} />
        <SlideHints slideIndex={3} />
      </>,
    );
    expect(queryByText("to reveal")).not.toBeNull();
    pressRight();
    pressRight();
    expect(queryByText("to reveal")).not.toBeNull();
    pressRight();
    expect(queryByText("to reveal")).toBeNull();
  });

  // A deck of its own, so the first-slide intro is still open.
  it("shows no hints on ?revealed", () => {
    history.replaceState(null, "", "/revealed-deck/0?revealed");
    const { container } = render(<SlideHints slideIndex={0} />);
    expect(container.textContent).toBe("");
  });

  it("shows the first-slide hints for the opening seconds only, and not again on a return", () => {
    vi.useFakeTimers();
    try {
      const first = render(<SlideHints slideIndex={0} />);
      expect(first.queryByText("to go to next slide")).not.toBeNull();
      act(() => vi.advanceTimersByTime(5000));
      // The title slide in front of the audience carries no key hints.
      expect(first.queryByText("to go to next slide")).toBeNull();
      first.unmount();
      // A slide change remounts the hints: back on the first slide they stay away.
      const back = render(<SlideHints slideIndex={0} />);
      expect(back.queryByText("to go to next slide")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the first-slide hints again when the page moves on to another deck", () => {
    vi.useFakeTimers();
    try {
      history.pushState(null, "", "/deck-a/0");
      const first = render(<SlideHints slideIndex={0} />);
      act(() => vi.advanceTimersByTime(5000));
      first.unmount();
      history.pushState(null, "", "/deck-b/0");
      const second = render(<SlideHints slideIndex={0} />);
      expect(second.queryByText("to go to next slide")).not.toBeNull();
    } finally {
      vi.useRealTimers();
      history.pushState(null, "", "/");
    }
  });
});
