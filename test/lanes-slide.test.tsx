import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("lanes slide", () => {
  // The footer renders inline markdown as every other footer does, never literal asterisks.
  it("renders bold in the footer", () => {
    const SlideComponent = slideComponents.lanes;
    const slide = { type: "lanes", headline: "Lanes", lanes: [], footer: "Run **three** at once" };
    const { container } = render(<SlideComponent slide={slide as Slide} />);
    expect(container.textContent).not.toContain("**");
    expect(container.querySelector("strong")?.textContent).toBe("three");
  });
});
