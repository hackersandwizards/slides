import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { ActivitySlide } from "../types/slide";

const Activity = slideComponents.activity;
const printed = (slide: ActivitySlide) =>
  render(
    <PrintProvider>
      <Activity slide={slide} />
    </PrintProvider>,
  );

describe("ActivitySlide", () => {
  // An exercise numbers its steps and names its kind; the frame card carries time, mode, outcome.
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

  // A demo's watch points carry markers, not numbers, and no frame card without its fields.
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
});
