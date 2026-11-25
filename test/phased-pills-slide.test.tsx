import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { PhasedPillsSlide } from "../components/slides/PhasedPillsSlide";
import type { PhasedPillsSlide as PhasedPillsSlideType } from "../types/slide";

describe("PhasedPillsSlide", () => {
  it("uses a shared subgrid when every phase holds up to three pills", () => {
    const slide: PhasedPillsSlideType = {
      type: "phased-pills",
      title: "Workflow",
      phases: [
        {
          label: "Setup",
          theme: "primary",
          items: [
            { number: 1, title: "Init", state: "active" },
            { number: 2, title: "Lint" },
          ],
        },
        {
          label: "Deliver",
          items: [{ title: "Deploy" }],
        },
      ],
    };
    const { container, getByText } = render(<PhasedPillsSlide slide={slide} />);
    expect(getByText("Workflow")).toBeTruthy();
    expect(getByText("#1")).toBeTruthy();
    expect(container.querySelectorAll(".grid-cols-subgrid")).toHaveLength(2);
    const setup = getByText("Setup").parentElement;
    const deliver = getByText("Deliver").parentElement;
    assert(setup, "Setup has a phase label");
    assert(deliver, "Deliver has a phase label");
    expect(setup.hasAttribute("data-hue")).toBe(false);
    expect(deliver.getAttribute("data-hue")).toBe("purple");
  });

  it.each([
    {
      count: 4,
      label: "Mid",
      theme: "accent",
      layoutClass: "grid",
      track: "repeat(4, minmax(min-content, max-content))",
      fullWidthHeadings: 0,
    },
    {
      count: 7,
      label: "Many",
      theme: "success",
      layoutClass: "flex-wrap",
      track: "",
      fullWidthHeadings: 1,
    },
  ] as const)(
    "$count pills use the $layoutClass layout",
    ({ count, label, theme, layoutClass, track, fullWidthHeadings }) => {
      const items = Array.from({ length: count }, (_, i) => ({ title: `Step ${i + 1}` }));
      const slide: PhasedPillsSlideType = {
        type: "phased-pills",
        phases: [{ label, theme, items }],
      };
      const { container, getByText } = render(<PhasedPillsSlide slide={slide} />);
      const group = getByText(label).closest<HTMLElement>(".gap-x-4");
      assert(group, "The phase has a pill container");
      expect(group.classList).toContain(layoutClass);
      expect(group.style.gridTemplateColumns).toBe(track);
      expect(container.querySelectorAll(".basis-full")).toHaveLength(fullWidthHeadings);
    },
  );
});
