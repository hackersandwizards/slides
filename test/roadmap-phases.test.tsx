import { render } from "@testing-library/react";
import { assert, expect, it } from "vitest";
import { RoadmapSlide } from "../components/slides/RoadmapSlide";
import type { RoadmapColumn, SectionTheme } from "../types/slide";

const column = { label: "Part one", title: "Plan", accent: "ingredients" } as const;
const numbered = { number: 1, title: "Step" };

it.each<[string, RoadmapColumn, string]>([
  ["flat ingredients", { ...column, items: [{ title: "Step" }] }, "bg-primary"],
  ["flat deep dive", { ...column, accent: "deepdive", items: [{ title: "Step" }] }, "bg-secondary"],
  [
    "phase without a theme",
    { ...column, phases: [{ label: "Phase", items: [numbered] }] },
    "text-secondary",
  ],
  [
    "phase with an inherited theme name",
    {
      ...column,
      phases: [{ label: "Phase", theme: "toString" as SectionTheme, items: [numbered] }],
    },
    "text-primary",
  ],
  [
    "phase with an explicit theme",
    { ...column, phases: [{ label: "Phase", theme: "accent", items: [numbered] }] },
    "text-slide-accent",
  ],
])("sets the row colour for %s", (_, left, colour) => {
  const { getByText } = render(
    <RoadmapSlide
      slide={{
        type: "roadmap",
        headline: "Roadmap",
        columns: [left, { label: "Part two", title: "Deliver", accent: "deepdive" }],
      }}
    />,
  );
  const indicator = getByText("Step").closest("li")?.firstElementChild;
  assert(indicator, "the roadmap row has an indicator");
  expect(indicator).toHaveClass(colour);
});
