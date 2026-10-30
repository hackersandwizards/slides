import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaserPointer } from "../components/slides/LaserPointer";
import { formatDuration, PresenterView } from "../components/slides/PresenterView";
import { SlideNavigation } from "../components/slides/SlideNavigation";
import { DeckEdit } from "../lib/deck-edit-mode";
import { deckSync, ROLE_NAMES } from "../lib/presenter-sync";
import { directionKey } from "../lib/slide-utils";
import { useProgressiveReveal } from "../lib/use-progressive-reveal";

// The sync is one instance per window and outlives a test. Moving the clock on lets a test's
// slide mount after the previous test's navigation, which never arrived, has expired.
let now = Date.now();
beforeEach(() => {
  now += 10_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

const goToSlide = vi.fn();
vi.mock("../lib/navigate", () => ({ useGoToSlide: () => goToSlide }));

const press = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

afterEach(() => {
  goToSlide.mockReset();
  vi.restoreAllMocks();
});

describe("SlideNavigation in the audience window", () => {
  it("opens the speaker window on S at the slide it is on, as revealed as it is", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<SlideNavigation currentIndex={3} totalSlides={8} basePath="/deck" />);
    await settle();
    press("s");
    expect(open).toHaveBeenCalledWith("/deck/3", ROLE_NAMES.presenter, expect.any(String));
    expect(sessionStorage.getItem(`slide-direction:${ROLE_NAMES.presenter}`)).toBe("forward");
  });

  it("leaves S alone with a modifier, so the browser's own shortcuts work", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<SlideNavigation currentIndex={0} totalSlides={8} basePath="/deck" />);
    press("s");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
    });
    expect(open).toHaveBeenCalledTimes(1);
  });

  // Cmd+Left is the browser's Back on macOS and Alt+Right its Forward elsewhere: the deck stepping
  // on them too would land two places off.
  it("leaves an arrow held with a modifier to the browser", async () => {
    render(<SlideNavigation currentIndex={2} totalSlides={8} basePath="/deck" />);
    await settle();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", metaKey: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }));
    });
    expect(goToSlide).not.toHaveBeenCalled();
  });

  it("navigates on an unconsumed arrow and tells the other windows", async () => {
    render(<SlideNavigation currentIndex={2} totalSlides={8} basePath="/deck" />);
    await settle();
    press("ArrowRight");
    expect(goToSlide).toHaveBeenCalledWith("/deck/3", "forward");
    expect(deckSync.getState()).toMatchObject({ slide: 3, back: false, step: 0 });
  });

  it("counts a second press before the next slide renders as one slide further", async () => {
    render(<SlideNavigation currentIndex={2} totalSlides={8} basePath="/deck" />);
    await settle();
    press("ArrowRight");
    press("ArrowRight");
    expect(goToSlide).toHaveBeenLastCalledWith("/deck/4", "forward");
  });

  it("counts an arrow the slide consumed as a step, not a slide change", async () => {
    render(<SlideNavigation currentIndex={5} totalSlides={8} basePath="/deck" />);
    await settle();
    const consume = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", consume, true);
    press("ArrowRight");
    window.removeEventListener("keydown", consume, true);
    await settle();
    expect(goToSlide).not.toHaveBeenCalled();
    expect(deckSync.getState()).toMatchObject({ slide: 5, step: 1 });
  });
});

