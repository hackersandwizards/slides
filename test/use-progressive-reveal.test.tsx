import { act, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasPendingReveal,
  usePendingReveal,
  useProgressiveReveal,
  useReportPendingReveal,
} from "../lib/use-progressive-reveal";
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

  it("hydrates a backward arrival and updates the steps and footer independently", () => {
    function Reveal({ steps, footer }: { steps: number; footer: boolean }) {
      const { revealedCount, footerVisible } = useProgressiveReveal({
        totalSteps: steps,
        hasFooter: footer,
      });
      return <output>{`${revealedCount}/${String(footerVisible)}`}</output>;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<Reveal steps={2} footer />);
    expect(container.textContent).toBe("0/false");

    sessionStorage.setItem("slide-direction", "back");
    const { rerender } = render(<Reveal steps={2} footer />, { container, hydrate: true });
    expect(container.textContent).toBe("2/true");
    rerender(<Reveal steps={3} footer />);
    expect(container.textContent).toBe("3/true");
    rerender(<Reveal steps={3} footer={false} />);
    expect(container.textContent).toBe("3/false");
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

  it("reports whether the next and previous arrows have a step or a footer to change", () => {
    const hints = renderHook(() => [usePendingReveal(), usePendingReveal("behind")]);
    const slide = renderHook(() => useProgressiveReveal({ totalSteps: 1, hasFooter: true }));

    expect(hints.result.current).toEqual([true, false]);
    expect(hasPendingReveal()).toBe(true);
    expect(slide.result.current.stepped).toBe(false);
    pressRight();
    expect(hints.result.current).toEqual([true, true]);
    expect(slide.result.current.stepped).toBe(true);
    pressRight();
    expect(hints.result.current).toEqual([false, true]);
    expect(hasPendingReveal()).toBe(false);
    pressLeft();
    expect(hints.result.current).toEqual([true, true]);
    pressLeft();
    expect(hints.result.current).toEqual([true, false]);
    slide.unmount();
    expect(hints.result.current).toEqual([false, false]);
  });

  it("takes the pending hint from the current slide only after hydration", () => {
    function Hint() {
      return <output>{String(usePendingReveal())}</output>;
    }
    renderHook(() => useProgressiveReveal({ totalSteps: 1 }));
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<Hint />);
    expect(container.textContent).toBe("false");
    render(<Hint />, { container, hydrate: true });
    expect(container.textContent).toBe("true");
  });

  it("keeps the hint while another reporter still has a step ahead", () => {
    const hints = renderHook(() => [usePendingReveal(), usePendingReveal("behind")]);
    const first = renderHook(() => useReportPendingReveal(true));
    const second = renderHook(() => useReportPendingReveal(true));
    first.unmount();
    expect(hints.result.current).toEqual([true, false]);
    second.unmount();
    expect(hints.result.current).toEqual([false, false]);
  });

  it("reports no more right-arrow steps on a finished slide without a footer", () => {
    const { result } = renderHook(() => {
      useProgressiveReveal({ totalSteps: 1 });
      return usePendingReveal();
    });

    expect(result.current).toBe(true);
    pressRight();
    expect(result.current).toBe(false);
  });

  it("passes browser shortcuts through and keeps a reveal press away from deck navigation", () => {
    const { result, unmount } = renderHook(() => useProgressiveReveal({ totalSteps: 1 }));
    const navigationKeys: string[] = [];
    const controller = new AbortController();
    document.addEventListener("keydown", (event) => navigationKeys.push(event.key), {
      signal: controller.signal,
    });
    const arrow = (options: KeyboardEventInit = {}) =>
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
        ...options,
      });
    const browserShortcut = arrow({ metaKey: true });
    const reveal = arrow();
    const nextSlide = arrow();
    const dispatch = (event: KeyboardEvent) => {
      act(() => {
        document.body.dispatchEvent(event);
      });
    };

    try {
      dispatch(browserShortcut);
      expect(browserShortcut.defaultPrevented).toBe(false);
      expect(result.current.revealedCount).toBe(0);
      expect(navigationKeys).toEqual(["ArrowRight"]);

      dispatch(reveal);
      expect(reveal.defaultPrevented).toBe(true);
      expect(result.current.revealedCount).toBe(1);
      expect(navigationKeys).toEqual(["ArrowRight"]);

      unmount();
      dispatch(nextSlide);
      expect(nextSlide.defaultPrevented).toBe(false);
      expect(navigationKeys).toEqual(["ArrowRight", "ArrowRight"]);
    } finally {
      controller.abort();
    }
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

  it("shows the whole slide on a narrow viewport and resumes stepping when it widens", () => {
    const media = new EventTarget();
    const query = {
      ...window.matchMedia("(max-width: 48rem)"),
      matches: false,
      addEventListener: media.addEventListener.bind(media),
      removeEventListener: media.removeEventListener.bind(media),
      dispatchEvent: media.dispatchEvent.bind(media),
    };
    vi.spyOn(window, "matchMedia").mockReturnValue(query);
    const { result } = renderHook(() => {
      const slide = useProgressiveReveal({ totalSteps: 3 });
      return { ...slide, pending: usePendingReveal(), undoable: usePendingReveal("behind") };
    });
    const resize = (matches: boolean) => {
      query.matches = matches;
      act(() => {
        query.dispatchEvent(new Event("change"));
      });
    };

    pressRight();
    expect(result.current).toMatchObject({ revealedCount: 1, stepped: true, pending: true });
    resize(true);
    expect(result.current).toEqual({
      revealedCount: 3,
      footerVisible: false,
      stepped: false,
      pending: false,
      undoable: false,
    });
    expect(pressLeft()).toBe(false);

    resize(false);
    expect(result.current.revealedCount).toBe(1);
    expect(pressRight()).toBe(true);
    expect(result.current.revealedCount).toBe(2);
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
