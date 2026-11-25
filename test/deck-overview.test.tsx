import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeckOverview } from "../components/slides/DeckOverview";
import { deckSync } from "../lib/presenter-sync";
import type { Presentation } from "../types/slide";

const goToSlide = vi.fn<typeof import("../lib/navigate").goToSlide>();
vi.mock("../lib/navigate", () => ({
  goToSlide: (...args: Parameters<typeof goToSlide>) => goToSlide(...args),
}));

const deck: Presentation = {
  name: "Sample",
  lang: "en",
  slides: [
    { type: "title", title: "One" },
    { type: "statement", lines: ["Two"] },
    { type: "statement", lines: ["Three"] },
    { type: "statement", lines: ["Four"] },
  ],
};

const pressKey = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
    );
  });

afterEach(() => {
  goToSlide.mockReset();
  vi.restoreAllMocks();
});

describe("DeckOverview", () => {
  it.each(["o", "O"])("opens on %s and marks the current slide", (key) => {
    render(<DeckOverview presentation={deck} index={1} basePath="/deck" />);
    pressKey(key);
    const dialog = screen.getByRole("dialog", { name: "Slide overview" });
    const buttons = dialog.querySelectorAll("ol > li > button");
    expect(buttons).toHaveLength(4);
    expect(buttons[1]).toHaveAttribute("aria-current", "page");
    expect(buttons[0]).not.toHaveAttribute("aria-current");
  });

  it("stays closed in follower frames", () => {
    vi.spyOn(deckSync, "follows").mockReturnValue(true);
    render(<DeckOverview presentation={deck} index={0} basePath="/deck" />);
    pressKey("o");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores O held with a modifier key", () => {
    render(<DeckOverview presentation={deck} index={0} basePath="/deck" />);
    pressKey("o", { metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    [1, 3, "forward"],
    [2, 0, "back"],
  ] as const)("jumps from slide %i to %i (%s) and closes", (from, to, direction) => {
    const navigated = vi.spyOn(deckSync, "navigated").mockImplementation(() => {});
    render(<DeckOverview presentation={deck} index={from} basePath="/deck" />);
    pressKey("o");
    const buttons = screen.getByRole("dialog").querySelectorAll("ol > li > button");
    fireEvent.click(buttons[to]);
    expect(goToSlide).toHaveBeenCalledWith(`/deck/${to}`, direction);
    expect(navigated).toHaveBeenCalledWith(to, direction);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes without navigating when clicking the current slide", () => {
    render(<DeckOverview presentation={deck} index={1} basePath="/deck" />);
    pressKey("o");
    const buttons = screen.getByRole("dialog").querySelectorAll("ol > li > button");
    fireEvent.click(buttons[1]);
    expect(goToSlide).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    [0, "ArrowRight", 1],
    [1, "ArrowLeft", 0],
    [0, "ArrowDown", 2],
    [3, "ArrowUp", 1],
  ])("moves grid focus from %i on %s to %i in a 2-column grid", (start, key, expected) => {
    render(<DeckOverview presentation={deck} index={0} basePath="/deck" />);
    pressKey("o");
    const list = screen.getByRole("list");
    const buttons = list.querySelectorAll<HTMLButtonElement>(":scope > li > button");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "100px 100px",
    } as unknown as CSSStyleDeclaration);
    buttons[start].focus();
    fireEvent.keyDown(list, { key });
    expect(document.activeElement).toBe(buttons[expected]);
  });
});
