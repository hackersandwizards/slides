import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlideNavigation } from "../components/slides/SlideNavigation";

const goToSlide = vi.fn();
vi.mock("../lib/navigate", () => ({ useGoToSlide: () => goToSlide }));

const press = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
    );
  });

afterEach(() => goToSlide.mockClear());

describe("SlideNavigation clicker keys", () => {
  it.each([["PageDown"], [" "]])("%j advances like ArrowRight", (key) => {
    render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
    press(key);
    expect(goToSlide).toHaveBeenCalledWith("/d/2", "forward");
  });

  it.each([
    ["PageUp", {}],
    [" ", { shiftKey: true }],
  ])("%j goes back like ArrowLeft", (key, init) => {
    render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
    press(key, init);
    expect(goToSlide).toHaveBeenCalledWith("/d/0", "back");
  });

  it("lets a capture-phase reveal consume a clicker step, as it does an arrow", () => {
    const reveal = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") e.stopPropagation();
    };
    window.addEventListener("keydown", reveal, true);
    render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
    press("PageDown");
    window.removeEventListener("keydown", reveal, true);
    expect(goToSlide).not.toHaveBeenCalled();
  });

  it("toggles the key overlay with ?", () => {
    render(<SlideNavigation currentIndex={0} totalSlides={3} basePath="/d" />);
    press("?");
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    press("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
