import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { profileLabel, regularAsContent } from "../lib/slide-utils";
import type { RegularSlide, Slide } from "../types/slide";

describe("regular slide", () => {
  it("keeps the title class when it renders as content", () => {
    const SlideComponent = slideComponents.regular;
    const slide = { type: "regular", headline: "Headline", sections: [] };
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

// The profile slide's headline is the shared title part, so a hyphenated compound wraps whole.
it("keeps a compound in a profile slide's headline whole", () => {
  const slide = {
    type: "regular",
    headline: "Agent-first delivery",
    profile: { name: "Mara", title: "Partner" },
    sections: [{ title: "One", items: ["a"] }],
  } as Slide;
  const title = render(<slideComponents.regular slide={slide} />).container.querySelector("h1");
  expect(title?.querySelector(".inline-block")?.textContent).toBe("Agent-first");
});

// The web decides: fields no slide draws leave the types, so a deck setting one fails its typecheck.
describe("fields the web never drew", () => {
  it("are rejected by the types", () => {
    const slides: Slide[] = [
      // @ts-expect-error a regular slide takes no `align`
      { type: "regular", headline: "H", sections: [], align: "center" },
      // @ts-expect-error a regular slide takes no `activeSection`
      { type: "regular", headline: "H", sections: [], activeSection: 1 },
      // @ts-expect-error a grid card takes no `tone`
      { type: "grid", headline: "H", cards: [{ title: "T", tone: "primary" }] },
      // @ts-expect-error figures take no `columns`
      { type: "grid", variant: "stats", headline: "H", cards: [], columns: 3 },
      // @ts-expect-error quotes are not numbered
      { type: "grid", variant: "quotes", headline: "H", cards: [], numberFrom: 2 },
      {
        type: "gantt",
        headline: "H",
        columns: ["M1"],
        // @ts-expect-error every bar takes the one data hue
        rows: [{ label: "R", bars: [{ label: "B", start: 1, span: 1, theme: "accent" }] }],
      },
      // The control: pillars and quotes keep their columns.
      { type: "grid", variant: "quotes", headline: "H", cards: [], columns: 3 },
    ];
    expect(slides).toHaveLength(7);
  });
});
