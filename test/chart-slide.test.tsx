import { act, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { assert, describe, expect, it } from "vitest";
import { AxisTick, tickLayout, trendTicks } from "../components/slides/ChartPlots";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { Slide } from "../types/slide";

describe("chart slide", () => {
  it("renders the annotation of a cycle chart", () => {
    const SlideComponent = slideComponents.chart;
    const slide: Slide = {
      type: "chart",
      variant: "cycle",
      segments: [{ label: "A", percentage: 50 }],
      annotation: "The note",
    };
    const { getByText } = render(<SlideComponent slide={slide} />);
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

  it("names what a bar chart's values count", async () => {
    const SlideComponent = slideComponents.chart;
    const slide = {
      type: "chart",
      variant: "bar",
      data: [{ name: "Plan", value: 3 }],
      yLabel: "Open tickets",
    } as Slide;
    const { findByText } = render(<SlideComponent slide={slide} />);
    expect(await findByText("Open tickets")).toBeTruthy();
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
    assert(clip, "Expected the incoming plot's clip rectangle");
    const width = clip.getAttribute("width");
    assert(width, "Expected the incoming plot's starting clip width");
    expect(parseFloat(width)).toBe(start);
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
    const clip = host.querySelector("clipPath rect");
    assert(clip, "Expected the hydrated plot's clip rectangle");
    const width = clip.getAttribute("width");
    assert(width, "Expected the hydrated plot's clip width");
    expect(parseFloat(width)).toBe(1800);
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
  const widthAt = (text: string, step: number) => text.length * [10, 8, 7][step];

  it("wraps each label at its band", () => {
    expect(tickLayout(["Waiting for a reviewer", "QA"], 120, widthAt)).toEqual({
      step: 0,
      lines: [["Waiting for", "a reviewer"], ["QA"]],
      angled: false,
    });
  });
});

// WebKit drops a text's dominant-baseline on the tspans inside it: the labels sat on the axis line
// in Safari while Chrome hung them below it.
describe("axis tick", () => {
  it("hangs every line from its own tspan", () => {
    const { container } = render(
      <svg>
        <AxisTick
          x={0}
          y={0}
          index={0}
          payload={{ value: "Plan" }}
          layout={{ step: 0, lines: [["Waiting", "for"]], angled: false }}
        />
      </svg>,
    );
    const lines = [...container.querySelectorAll("tspan")];
    expect(lines).toHaveLength(2);
    for (const line of lines)
      expect(line.getAttribute("dominant-baseline")).toBe("text-before-edge");
  });
});

// The marked point's guide runs down to the first tick, the axis floor.
describe("trendTicks", () => {
  it("keeps the concrete axis intervals used in the web and PowerPoint plots", () => {
    expect(
      trendTicks([
        { name: "a", value: 2 },
        { name: "b", value: 8 },
      ]),
    ).toEqual([0, 2, 4, 6, 8]);
    expect(
      trendTicks([
        { name: "a", value: -3, value2: -7 },
        { name: "b", value: 12, value2: 4 },
      ]),
    ).toEqual([-12, -6, 0, 6, 12]);
  });
});

describe("drawn chart geometry", () => {
  it("places cycle labels at segment midpoints and closes the last segment at the curve end", () => {
    const Chart = slideComponents.chart;
    const { getByText } = render(
      <Chart
        slide={{
          type: "chart",
          variant: "cycle",
          segments: [
            { label: "First", percentage: 25 },
            { label: "Last", percentage: 50 },
          ],
        }}
      />,
    );
    expect(getByText("First")).toHaveAttribute("x", "157.5");
    expect(getByText("Last")).toHaveAttribute("x", "547.5");
    expect(getByText("50%")).toHaveAttribute("x", "547.5");
  });

  it("draws the graph's projection, marker and axis labels in their original places", () => {
    const Chart = slideComponents.chart;
    const { container, getByText } = render(
      <Chart
        slide={{
          type: "chart",
          variant: "graph",
          xLabel: "Time",
          yLabel: "Value",
          currentMarker: "Today",
          futureNote: "Projection",
        }}
      />,
    );
    expect(container.querySelectorAll("svg > line")).toHaveLength(4);
    expect(getByText("Today")).toHaveAttribute("x", "470");
    expect(getByText("Projection")).toHaveAttribute("y", "80");
    expect(getByText("Time")).toHaveAttribute("y", "390");
    expect(getByText("Value")).toHaveAttribute("transform", "rotate(-90, 20, 200)");
  });
});

it("uses the fallback text and rotates an angled tick around its own marked point", () => {
  const { getByText } = render(
    <svg>
      <AxisTick
        x={12}
        y={24}
        index={4}
        marked={4}
        payload={{ value: "Fallback" }}
        layout={{ step: 2, lines: [], angled: true }}
      />
    </svg>,
  );
  const label = getByText("Fallback").parentElement;
  expect(label).toHaveAttribute("transform", "rotate(-40 12 24)");
  expect(label).toHaveAttribute("text-anchor", "end");
  expect(label).toHaveAttribute("font-size", "var(--text-xs)");
  expect(label).toHaveAttribute("font-weight", "700");
  expect(label).toHaveAttribute("fill", "var(--color-teal)");
});
