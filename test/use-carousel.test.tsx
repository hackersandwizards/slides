import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCarousel } from "../lib/use-carousel";

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
    expect(pressKey("ArrowRight")).toBe(true);
    expect(result.current[0]).toBe(1);
    expect(pressKey("ArrowRight")).toBe(false);
    expect(result.current[0]).toBe(1);
  });

  it("passes the key through at the left edge (min)", () => {
    const { result } = renderHook(() => useCarousel({ count: 3 }));
    expect(pressKey("ArrowLeft")).toBe(false);
    expect(result.current[0]).toBe(0);
  });

  it("honors a negative min (nothing-highlighted-yet carousels)", () => {
    const { result } = renderHook(() => useCarousel({ count: 2, min: -1 }));
    expect(result.current[0]).toBe(-1);
    expect(pressKey("ArrowLeft")).toBe(false);
    expect(pressKey("ArrowRight")).toBe(true);
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
  // windows of a deck agree on where it stands.
  it("opens at the last step on a backward arrival and consumes the flag", () => {
    sessionStorage.setItem("slide-direction", "back");
    const { result } = renderHook(() => useCarousel({ count: 3, min: -1 }));
    expect(result.current[0]).toBe(2);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
    expect(pressKey("ArrowLeft")).toBe(true);
    expect(result.current[0]).toBe(1);
  });

  it("opens at the last step on a URL carrying ?revealed", () => {
    history.replaceState(null, "", "?revealed");
    const { result } = renderHook(() => useCarousel({ count: 3 }));
    history.replaceState(null, "", location.pathname);
    expect(result.current[0]).toBe(2);
  });
});
