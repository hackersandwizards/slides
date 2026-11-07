import { act, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tickLayout } from "../components/slides/ChartPlots";
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

  it("writes the trend's note on what lies ahead", async () => {
    const SlideComponent = slideComponents.chart;
    const slide = {
      type: "chart",
      variant: "trend",
      data: [{ name: "Q1", value: 1 }],
      currentMarker: "Q1",
      futureNote: "Q2 planned",
    } as Slide;
    const { findByText } = render(<SlideComponent slide={slide} />);
    expect(await findByText("Q2 planned")).toBeTruthy();
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

// Long names side by side overlapped: each bar's label kept one line at any width.
describe("bar tick layout", () => {
  // Ten units a character at the first step, eight at the second, seven at the third.
  const widthAt = (text: string, step: number) => text.length * [10, 8, 7][step];

  it("wraps each label at its band", () => {
    expect(tickLayout(["Waiting for a reviewer", "QA"], 120, widthAt)).toEqual({
      step: 0,
      lines: [["Waiting for", "a reviewer"], ["QA"]],
      angled: false,
    });
  });

  it("steps down when a word does not fit the first step", () => {
    expect(tickLayout(["Onboarding"], 90, widthAt).step).toBe(1);
  });

  it("angles every label when a word fits no step", () => {
    expect(tickLayout(["Onboarding", "QA"], 60, widthAt)).toEqual({
      step: 2,
      lines: [["Onboarding"], ["QA"]],
      angled: true,
    });
  });
});
