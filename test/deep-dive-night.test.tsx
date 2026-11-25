import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isDeepDive } from "../lib/slide-utils";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
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

  // The night class alone leaves the brand elements on day. These two attributes turn on night.
  const dark = { theme: "dark", night: true };
  it.each<[string, Slide, typeof dark | null]>([
    ["deep-dive-divider", { type: "deep-dive-divider", headline: "Part two" }, dark],
    ["deepdive phased-pills", pills("deepdive"), dark],
    ["secondary phased-pills", pills("secondary"), null],
    [
      "deepdive content",
      { type: "content", headline: "H", sectionTheme: "deepdive", content: [] },
      dark,
    ],
    ["day content", { type: "content", headline: "H", content: [] }, null],
  ])("%s has the expected night shell", (_case, slide, expected) => {
    const Component = slideComponents[slide.type];
    const { container } = render(<Component slide={slide} />);
    const shell = container.querySelector(".slide-night");
    const night = shell && {
      theme: shell.getAttribute("data-theme"),
      night: shell.hasAttribute("data-hw-night"),
    };
    expect(night).toEqual(expected);
  });
});
