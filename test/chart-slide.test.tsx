import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("chart slide", () => {
  // Every variant shows the annotation a deck gives it, the cycle included.
  it("renders the annotation of a cycle chart", () => {
    const SlideComponent = slideComponents.chart;
    const slide = {
      type: "chart",
      variant: "cycle",
      segments: [{ label: "A", percentage: "50%" }],
      annotation: "The note",
    };
    const { getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText("The note")).toBeTruthy();
  });
});
