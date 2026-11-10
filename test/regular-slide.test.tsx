import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { profileLabel, regularAsContent } from "../lib/slide-utils";
import type { RegularSlide, Slide } from "../types/slide";

describe("regular slide", () => {
  it("keeps the title class when it renders as content", () => {
    const SlideComponent = slideComponents.regular;
    const slide = { type: "regular", headline: "Headline", align: "center", sections: [] };
    const { getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText("Headline").closest(".slide-title")).not.toBeNull();
  });

  // Only a regular slide with a profile keeps its own drawing and its steps.
  it("dims no section when the slide opens fully revealed, and the earlier ones once stepped", async () => {
    const slide = {
      type: "regular",
      headline: "Headline",
      profile: { name: "Mara", title: "Partner" },
      sections: [
        { title: "One", items: ["a"] },
        { title: "Two", items: ["b"] },
      ],
    } as Slide;
    sessionStorage.setItem("slide-direction", "back");
    const back = render(<slideComponents.regular slide={slide} />).container;
    await act(async () => {});
    expect(back.querySelector(".opacity-70")).toBeNull();
    expect(back.querySelector(".opacity-0")).toBeNull();
    back.remove();
    // The control: stepped to the second section, the first is dimmed.
    const stepped = render(<slideComponents.regular slide={slide} />).container;
    for (let i = 0; i < 2; i++)
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
      });
    expect(stepped.querySelectorAll(".opacity-70")).toHaveLength(1);
  });

  // Three and more titled sections are dense cards, five in three columns: drawn as
  // plain cards in four columns, a five-section slide fell from above 0.9 to 0.75 in talks.
  it("draws five titled sections as dense cards in three columns", () => {
    const SlideComponent = slideComponents.regular;
    const slide = {
      type: "regular",
      headline: "Headline",
      sections: [1, 2, 3, 4, 5].map((n) => ({ title: `S${n}`, text: "t" })),
    };
    const { container } = render(<SlideComponent slide={slide as Slide} />);
    const grid = container.querySelector<HTMLElement>(".hw-card")?.parentElement;
    expect(grid?.style.getPropertyValue("--slide-cols")).toBe("3");
    expect(container.querySelector(".hw-card .h-1\\.5")).toBeNull();
  });

  it("shows a profile's LinkedIn address in its short form on one line", () => {
    const slide = {
      type: "regular",
      headline: "Headline",
      profile: {
        name: "Mara",
        title: "Partner",
        linkedIn: "https://www.linkedin.com/in/mara-lindqvist/",
      },
      sections: [{ title: "One", items: ["a"] }],
    };
    const { getByText } = render(<slideComponents.regular slide={slide as Slide} />);
    expect(getByText("in/mara-lindqvist").className).toContain("whitespace-nowrap");
  });

  it.each([
    "https://de.linkedin.com/in/mara-lindqvist",
    "https://www.linkedin.com/in/mara-lindqvist/?originalSubdomain=de",
  ])("shortens %s to in/name", (url) => {
    expect(profileLabel(url)).toBe("in/mara-lindqvist");
  });

  it("keeps a profile's own drawing in the cards layout too", () => {
    const slide: RegularSlide = { type: "regular", headline: "H", layout: "cards", sections: [] };
    expect(
      regularAsContent({ ...slide, profile: { name: "Mara", title: "Partner" } }),
    ).toBeUndefined();
    expect(regularAsContent(slide)?.type).toBe("agenda");
  });
});
