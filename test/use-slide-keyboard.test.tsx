import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSlideKeyboard } from "../lib/use-slide-keyboard";
import { usePendingReveal } from "../lib/use-progressive-reveal";

// Dispatch a cancelable keydown on window (capture phase) and report whether
// the hook called preventDefault — the signal that it "owned" the key.
function press(key: string): boolean {
  const event = new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true });
  act(() => {
    window.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

describe("useSlideKeyboard", () => {
  it("calls onRight and prevents default when the handler returns void", () => {
    const onRight = vi.fn();
    renderHook(() => useSlideKeyboard({ onRight }));
    expect(press("ArrowRight")).toBe(true);
    expect(onRight).toHaveBeenCalledOnce();
  });

  // The load-bearing contract: a handler returning false means "I did not
  // consume this" — the event must pass through so the page can navigate.
  it("does not prevent default when onRight returns false", () => {
    const onRight = vi.fn(() => false);
    renderHook(() => useSlideKeyboard({ onRight }));
    expect(press("ArrowRight")).toBe(false);
    expect(onRight).toHaveBeenCalledOnce();
  });

  it("calls onLeft and prevents default, but passes through when it returns false", () => {
    const handled = vi.fn();
    const { rerender } = renderHook(
      (opts: Parameters<typeof useSlideKeyboard>[0]) => useSlideKeyboard(opts),
      { initialProps: { onLeft: handled } },
    );
    expect(press("ArrowLeft")).toBe(true);

    const passthrough = vi.fn(() => false);
    rerender({ onLeft: passthrough });
    expect(press("ArrowLeft")).toBe(false);
  });

  it("calls onSpace and prevents default", () => {
    const onSpace = vi.fn();
    renderHook(() => useSlideKeyboard({ onSpace }));
    expect(press(" ")).toBe(true);
    expect(onSpace).toHaveBeenCalledOnce();
  });

  it("calls onBackspace and prevents default", () => {
    const onBackspace = vi.fn();
    renderHook(() => useSlideKeyboard({ onBackspace }));
    expect(press("Backspace")).toBe(true);
    expect(onBackspace).toHaveBeenCalledOnce();
  });

  it("routes other keys to onKey without preventing default", () => {
    const onKey = vi.fn();
    renderHook(() => useSlideKeyboard({ onKey }));
    expect(press("h")).toBe(false);
    expect(onKey).toHaveBeenCalledWith("h");
  });

  it("ignores all keys when enabled is false", () => {
    const onRight = vi.fn();
    const onKey = vi.fn();
    renderHook(() => useSlideKeyboard({ onRight, onKey, enabled: false }));
    expect(press("ArrowRight")).toBe(false);
    expect(onRight).not.toHaveBeenCalled();
    expect(onKey).not.toHaveBeenCalled();
  });

  it("uses the latest handler without re-subscribing the listener", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      (opts: Parameters<typeof useSlideKeyboard>[0]) => useSlideKeyboard(opts),
      { initialProps: { onRight: first } },
    );
    press("ArrowRight");
    rerender({ onRight: second });
    press("ArrowRight");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("removes the listener on unmount", () => {
    const onRight = vi.fn();
    const { unmount } = renderHook(() => useSlideKeyboard({ onRight }));
    unmount();
    expect(press("ArrowRight")).toBe(false);
    expect(onRight).not.toHaveBeenCalled();
  });

  it("updates the next and previous hints as a keyboard stepper is disabled or re-enabled", () => {
    const { result, rerender } = renderHook(
      (options) => {
        useSlideKeyboard({ ...options, onRight: () => true });
        return [usePendingReveal(), usePendingReveal("behind")];
      },
      { initialProps: { enabled: true, pending: true, undoable: false } },
    );

    expect(result.current).toEqual([true, false]);
    expect(press("ArrowRight")).toBe(true);
    rerender({ enabled: false, pending: true, undoable: true });
    expect(result.current).toEqual([false, false]);
    expect(press("ArrowRight")).toBe(false);
    rerender({ enabled: true, pending: false, undoable: true });
    expect(result.current).toEqual([false, true]);
    expect(press("ArrowRight")).toBe(true);
  });

  it("keeps handled keys away from the deck while leaving a browser shortcut and other keys alone", () => {
    const stepped: string[] = [];
    const navigationKeys: string[] = [];
    const errors: string[] = [];
    const controller = new AbortController();
    document.addEventListener("keydown", (event) => navigationKeys.push(event.key), {
      signal: controller.signal,
    });
    window.addEventListener(
      "error",
      (event) => {
        errors.push(event.message);
        event.preventDefault();
      },
      { signal: controller.signal },
    );
    renderHook(() =>
      useSlideKeyboard({
        onRight: () => void stepped.push("right"),
        onLeft: () => void stepped.push("left"),
        onSpace: () => void stepped.push("space"),
        onBackspace: () => void stepped.push("backspace"),
      }),
    );
    const fromSlide = (key: string, metaKey = false) => {
      const event = new KeyboardEvent("keydown", { key, metaKey, bubbles: true, cancelable: true });
      act(() => {
        document.body.dispatchEvent(event);
      });
      return event.defaultPrevented;
    };

    try {
      expect(fromSlide("ArrowRight", true)).toBe(false);
      expect(fromSlide("Escape")).toBe(false);
      expect(errors).toEqual([]);
      expect(fromSlide("ArrowRight")).toBe(true);
      expect(fromSlide("ArrowLeft")).toBe(true);
      expect(fromSlide(" ")).toBe(true);
      expect(fromSlide("Backspace")).toBe(true);
      expect(stepped).toEqual(["right", "left", "space", "backspace"]);
      expect(navigationKeys).toEqual(["ArrowRight", "Escape"]);
    } finally {
      controller.abort();
    }
  });

  it("passes keys with no dedicated handler to the fallback without consuming them", () => {
    const keys: string[] = [];
    renderHook(() => useSlideKeyboard({ onKey: (key) => keys.push(key) }));

    for (const key of ["ArrowRight", "ArrowLeft", " ", "Backspace"]) {
      expect(press(key)).toBe(false);
    }
    expect(keys).toEqual(["ArrowRight", "ArrowLeft", " ", "Backspace"]);
  });
});
