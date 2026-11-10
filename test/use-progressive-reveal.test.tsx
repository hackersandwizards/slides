import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProgressiveReveal } from "../lib/use-progressive-reveal";
import { deckSync } from "../lib/presenter-sync";
import { phoneWidth } from "./phone-width";
import { PrintProvider } from "../lib/print-context";

function press(key: "ArrowRight" | "ArrowLeft"): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    cancelable: true,
    bubbles: true,
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event.defaultPrevented;
}
const pressRight = () => press("ArrowRight");
const pressLeft = () => press("ArrowLeft");

afterEach(() => {
  sessionStorage.clear();
});

describe("useProgressiveReveal", () => {
  it("starts with nothing revealed by default", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 3 }));
    expect(result.current.revealedCount).toBe(0);
    expect(result.current.footerVisible).toBe(false);
  });

  it("reveals one more step per ArrowRight, up to totalSteps", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 2 }));
    expect(pressRight()).toBe(true);
    expect(result.current.revealedCount).toBe(1);
    expect(pressRight()).toBe(true);
    expect(result.current.revealedCount).toBe(2);
  });

  it("does not prevent default once everything is revealed and there is no footer", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 1 }));
    pressRight();
    expect(result.current.revealedCount).toBe(1);
    expect(pressRight()).toBe(false);
  });

  it("reveals the footer after the last step when hasFooter is set", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 1, hasFooter: true }));
    expect(result.current.footerVisible).toBe(false);
    expect(pressRight()).toBe(true);
    expect(result.current.revealedCount).toBe(1);
    expect(result.current.footerVisible).toBe(false);
    expect(pressRight()).toBe(true);
    expect(result.current.footerVisible).toBe(true);
    expect(pressRight()).toBe(false);
  });

  it("takes the footer, then each step back with ArrowLeft, then lets it through", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 2, hasFooter: true }));
    pressRight();
    pressRight();
    pressRight();
    expect(result.current.footerVisible).toBe(true);
    expect(pressLeft()).toBe(true);
    expect(result.current.footerVisible).toBe(false);
    expect(result.current.revealedCount).toBe(2);
    expect(pressLeft()).toBe(true);
    expect(result.current.revealedCount).toBe(1);
    expect(pressLeft()).toBe(true);
    expect(result.current.revealedCount).toBe(0);
    expect(pressLeft()).toBe(false);
  });

  it("steps back from a backward arrival", () => {
    sessionStorage.setItem("slide-direction", "back");
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 2 }));
    expect(result.current.revealedCount).toBe(2);
    expect(pressLeft()).toBe(true);
    expect(result.current.revealedCount).toBe(1);
  });

  it("opens fully revealed on a URL carrying ?revealed", () => {
    history.replaceState(null, "", "?revealed");
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 2, hasFooter: true }));
    history.replaceState(null, "", location.pathname);
    expect(result.current.revealedCount).toBe(2);
    expect(result.current.footerVisible).toBe(true);
  });

  it("starts fully revealed when startFull is set", () => {
    const { result } = renderHook(() =>
      useProgressiveReveal({ totalSteps: 3, startFull: true, hasFooter: true }),
    );
    expect(result.current.revealedCount).toBe(3);
    expect(result.current.footerVisible).toBe(true);
  });

  it("starts fully revealed in print mode", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 3, hasFooter: true }), {
      wrapper: PrintProvider,
    });
    expect(result.current.revealedCount).toBe(3);
    expect(result.current.footerVisible).toBe(true);
  });

  // The flag is cleared so a forward re-entry starts collapsed again.
  it("starts fully revealed when the back-navigation flag is set, then clears it", () => {
    sessionStorage.setItem("slide-direction", "back");
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 4 }));
    expect(result.current.revealedCount).toBe(4);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
  });

  it("ignores ArrowRight when there are no steps", () => {
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 0 }));
    expect(pressRight()).toBe(false);
    expect(result.current.revealedCount).toBe(0);
  });

  // A static slide opens with its footer up, which no press revealed: ArrowLeft goes back a slide.
  it("never hides the steps or the footer of a startFull slide", () => {
    const { result } = renderHook(() =>
      useProgressiveReveal({ totalSteps: 2, startFull: true, hasFooter: true }),
    );
    expect(pressLeft()).toBe(false);
    expect(result.current.footerVisible).toBe(true);
    expect(result.current.revealedCount).toBe(2);
  });

  it("steps two reveal blocks on one slide one after the other", () => {
    const { result } = renderHook(() => [
      useProgressiveReveal({ totalSteps: 1 }).revealedCount,
      useProgressiveReveal({ totalSteps: 1 }).revealedCount,
    ]);
    pressRight();
    expect(result.current).toEqual([1, 0]);
    pressRight();
    expect(result.current).toEqual([1, 1]);
    expect(pressRight()).toBe(false);
    pressLeft();
    expect(result.current).toEqual([1, 0]);
    pressLeft();
    expect(result.current).toEqual([0, 0]);
    expect(pressLeft()).toBe(false);
  });
});

describe("on a phone", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows every step at once and lets the arrows through", () => {
    phoneWidth();
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 3, hasFooter: true }));
    expect(result.current.revealedCount).toBe(3);
    expect(result.current.footerVisible).toBe(true);
    expect(pressRight()).toBe(false);
  });

  // The windows of a presented talk replay each other's presses on their own copies of a slide,
  // so a narrow copy that did not step would send the others back (F01).
  it.each([
    ["the speaker window", () => vi.spyOn(deckSync, "role").mockReturnValue("presenter")],
    [
      "an audience window while a speaker window is open",
      () => vi.spyOn(deckSync, "speakerOpen").mockReturnValue(true),
    ],
  ])("steps in %s", (_, present) => {
    phoneWidth();
    present();
    const { result } = renderHook(() => useProgressiveReveal({ totalSteps: 3 }));
    expect(result.current.revealedCount).toBe(0);
    expect(pressRight()).toBe(true);
    expect(result.current.revealedCount).toBe(1);
  });
});
