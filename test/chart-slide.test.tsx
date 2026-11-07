import { act, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { Slide } from "../types/slide";

describe("chart slide", () => {
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

// The cycle and graph plots draw in under a clip, since recharts grows only trend and bar plots.
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

  // Each clip starts at half its drawing's width.
  it.each([
    { slide: cycle, start: 450 },
    { slide: graph, start: 400 },
  ])("clips the $slide.variant plot while it draws", ({ slide, start }) => {
    const SlideComponent = slideComponents.chart;
    const { container } = render(<SlideComponent slide={slide} />);
    const clip = container.querySelector("clipPath rect");
    expect(clip).toBeTruthy();
    expect(parseFloat(clip?.getAttribute("width") ?? "0")).toBe(start);
    expect(container.querySelector("g[clip-path] path")).toBeTruthy();
  });

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
