import { act, render, screen, fireEvent } from "@testing-library/react";
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
    fireEvent(screen.getByRole("dialog"), new Event("close"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  const openOverlay = () => {
    const view = render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
    press("?");
    return { ...view, dialog: screen.getByRole("dialog") };
  };

  it("closes the overlay with a second ?", () => {
    openOverlay();
    press("?");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes no swipe made on the open overlay", () => {
    const { dialog } = openOverlay();
    fireEvent.touchStart(dialog, { touches: [{ clientX: 300, clientY: 10 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 100, clientY: 10 }] });
    expect(goToSlide).not.toHaveBeenCalled();
  });

  // jsdom's rectangles are all zero, so a click at (1, 1) lies outside the panel and one at (0, 0)
  // on its edge, inside.
  it("closes the overlay only on a press and release both on the backdrop", () => {
    const { dialog } = openOverlay();
    fireEvent.mouseDown(dialog, { clientX: 0, clientY: 0 });
    fireEvent.click(dialog, { clientX: 1, clientY: 1 });
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.mouseDown(dialog, { clientX: 1, clientY: 1 });
    fireEvent.click(dialog, { clientX: 1, clientY: 1 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not reopen the overlay on a render between Esc and its close event", () => {
    const { dialog, rerender } = openOverlay();
    dialog.removeAttribute("open");
    rerender(<SlideNavigation currentIndex={2} totalSlides={3} basePath="/d" />);
    expect(dialog.hasAttribute("open")).toBe(false);
  });
});
