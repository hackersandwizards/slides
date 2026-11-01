import { act, render } from "@testing-library/react";
import { useInsertionEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlideHints } from "../components/slides/SlideHints";
import { slideComponents } from "../lib/slide-components";
import type { GridSlide, Slide } from "../types/slide";

function pressRight() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
  });
}

function MoveTo({ path }: { path: string }) {
  useInsertionEffect(() => history.pushState(null, "", path), [path]);
  return null;
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

  it("shows the first-slide hints again when the page moves on to another deck", async () => {
    vi.useFakeTimers();
    try {
      // From the deck list to deck A, past its intro, back to the list, on to deck B. Next's router
      // moves the URL in an insertion effect after the new page renders, as `MoveTo` does here.
      const first = render(
        <>
          <MoveTo path="/deck-a/0" />
          <SlideHints slideIndex={0} />
        </>,
      );
      act(() => vi.advanceTimersByTime(5000));
      first.unmount();
      history.pushState(null, "", "/");
      const second = render(
        <>
          <MoveTo path="/deck-b/0" />
          <SlideHints slideIndex={0} />
        </>,
      );
      await act(async () => {});
      expect(second.queryByText("to go to next slide")).not.toBeNull();
    } finally {
      vi.useRealTimers();
      history.pushState(null, "", "/");
    }
  });
});
