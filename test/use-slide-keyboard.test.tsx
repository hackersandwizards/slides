import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
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

function observeSlideKeyDelivery() {
  const navigationKeys: string[] = [];
  const errors: string[] = [];
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
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
  return { navigationKeys, errors };
}

function dispatchSlideKeyboardEvent(event: KeyboardEvent) {
  act(() => {
    document.body.dispatchEvent(event);
  });
}

describe("useSlideKeyboard", () => {
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
        useSlideKeyboard(options);
        return [usePendingReveal(), usePendingReveal("behind")];
      },
      { initialProps: { enabled: true, pending: true, undoable: false } },
    );

    expect(result.current).toEqual([true, false]);
    rerender({ enabled: false, pending: true, undoable: true });
    expect(result.current).toEqual([false, false]);
    rerender({ enabled: true, pending: false, undoable: true });
    expect(result.current).toEqual([false, true]);
  });

  it("detaches and reattaches the arrow listener when enabled changes", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    onTestFinished(() => {
      add.mockRestore();
      remove.mockRestore();
    });

    const onRight = () => true;
    const { rerender } = renderHook(({ enabled }) => useSlideKeyboard({ enabled, onRight }), {
      initialProps: { enabled: true },
    });

    expect(press("ArrowRight")).toBe(true);
    rerender({ enabled: false });
    expect(press("ArrowRight")).toBe(false);
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function), true);
    add.mockClear();
    rerender({ enabled: true });
    expect(press("ArrowRight")).toBe(true);
    expect(add).toHaveBeenCalledWith("keydown", expect.any(Function), true);
  });

  // The load-bearing contract: a handler returning false means "I did not
  // consume this" — the event must pass through so the page can navigate.
  it.each([
    {
      key: "ArrowRight",
      handler: "onRight",
      response: undefined,
      consumed: true,
      before: false,
      delivered: [],
    },
    {
      key: "ArrowRight",
      handler: "onRight",
      response: false,
      consumed: false,
      before: false,
      delivered: ["ArrowRight"],
    },
    {
      key: "ArrowLeft",
      handler: "onLeft",
      response: undefined,
      consumed: true,
      before: false,
      delivered: [],
    },
    {
      key: "ArrowLeft",
      handler: "onLeft",
      response: false,
      consumed: false,
      before: false,
      delivered: ["ArrowLeft"],
    },
    {
      key: " ",
      handler: "onSpace",
      response: undefined,
      consumed: true,
      before: true,
      delivered: [],
    },
    {
      key: "Backspace",
      handler: "onBackspace",
      response: undefined,
      consumed: true,
      before: true,
      delivered: [],
    },
  ])("dispatches '$key' when its handler returns $response", (row) => {
    const event = new KeyboardEvent("keydown", { key: row.key, bubbles: true, cancelable: true });
    const { navigationKeys, errors } = observeSlideKeyDelivery();
    const calls: { handler: string; defaultPrevented: boolean }[] = [];
    const record = (handler: string) => () => {
      calls.push({ handler, defaultPrevented: event.defaultPrevented });
      return row.response;
    };
    const onKey = vi.fn();
    renderHook(() =>
      useSlideKeyboard({
        onRight: record("onRight"),
        onLeft: record("onLeft"),
        onSpace: record("onSpace"),
        onBackspace: record("onBackspace"),
        onKey,
      }),
    );
    dispatchSlideKeyboardEvent(event);

    expect(event.defaultPrevented).toBe(row.consumed);
    expect(calls).toEqual([{ handler: row.handler, defaultPrevented: row.before }]);
    expect(navigationKeys).toEqual(row.delivered);
    expect(errors).toEqual([]);
    expect(onKey).not.toHaveBeenCalled();
  });

  it.each([
    { key: "ArrowRight", metaKey: true },
    { key: "Escape", metaKey: false },
  ])("leaves '$key' (metaKey=$metaKey) to the deck", ({ key, metaKey }) => {
    const event = new KeyboardEvent("keydown", { key, metaKey, bubbles: true, cancelable: true });
    const { navigationKeys, errors } = observeSlideKeyDelivery();
    const onAction = vi.fn();
    renderHook(() =>
      useSlideKeyboard({
        onRight: onAction,
        onLeft: onAction,
        onSpace: onAction,
        onBackspace: onAction,
      }),
    );
    dispatchSlideKeyboardEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(navigationKeys).toEqual([key]);
    expect(errors).toEqual([]);
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
