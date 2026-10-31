import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessSlide } from "../components/slides/ProcessSlide";
import type { ProcessSlide as ProcessSlideType } from "../types/slide";

function makeSlide(titles: string[]): ProcessSlideType {
  return {
    type: "process",
    headline: "Test process",
    nodes: titles.map((title) => ({ title, description: `${title} desc` })),
  };
}

describe("ProcessSlide", () => {
  // The diamond layout once hardcoded four positions and silently dropped any
  // extra nodes — the pitch-assessment "Readiness Radar" lost 2 of its 6 steps.
  // Every node must render regardless of count.
  it.each([3, 4, 5, 6, 8])("renders all %i node titles", (count) => {
    const titles = Array.from({ length: count }, (_, i) => `Step ${i + 1}`);
    const { getAllByText } = render(<ProcessSlide slide={makeSlide(titles)} />);
    for (const title of titles) {
      // Once in the desktop row, once on the circle that phones show.
      expect(getAllByText(title)).toHaveLength(2);
    }
  });

  it("renders one connecting arrow per node (a closed loop)", () => {
    const { container } = render(<ProcessSlide slide={makeSlide(["A", "B", "C", "D", "E"])} />);
    // Each node gets an outgoing arrow back to the next (last → first). Scope to
    // the arrows canvas so lucide icon <path>s inside the nodes don't count. Matched in code:
    // jsdom 30 misses `svg[viewBox^="..."]` on the mixed-case SVG attribute.
    const arrowSvg = [...container.querySelectorAll("svg")].find((svg) =>
      svg.getAttribute("viewBox")?.startsWith("0 0 960"),
    );
    expect(arrowSvg?.querySelectorAll("path").length).toBe(5);
  });
});
