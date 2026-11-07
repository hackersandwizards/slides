import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverviewSlide } from "../components/slides/OverviewSlide";
import type { OverviewSlide as OverviewSlideType } from "../types/slide";

// The overview draws as phased pills: two phases, unnumbered, its `new` stage the one active pill.
describe("OverviewSlide, as phased pills", () => {
  it("marks only the new stage, numbers nothing and drops the descriptions", () => {
    const slide: OverviewSlideType = {
      type: "overview",
      foundations: [
        { title: "Tools", description: "What it uses", state: "active" },
        { title: "Knowledge", description: "What it reads", state: "new" },
      ],
      pipeline: [{ title: "Plan", description: "Before code" }],
    };
    const { container, getByText } = render(<OverviewSlide slide={slide} />);
    expect(container.textContent).not.toContain("#");
    expect(container.textContent).not.toContain("What it uses");
    expect(getByText("Foundations")).toBeTruthy();
    // The pulse dot (PulseDot) on the new stage's pill only.
    expect(container.querySelectorAll(".ring-4")).toHaveLength(1);
    expect(getByText("Knowledge").parentElement?.querySelector(".ring-4")).not.toBeNull();
  });
});
