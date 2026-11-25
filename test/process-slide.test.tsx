import { render } from "@testing-library/react";
import { assert, describe, expect, it, vi } from "vitest";
import { phoneWidth } from "./phone-width";
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
  // The diamond layout once hardcoded four positions and dropped any further node.
  it.each([
    [3, 2],
    [4, 2],
    [5, 1],
    [6, 1],
    [8, 1],
  ])("renders all %i node titles with %i copies each", (count, copies) => {
    const titles = Array.from({ length: count }, (_, i) => `Step ${i + 1}`);
    const { getAllByText } = render(<ProcessSlide slide={makeSlide(titles)} />);
    expect(getAllByText(/^Step \d+$/)).toHaveLength(count * copies);
    for (const title of titles) {
      // Once in the desktop row, and up to four nodes once more on the circle that phones show.
      expect(getAllByText(title)).toHaveLength(copies);
    }
  });

  it("renders one connecting arrow per node (a closed loop)", () => {
    const { container } = render(<ProcessSlide slide={makeSlide(["A", "B", "C", "D"])} />);
    // Scoped to the arrows canvas, so the icons' paths inside the nodes don't count. Matched in
    // code, since jsdom 30 missed `svg[viewBox^="..."]` on the mixed-case attribute.
    const arrowSvg = [...container.querySelectorAll("svg")].find((svg) =>
      svg.getAttribute("viewBox")?.startsWith("0 0 960"),
    );
    expect(arrowSvg?.querySelectorAll("path").length).toBe(4);
  });
});

// F32: on a phone every step shows at once, which lit the last node as if a press had revealed it.
it("lights no node on a phone, where every step shows at once", () => {
  phoneWidth();
  const { container } = render(<ProcessSlide slide={makeSlide(["A", "B", "C", "D"])} />);
  const lit = container.querySelectorAll(".scale-105.border-teal");
  expect(container.querySelectorAll(".scale-100.opacity-100").length).toBe(4);
  expect(lit.length).toBe(0);
  vi.restoreAllMocks();
});

it("leaves a step with `numbered: false` empty and numbers the others on", () => {
  const slide = makeSlide(["Customer", "Intake", "Build", "Customer again"]);
  slide.loop = false;
  slide.nodes[0].numbered = false;
  slide.nodes[3].numbered = false;
  const tiles = (slide: ProcessSlideType) =>
    [...render(<ProcessSlide slide={slide} />).container.querySelectorAll(".slide-flow-step")].map(
      (step) => step.firstElementChild?.textContent,
    );
  expect(tiles(slide)).toEqual(["", "1", "2", ""]);
  // The control: without the field every step counts.
  expect(tiles({ ...makeSlide(["A", "B"]), loop: false })).toEqual(["1", "2"]);
});

it("draws the first connector between the top and right nodes of a four-node loop", () => {
  const { container } = render(<ProcessSlide slide={makeSlide(["A", "B", "C", "D"])} />);
  const path = container.querySelector(".process-canvas > svg > path");
  assert(path, "the process canvas has a connector");
  const shape = path.getAttribute("d");
  assert(shape, "the connector has a path");
  const coordinates = shape.match(/[\d.]+/g);
  assert(coordinates, "the connector path has coordinates");
  expect(coordinates.map((value) => Math.round(Number(value)))).toEqual([
    600, 159, 628, 187, 667, 195,
  ]);
});
