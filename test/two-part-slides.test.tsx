import { defined } from "@hackersandwizards/scaffolding/defined";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import { RoadmapSlide } from "../components/slides/RoadmapSlide";
import { PrintProvider } from "../lib/print-context";

const DualPillOverview = slideComponents["dual-pill-overview"];
const printed = (node: React.ReactNode) => render(<PrintProvider>{node}</PrintProvider>);

describe("roadmap and dual-pill-overview", () => {
  // One layout draws both: a pill's number stands where the roadmap's marker stands.
  it("draws a pill as a numbered row in the roadmap's card", () => {
    const column = { label: "Part one", title: "Ingredients", accent: "ingredients" as const };
    const dual = printed(
      <DualPillOverview
        slide={{
          type: "dual-pill-overview",
          headline: "Two parts",
          left: {
            ...column,
            phases: [{ label: "Mindset", theme: "accent", items: [{ number: 1, title: "Pill" }] }],
          },
          right: { ...column, accent: "deepdive", phases: [] },
        }}
      />,
    );
    const row = defined(dual.getByText("Pill").closest("li"), "pill list item");
    expect(row.firstElementChild?.textContent).toBe("1");
    expect(dual.getByText("Mindset").dataset.hue).toBe("amber");

    const roadmap = printed(
      <RoadmapSlide
        slide={{
          type: "roadmap",
          headline: "Two parts",
          columns: [
            { ...column, items: [{ title: "Item" }] },
            { ...column, accent: "deepdive", items: [] },
          ],
        }}
      />,
    );
    const marker = defined(
      defined(roadmap.getByText("Item").closest("li"), "roadmap list item").firstElementChild,
      "roadmap item marker",
    );
    expect(marker.className).toContain("hw-marker");
    const label = (r: typeof dual) => r.container.querySelector(".hw-label-box")?.outerHTML;
    expect(label(dual)).toContain("hw-label-box");
    expect(label(dual)).toBe(label(roadmap));
  });
});
