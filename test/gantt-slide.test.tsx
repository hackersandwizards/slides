import { render } from "@testing-library/react";
import { assert, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
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

it("aligns the headers, workstream bars, and milestones to the same columns", () => {
  const { container } = render(
    <slideComponents.gantt
      slide={{
        type: "gantt",
        headline: "Plan",
        columns: ["Q1", "Q2", "Q3"],
        rows: [{ label: "Workstream", bars: [{ label: "Build", start: 1, span: 2 }] }],
        milestones: [{ label: "Review", column: 2 }],
      }}
    />,
  );
  const grids = [...container.querySelectorAll<HTMLElement>("[style*='grid-template-columns']")];
  expect(grids.map((grid) => grid.style.gridTemplateColumns)).toEqual([
    "repeat(3, minmax(0px, 1fr))",
    "repeat(3, minmax(0px, 1fr))",
    "repeat(3, minmax(0px, 1fr))",
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

it("draws column headers, row labels, solid and continuous bars, and footer", () => {
  const slide = {
    type: "gantt",
    headline: "Plan",
    columns: ["M1", "M2"],
    rows: [
      {
        label: "Core",
        sublabel: "Team A",
        bars: [
          { label: "Build", start: 1, span: 1 },
          { label: "Run", start: 2, span: 1, continuous: true },
        ],
      },
    ],
    footer: "Updated **weekly**",
  } as Slide;
  const { container, getByText } = render(<slideComponents.gantt slide={slide} />);
  const heading = container.querySelector(".hw-label.border-b-2");
  const footerEmphasis = container.querySelector("strong");
  assert(heading, "The chart has a column heading");
  assert(footerEmphasis, "The footer renders bold markdown");
  expect(heading.textContent).toBe("M1");
  expect(getByText("Team A")).toBeTruthy();
  expect(container.querySelectorAll(".row-start-2.bg-primary")).toHaveLength(1);
  expect(container.querySelectorAll(".row-start-2.border-2")).toHaveLength(1);
  expect(footerEmphasis.textContent).toBe("weekly");
});
