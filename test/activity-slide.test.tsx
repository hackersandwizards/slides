import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { ActivitySlide } from "../types/slide";
import { timerMinutes } from "../components/slides/ActivitySlide";

const Activity = slideComponents.activity;
const printed = (slide: ActivitySlide) =>
  render(
    <PrintProvider>
      <Activity slide={slide} />
    </PrintProvider>,
  );

describe("ActivitySlide", () => {
  // A timebox opening on a word, "ca. 15 Min.", read no number and counted the default 2.
  it("times the countdown by the duration's first number", () => {
    expect(timerMinutes("20 min")).toBe(20);
    expect(timerMinutes("ca. 15 Min.")).toBe(15);
    expect(timerMinutes("10-15 min")).toBe(10);
    expect(timerMinutes("5")).toBe(5);
    expect(timerMinutes()).toBe(2);
  });

  it("numbers an exercise's steps and shows its frame", () => {
    const { getByText } = printed({
      type: "activity",
      kind: "exercise",
      headline: "Plan first",
      items: ["Open the ticket", "Ask for a plan"],
      duration: "25 min",
      mode: "In pairs",
      outcome: "A plan",
    });
    expect(getByText("Hands-on")).toBeTruthy();
    expect(getByText("2.")).toBeTruthy();
    for (const t of ["25 min", "In pairs", "A plan"]) expect(getByText(t)).toBeTruthy();
  });

  it("marks a demo's watch points without numbers", () => {
    const { getByText, queryByText, container } = printed({
      type: "activity",
      kind: "demo",
      label: "Live-Demo",
      headline: "A bare agent",
      items: ["Which file first?"],
    });
    expect(getByText("Live-Demo")).toBeTruthy();
    expect(queryByText("1.")).toBeNull();
    expect(container.querySelector(".hw-marker")).not.toBeNull();
    expect(container.querySelector(".rounded-brand")).toBeNull();
  });

  it("draws no timer on paper", () => {
    const { container } = printed({
      type: "activity",
      kind: "exercise",
      headline: "P",
      items: ["a"],
    });
    expect(container.querySelector("[data-activity-timer]")).toBeNull();
  });
});

describe("the activity timer", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });
  const slide: ActivitySlide = {
    type: "activity",
    kind: "exercise",
    headline: "Think first",
    items: ["Think"],
    duration: "3 min",
  };
  const time = (container: HTMLElement) =>
    container.querySelector("[data-activity-timer] .font-mono")?.textContent;

  it("starts from the slide's minutes, else two", () => {
    expect(time(render(<Activity slide={slide} />).container)).toBe("3:00");
    const bare = render(<Activity slide={{ ...slide, headline: "Bare", duration: undefined }} />);
    expect(time(bare.container)).toBe("2:00");
  });

  it("counts down on a click, pauses on the next, and changes by a minute either way", () => {
    vi.useFakeTimers();
    const { container, getByLabelText } = render(<Activity slide={slide} />);
    fireEvent.click(getByLabelText("One minute more"));
    fireEvent.click(getByLabelText("One minute more"));
    fireEvent.click(getByLabelText("One minute less"));
    expect(time(container)).toBe("4:00");
    fireEvent.click(getByLabelText(/^Start timer/));
    act(() => vi.advanceTimersByTime(61_000));
    expect(time(container)).toBe("2:59");
    fireEvent.click(getByLabelText(/^Pause timer/));
    act(() => vi.advanceTimersByTime(10_000));
    expect(time(container)).toBe("2:59");
    fireEvent.click(getByLabelText(/^Start timer/));
    act(() => vi.advanceTimersByTime(180_000));
    expect(time(container)).toBe("0:00");
    expect(getByLabelText(/^Restart timer/).dataset.variant).toBeUndefined();
    fireEvent.click(getByLabelText(/^Restart timer/));
    expect(time(container)).toBe("4:00");
  });

  it("follows a timer another window of the deck saved", () => {
    const { container } = render(<Activity slide={slide} />);
    const saved = { minutes: 1, endsAt: null, left: 42_000, at: Date.now() };
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "hw-activity-timer:Think first",
          newValue: JSON.stringify(saved),
        }),
      );
    });
    expect(time(container)).toBe("0:42");
  });
});
