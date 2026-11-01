import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isDeepDive } from "../lib/slide-utils";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

const pills = (theme: "deepdive" | "secondary") =>
  ({
    type: "phased-pills",
    phases: [{ label: "Tactics", theme, items: [{ number: 1, title: "One" }] }],
  }) as Slide;

describe("deep-dive slides stand on night", () => {
  it("marks the divider, a deepdive section and a deepdive pill map, nothing else", () => {
    expect(isDeepDive({ type: "deep-dive-divider" })).toBe(true);
    expect(isDeepDive({ type: "content", sectionTheme: "deepdive" })).toBe(true);
    expect(isDeepDive(pills("deepdive"))).toBe(true);
    expect(isDeepDive(pills("secondary"))).toBe(false);
    expect(isDeepDive({ type: "content", sectionTheme: "secondary" })).toBe(false);
  });

  it("renders slide-night on the slide's shell only for deep-dive slides", () => {
    const night = (slide: Slide) => {
      const Component = slideComponents[slide.type];
      const { container } = render(<Component slide={slide} />);
      return container.querySelector(".slide-night") !== null;
    };
    expect(night({ type: "deep-dive-divider", headline: "Part two" } as Slide)).toBe(true);
    expect(night(pills("deepdive"))).toBe(true);
    expect(night(pills("secondary"))).toBe(false);
    expect(
      night({ type: "content", headline: "H", sectionTheme: "deepdive", content: [] } as Slide),
    ).toBe(true);
    expect(night({ type: "content", headline: "H", content: [] } as Slide)).toBe(false);
  });
});