describe("SlideNavigation and a consumed press", () => {
  // Chrome runs window's bubble listeners after a capture listener's stopPropagation when the
  // press was dispatched on window itself, as the speaker view's buttons did.
  it("does not navigate on an arrow a slide prevented, even where propagation went on", async () => {
    render(<SlideNavigation currentIndex={5} totalSlides={8} basePath="/deck" />);
    await settle();
    const consume = (event: KeyboardEvent) => event.preventDefault();
    window.addEventListener("keydown", consume, true);
    press("ArrowRight");
    window.removeEventListener("keydown", consume, true);
    expect(goToSlide).not.toHaveBeenCalled();
  });

  it("steps through reveals on the touch Next button as the arrow key does", async () => {
    render(<SlideNavigation currentIndex={5} totalSlides={8} basePath="/deck" />);
    await settle();
    const consume = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", consume, true);
    act(() => screen.getByRole("button", { name: "Next slide" }).click());
    window.removeEventListener("keydown", consume, true);
    expect(goToSlide).not.toHaveBeenCalled();
    act(() => screen.getByRole("button", { name: "Next slide" }).click());
    expect(goToSlide).toHaveBeenCalledWith("/deck/6", "forward");
  });

  it("steps back on the touch Previous button as the arrow key does", async () => {
    render(<SlideNavigation currentIndex={5} totalSlides={8} basePath="/deck" />);
    await settle();
    const consume = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", consume, true);
    act(() => screen.getByRole("button", { name: "Previous slide" }).click());
    window.removeEventListener("keydown", consume, true);
    expect(goToSlide).not.toHaveBeenCalled();
    act(() => screen.getByRole("button", { name: "Previous slide" }).click());
    expect(goToSlide).toHaveBeenCalledWith("/deck/4", "back");
  });

  it("keeps Previous on the first slide while a reveal can still be taken back", async () => {
    function Reveal() {
      useProgressiveReveal({ totalSteps: 1 });
      return null;
    }
    render(
      <>
        <Reveal />
        <SlideNavigation currentIndex={0} totalSlides={8} basePath="/deck" />
      </>,
    );
    await settle();
    const previous = screen.getByRole("button", { name: "Previous slide" });
    expect(previous).toBeDisabled();
    press("ArrowRight");
    expect(previous).toBeEnabled();
    act(() => previous.click());
    expect(previous).toBeDisabled();
    expect(goToSlide).not.toHaveBeenCalled();
  });

  it("consumes the arrival direction once the slide has mounted", () => {
    sessionStorage.setItem("slide-direction", "back");
    render(<SlideNavigation currentIndex={1} totalSlides={8} basePath="/deck" />);
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
  });
});

describe("PresenterView", () => {
  it("renders nothing outside the speaker window", () => {
    const { container } = render(<PresenterView notes={["a note"]} basePath="/deck" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("DeckEdit", () => {
  it("stays off in the speaker window, whose own notes editor would lose its clicks to it", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("presenter");
    render(<DeckEdit deck="/deck" />);
    press("e");
    expect("deckEdit" in document.documentElement.dataset).toBe(false);
  });

  it("asks nothing for a click on the page itself, outside every element", async () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    const ask = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "no" }));
    render(<DeckEdit deck="/deck" />);
    press("e");
    act(() => {
      document.body.click();
    });
    await settle();
    expect(ask).not.toHaveBeenCalled();
    press("e");
  });

  // A second refusal of the same text while the first still showed kept the red outline for good.
  it("clears the refusal outline when the same text is refused twice", async () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ error: "no" }));
    render(
      <>
        <DeckEdit deck="/deck" />
        <p>Refused text</p>
      </>,
    );
    press("e");
    vi.useFakeTimers();
    const text = screen.getByText("Refused text");
    for (let i = 0; i < 2; i++) {
      act(() => text.click());
      await act(() => vi.advanceTimersByTimeAsync(100));
    }
    expect(text.style.outline).toContain("solid");
    await act(() => vi.advanceTimersByTimeAsync(7000));
    vi.useRealTimers();
    expect(text.style.outline).toBe("");
    press("e");
  });
});

describe("LaserPointer", () => {
  // The speaker view's notes stay selectable and its controls focusable.
  it("leaves clicks in the speaker window alone", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("presenter");
    const noop = new Proxy({}, { get: () => () => {} });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      noop as CanvasRenderingContext2D,
    );
    // jsdom has no layout, so nothing is under the pointer but the page.
    document.elementFromPoint = () => document.body;
    render(<LaserPointer />);
    const down = new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(down);
    });
    expect(down.defaultPrevented).toBe(false);
    delete (document as Partial<Document>).elementFromPoint;
  });
});

describe("directionKey", () => {
  it("keeps the plain key in the audience window and one per role elsewhere", () => {
    expect(directionKey()).toBe("slide-direction");
    window.name = ROLE_NAMES.follow;
    expect(directionKey()).toBe(`slide-direction:${ROLE_NAMES.follow}`);
    window.name = "";
  });
});

describe("formatDuration", () => {
  it("reads as minutes and seconds, with hours once there are any", () => {
    expect(formatDuration(7_000)).toBe("0:07");
    expect(formatDuration(754_000)).toBe("12:34");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
    expect(formatDuration(-5)).toBe("0:00");
  });
});
