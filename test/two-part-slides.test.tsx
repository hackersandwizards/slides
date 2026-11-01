import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualPillOverview } from "../components/slides/DualPillOverview";
import { RoadmapSlide } from "../components/slides/RoadmapSlide";
import { PrintProvider } from "../lib/print-context";

const printed = (node: React.ReactNode) => render(<PrintProvider>{node}</PrintProvider>);

describe("roadmap and dual-pill-overview", () => {
  // One layout draws both (os decision roadmap-dual-pill-slides): the same card and label, a
  // pill becomes a row whose number stands where the roadmap's marker stands.
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
    const row = dual.getByText("Pill").closest("li")!;
    expect(row.firstElementChild?.textContent).toBe("1");
    expect(dual.getByText("Mindset").className).toContain("text-accent");

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
    const marker = roadmap.getByText("Item").closest("li")!.firstElementChild!;
    expect(marker.className).toContain("slide-marker");
    const label = (r: typeof dual) => r.container.querySelector(".label-caps.border")?.className;
    expect(label(dual)).toBe(label(roadmap));
  });
});
