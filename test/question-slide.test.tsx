import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionSlide } from "../components/slides/QuestionSlide";
import type { QuestionSlide as QuestionSlideType } from "../types/slide";

const slide: QuestionSlideType = {
  type: "question",
  headline: "Where are you?",
  storageKey: "test-poll",
  options: [
    { label: "A", text: "here" },
    { label: "B", text: "there" },
  ],
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("QuestionSlide", () => {
  it("opens at the last option on a backward arrival, so Space votes there", () => {
    sessionStorage.setItem("slide-direction", "back");
    render(<QuestionSlide slide={slide} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true }));
    });
    expect(screen.getByRole("button", { name: /^B: there, 1 vote/ })).toBeInTheDocument();
  });

  it("shows a count of 0 rather than an empty box", () => {
    render(<QuestionSlide slide={slide} />);
    const counts = [...document.querySelectorAll("[aria-live]")].map((el) => el.textContent);
    expect(counts).toEqual(["0", "0"]);
  });

  // The server has no storage and renders 0 votes; React keeps a hydrated attribute as the server
  // sent it, so the saved votes have to arrive after hydration.
  it("loads saved votes after hydration and keeps them", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<QuestionSlide slide={slide} />);
    document.body.appendChild(container);
    localStorage.setItem("test-poll", JSON.stringify([3, 1]));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<QuestionSlide slide={slide} />, { container, hydrate: true });
    await act(() => Promise.resolve());
    expect(screen.getByRole("button", { name: /^A: here, 3 votes$/ })).toBeInTheDocument();
    expect(localStorage.getItem("test-poll")).toBe("[3,1]");
  });

  it("keeps working where storage refuses writes", () => {
    // jsdom's Storage turns a property set on the instance into a stored item, so the spy goes on
    // the prototype there.
    const storage =
      typeof Storage !== "undefined" && localStorage instanceof Storage
        ? Storage.prototype
        : localStorage;
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<QuestionSlide slide={slide} />);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }),
      );
    });
    expect(screen.getByRole("button", { name: /^A: here, 1 votes$/ })).toBeInTheDocument();
  });

  // The speaker window takes the keys on its own copy of the slide; its votes reach the audience
  // window through the storage event, which fires only in the other windows of the origin.
  it("adopts the votes another window of the deck saved", () => {
    render(<QuestionSlide slide={slide} />);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "test-poll", newValue: JSON.stringify([2, 5]) }),
      );
    });
    expect(screen.getByRole("button", { name: /^B: there, 5 votes$/ })).toBeInTheDocument();
  });
});
