import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCarousel } from "../lib/use-carousel";

// Dispatch a cancelable arrow keydown and report both the resulting index and
// whether the event was consumed (defaultPrevented). The pass-through signal is
// load-bearing: at the ends the carousel must NOT consume the key, so the deck
// advances to the next/previous slide.
function pressKey(key: string): boolean {
  const event = new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true });
  act(() => {
    window.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

describe("useCarousel", () => {
  it("starts at min by default and steps right, consuming the key", () => {
    const { result } = renderHook(() => useCarousel({ count: 3 }));
    expect(result.current[0]).toBe(0);
    expect(pressKey("ArrowRight")).toBe(true);
    expect(result.current[0]).toBe(1);
  });

  it("passes the key through at the right edge so the deck can advance", () => {
    const { result } = renderHook(() => useCarousel({ count: 2 }));
    expect(pressKey("ArrowRight")).toBe(true); // 0 -> 1
    expect(result.current[0]).toBe(1);
    expect(pressKey("ArrowRight")).toBe(false); // at end: pass through
    expect(result.current[0]).toBe(1);
  });

  it("passes the key through at the left edge (min)", () => {
    const { result } = renderHook(() => useCarousel({ count: 3 }));
    expect(pressKey("ArrowLeft")).toBe(false); // already at min 0
    expect(result.current[0]).toBe(0);
  });

  it("honors a negative min (nothing-highlighted-yet carousels)", () => {
    const { result } = renderHook(() => useCarousel({ count: 2, min: -1 }));
    expect(result.current[0]).toBe(-1);
    expect(pressKey("ArrowLeft")).toBe(false); // at min -1: pass through
    expect(pressKey("ArrowRight")).toBe(true); // -1 -> 0
    expect(result.current[0]).toBe(0);
  });

  it("respects an explicit initial index", () => {
    const { result } = renderHook(() => useCarousel({ count: 4, initial: 2 }));
    expect(result.current[0]).toBe(2);
  });

  it("ignores arrow keys when disabled", () => {
    const { result } = renderHook(() => useCarousel({ count: 3, enabled: false }));
    expect(pressKey("ArrowRight")).toBe(false);
    expect(result.current[0]).toBe(0);
  });

  // Arriving backwards opens at the last step, so ArrowLeft steps back through the slide and the
  // windows of a deck agree on where it stands (engine-carousel-back).
  it("opens at the last step on a backward arrival and consumes the flag", () => {
    sessionStorage.setItem("slide-direction", "back");
    const { result } = renderHook(() => useCarousel({ count: 3, min: -1 }));
    expect(result.current[0]).toBe(2);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
    expect(pressKey("ArrowLeft")).toBe(true);
    expect(result.current[0]).toBe(1);
  });
});
