import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

// Every person on a slide is coloured by position, in the logo's order: teal first, purple
// second, whoever they are.
const two = [
  { name: "Mara Lindqvist", company: "Lumen Freight" },
  { name: "Jonas Okafor", company: "Lumen Freight" },
];

const cases: { slide: Slide; first: string; second: string }[] = [
  {
    slide: {
      type: "profiles",
      headline: "Who we are",
      profiles: two.map((p) => ({ ...p, title: `Lead ${p.name}`, bullets: [] })),
    },
    first: "Lead Mara Lindqvist",
    second: "Lead Jonas Okafor",
  },
  {
    slide: {
      type: "content",
      headline: "Positions",
      content: [
        {
          type: "positions",
          left: { name: "Mara Lindqvist", stance: "Shared", quote: "One harness." },
          right: { name: "Jonas Okafor", stance: "Owned", quote: "Own conventions." },
          resolution: "Both.",
        },
      ],
    },
    first: "Mara Lindqvist",
    second: "Jonas Okafor",
  },
];

describe("person accents", () => {
  it.each(cases)("$slide.type colours the first person teal, the second purple", (c) => {
    const SlideComponent = slideComponents[c.slide.type];
    const { getByText } = render(<SlideComponent slide={c.slide} />);
    expect(getByText(c.first).className).toContain("text-primary");
    expect(getByText(c.second).className).toContain("text-secondary");
  });

  it("closing contact rings the first speaker teal, the second purple", () => {
    const SlideComponent = slideComponents.closing;
    const slide: Slide = {
      type: "closing",
      variant: "contact",
      line1: "Thank you.",
      speakers: two.map((p) => ({ ...p, imageSrc: "/p.png" })),
    };
    const { getAllByRole } = render(<SlideComponent slide={slide} />);
    const rings = getAllByRole("img", { name: /Mara|Jonas/ }).map((img) => img.parentElement!);
    expect(rings[0].className).toContain("ring-primary");
    expect(rings[1].className).toContain("ring-secondary");
  });
});
