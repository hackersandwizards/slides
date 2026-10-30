import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("regular slide", () => {
  // A centred slide centres its headline and keeps the headline style.
  it("keeps the title class when centred", () => {
    const SlideComponent = slideComponents.regular;
    const slide = { type: "regular", headline: "Headline", align: "center", sections: [] };
    const { getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText("Headline").classList).toContain("slide-title");
    expect(getByText("Headline").classList).toContain("text-center");
  });

  // Arriving backwards opens every section at once; with no step taken, none stands back.
  it("dims no section when the slide opens fully revealed", async () => {
    sessionStorage.setItem("slide-direction", "back");
    const SlideComponent = slideComponents.regular;
    const slide = {
      type: "regular",
      headline: "Headline",
      sections: [
        { title: "One", items: ["a"] },
        { title: "Two", items: ["b"] },
      ],
    };
    const { container } = render(<SlideComponent slide={slide as Slide} />);
    await act(async () => {});
    expect(container.querySelector(".opacity-60")).toBeNull();
    expect(container.querySelector(".opacity-0")).toBeNull();
  });
});
