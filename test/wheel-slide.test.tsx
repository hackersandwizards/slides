import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import type { Slide } from "../types/slide";
import { wheelSlide } from "./fixtures/wheel";

describe("WheelSlide", () => {
  it.each([6, 5, 4])("renders the centre and all %i segments from the registry", (n) => {
    const slide = { ...wheelSlide, segments: wheelSlide.segments.slice(0, n) };
    const SlideComponent = slideComponents.wheel;
    const { getByText, container } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText(slide.center)).toBeTruthy();
    for (const s of slide.segments) {
      expect(getByText(s.title)).toBeTruthy();
      expect(getByText(s.text)).toBeTruthy();
    }
    expect(container.querySelectorAll("path")).toHaveLength(n);
  });
});

it("places the first number at the centre of its clockwise segment", () => {
  const slide = { ...wheelSlide, segments: wheelSlide.segments.slice(0, 4) };
  const { container } = render(<slideComponents.wheel slide={slide} />);
  const number = container.querySelector("svg > g > text");
  assert(number, "the wheel labels its first segment");
  expect(number.textContent).toBe("1");
  expect(number.getAttribute("x")).toBe("155.15");
  expect(number.getAttribute("y")).toBe("44.85");
});
