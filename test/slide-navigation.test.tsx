import { act, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, assert, describe, expect, it, onTestFinished, vi } from "vitest";
import { SlideNavigation } from "../components/slides/SlideNavigation";
import { useProgressiveReveal } from "../lib/use-progressive-reveal";

const goToSlide = vi.fn<typeof import("../lib/navigate").goToSlide>();
vi.mock("../lib/navigate", () => ({
  goToSlide: (...args: Parameters<typeof goToSlide>) => goToSlide(...args),
}));

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
    function RevealStep() {
      const { revealedCount } = useProgressiveReveal({ totalSteps: 1 });
      return <output>{revealedCount}</output>;
    }
    render(
      <>
        <RevealStep />
        <SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />
      </>,
    );
    press("PageDown");
    expect(screen.getByRole("status")).toHaveTextContent("1");
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

  it("lets a target stop the second ? before it reaches the window", () => {
    const { dialog } = openOverlay();
    dialog.addEventListener("keydown", (event) => event.stopPropagation(), { once: true });
    fireEvent.keyDown(dialog, { key: "?" });
    expect(screen.getByRole("dialog")).toBe(dialog);
  });

  it("closes on a bubbled ? without preventing its default", () => {
    const { dialog } = openOverlay();
    const event = new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    fireEvent(dialog, event);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(event.defaultPrevented).toBe(false);
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

  it("toggles fullscreen on F", () => {
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.resolve());
    const fullscreenElement = vi.fn<() => Element | null>().mockReturnValue(null);
    assert(!Object.hasOwn(document.documentElement, "requestFullscreen"));
    assert(!Object.hasOwn(document, "exitFullscreen"));
    assert(!Object.hasOwn(document, "fullscreenElement"));
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: request,
    });
    Object.defineProperties(document, {
      exitFullscreen: { configurable: true, value: exit },
      fullscreenElement: { configurable: true, get: fullscreenElement },
    });
    onTestFinished(() => {
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
      Reflect.deleteProperty(document, "exitFullscreen");
      Reflect.deleteProperty(document, "fullscreenElement");
    });
    render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
    press("f");
    expect(request).toHaveBeenCalledTimes(1);
    fullscreenElement.mockReturnValue(document.documentElement);
    press("F");
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it.each([
    { startX: 300, endX: 100, path: "/d/2", direction: "forward" },
    { startX: 100, endX: 300, path: "/d/0", direction: "back" },
  ] as const)(
    "swipes horizontally from $startX to $endX to navigate $path ($direction)",
    ({ startX, endX, path, direction }) => {
      render(<SlideNavigation currentIndex={1} totalSlides={3} basePath="/d" />);
      fireEvent.touchStart(window, { touches: [{ clientX: startX, clientY: 10 }] });
      fireEvent.touchEnd(window, { changedTouches: [{ clientX: endX, clientY: 10 }] });
      expect(goToSlide).toHaveBeenCalledWith(path, direction);
    },
  );
});
