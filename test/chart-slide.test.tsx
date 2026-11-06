import { act, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
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

// The cycle and graph plots draw in from the left, as recharts grows the trend and bar plots: a
// clip over the drawing (06.11.2026, "animate these graphs like the others"). Printed, no clip.
describe("chart draw-in", () => {
  const cycle = {
    type: "chart",
    variant: "cycle",
    segments: [
      { label: "A", percentage: 50 },
      { label: "B", percentage: 50 },
    ],
  } as Slide;
  const graph = { type: "chart", variant: "graph", currentMarker: "Today" } as Slide;

  it.each([cycle, graph])("clips the $variant plot while it draws", (slide) => {
    const SlideComponent = slideComponents.chart;
    const { container } = render(<SlideComponent slide={slide} />);
    const clip = container.querySelector("clipPath rect");
    expect(clip).toBeTruthy();
    expect(container.querySelector("g[clip-path] path")).toBeTruthy();
  });

  // The slide a page load opens on shows its plot at once: the clip hydrates at its full width.
  it("opens a page load's slide with the plot whole", async () => {
    const SlideComponent = slideComponents.chart;
    const host = document.createElement("div");
    host.innerHTML = renderToString(<SlideComponent slide={cycle} />);
    await act(async () => {
      hydrateRoot(host, <SlideComponent slide={cycle} />);
    });
    // The cycle's drawing is 900 wide, so its clip ends 1800 wide.
    expect(parseFloat(host.querySelector("clipPath rect")?.getAttribute("width") ?? "0")).toBe(
      1800,
    );
  });

  it("prints the plot whole", () => {
    const SlideComponent = slideComponents.chart;
    const { container } = render(
      <PrintProvider>
        <SlideComponent slide={cycle} />
      </PrintProvider>,
    );
    expect(container.querySelector("clipPath")).toBeNull();
  });
});
