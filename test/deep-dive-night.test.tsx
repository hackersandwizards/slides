import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { isDeepDive } from "../lib/slide-framing";
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
  it.each<[string, Slide]>([
    ["deep-dive-divider", { type: "deep-dive-divider", headline: "Part two" }],
    ["deepdive phased-pills", pills("deepdive")],
    ["deepdive content", { type: "content", headline: "H", sectionTheme: "deepdive", content: [] }],
  ])("%s sets night attributes on the night shell", (_case, slide) => {
    const Component = slideComponents[slide.type];
    const { container } = render(<Component slide={slide} />);
    const shell = container.querySelector(".slide-night");
    assert(shell, "night slide has a night shell");
    expect({
      theme: shell.getAttribute("data-theme"),
      night: shell.hasAttribute("data-hw-night"),
    }).toEqual({ theme: "dark", night: true });
  });

  it.each<[string, Slide]>([
    ["secondary phased-pills", pills("secondary")],
    ["day content", { type: "content", headline: "H", content: [] }],
  ])("%s has no night shell", (_case, slide) => {
    const Component = slideComponents[slide.type];
    const { container } = render(<Component slide={slide} />);
    expect(container.querySelector(".slide-night")).toBeNull();
  });
});
