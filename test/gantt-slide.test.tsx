import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { DeckLang } from "../components/slides/SlideShell";
import type { Slide } from "../types/slide";

// F32: two milestones in one column took the same grid cell and drew over each other.
it("stacks milestones that share a column in one cell", () => {
  const slide = {
    type: "gantt",
    headline: "H",
    columns: ["Q1", "Q2", "Q3"],
    rows: [{ label: "R", bars: [{ label: "B", start: 1, span: 3 }] }],
    milestones: [
      { label: "Kick-off", column: 1 },
      { label: "Review", column: 2 },
      { label: "Go-live", column: 2 },
    ],
  } as Slide;
  const { container } = render(<slideComponents.gantt slide={slide} />);
  const cells = [...container.querySelectorAll<HTMLElement>(".row-start-1.border-secondary")];
  expect(cells.map((c) => [c.style.gridColumn, c.textContent])).toEqual([
    ["1", "Kick-off"],
    ["2", "ReviewGo-live"],
  ]);
});

it("names the milestone row in the deck's language without a label", () => {
  const slide = {
    type: "gantt",
    headline: "H",
    columns: ["Q1"],
    rows: [{ label: "R", bars: [{ label: "B", start: 1, span: 1 }] }],
    milestones: [{ label: "M", column: 1 }],
  } as Slide;
  expect(render(<slideComponents.gantt slide={slide} />).container.textContent).toContain(
    "Milestones",
  );
  const de = render(
    <DeckLang.Provider value="de">
      <slideComponents.gantt slide={slide} />
    </DeckLang.Provider>,
  );
  expect(de.container.textContent).toContain("Meilensteine");
});
