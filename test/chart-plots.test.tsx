import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BarPlot, TrendPlot } from "../components/slides/ChartPlots";

class PlotResizeObserver extends ResizeObserver {
  private readonly notify: ResizeObserverCallback;

  constructor(notify: ResizeObserverCallback) {
    super(notify);
    this.notify = notify;
  }

  observe() {
    this.notify([], this);
  }
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", PlotResizeObserver);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 320, 300),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("draws bars as proportional rows when the phone cannot fit category words", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    measureText: (text: string) => ({ width: text.length * 20 }),
  } as CanvasRenderingContext2D);
  const { getAllByRole } = render(
    <BarPlot
      still
      data={[
        { name: "First-long-category", value: 10 },
        { name: "Second-long-category", value: 5 },
      ]}
    />,
  );
  const rows = getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("First-long-category10");
  expect(rows[1]).toHaveTextContent("Second-long-category5");
  expect(rows[1].querySelector("div")).toHaveStyle({ width: "50%" });
});

it("joins both planned trend series to their measured series at the marked category", () => {
  const { container } = render(
    <TrendPlot
      still
      currentMarker="B"
      data={[
        { name: "A", value: 1, value2: 3 },
        { name: "B", value: 5, value2: 7 },
        { name: "C", value: 9, value2: 11 },
      ]}
    />,
  );
  const measured = [...container.querySelectorAll(".recharts-area-curve:not([stroke-dasharray])")];
  const planned = [...container.querySelectorAll('.recharts-area-curve[stroke-dasharray="12 10"]')];
  expect(measured).toHaveLength(2);
  expect(planned).toHaveLength(2);
  expect(planned[0].getAttribute("d")).toMatch(/^M189,142/);
  expect(planned[1].getAttribute("d")).toMatch(/^M189,105/);
  expect(container.querySelector(".recharts-reference-dot circle")).toHaveAttribute("cx", "189");
});
