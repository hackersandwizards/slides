import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("regular slide", () => {
  // A regular slide renders as a content slide (merge-content), `align` included: the headline
  // keeps the title style.
  it("keeps the title class when it renders as content", () => {
    const SlideComponent = slideComponents.regular;
    const slide = { type: "regular", headline: "Headline", align: "center", sections: [] };
    const { getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText("Headline").closest(".slide-title")).not.toBeNull();
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
