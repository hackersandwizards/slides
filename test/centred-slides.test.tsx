import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

// Title, section divider, closing, statement and centred content slide centre their headline on the ground, with no gradient
// field and no decoration: no particle canvas, no gradient, no glow.
const cases: { slide: Slide; headline: string }[] = [
  {
    slide: { type: "title", title: "Agentic Coding", subtitle: "Two days" },
    headline: "Agentic Coding",
  },
  {
    slide: { type: "transition", preText: "Part two", headline: "The pipeline" },
    headline: "The pipeline",
  },
  {
    slide: {
      type: "closing",
      variant: "contact",
      line1: "Thank you.",
      speakers: [{ name: "Mara Lindqvist", company: "Lumen Freight" }],
    },
    headline: "Thank you.",
  },
  {
    slide: { type: "closing", variant: "discussion", headline: "Questions?" },
    headline: "Questions?",
  },
  {
    slide: {
      type: "statement",
      lines: ["Plans before code"],
      crossedOut: "Code first",
      points: ["The plan is reviewed"],
    },
    headline: "Plans before code",
  },
  {
    slide: {
      type: "content",
      layout: "centered",
      headline: "Two starting points.",
      content: [
        {
          type: "positions",
          left: { name: "Mara", stance: "Shared", quote: "One harness." },
          right: { name: "Jonas", stance: "Owned", quote: "Own conventions." },
          resolution: "Both.",
        },
      ],
    },
    headline: "Two starting points.",
  },
];

describe("centred slides", () => {
  it.each(cases)("$slide.type slide carries no field and no decoration", ({ slide, headline }) => {
    const SlideComponent = slideComponents[slide.type];
    const { container, getByText } = render(<SlideComponent slide={slide} />);
    expect(getByText(headline)).not.toBeNull();
    expect(container.querySelector("canvas, [class*='gradient'], [class*='blur-']")).toBeNull();
  });
});

describe("statement slide", () => {
  const statement = (slide: Partial<Extract<Slide, { type: "statement" }>>) =>
    render(<slideComponents.statement slide={{ type: "statement", lines: ["L"], ...slide }} />)
      .container;

  // A quotation may run from the subtitle into the closing, so its source follows the closing.
  it("sets the attribution after the closing", () => {
    const text =
      statement({ subtitle: "“Start", closing: "end.”", attribution: "Mara" }).textContent ?? "";
    expect(text.indexOf("end.”")).toBeLessThan(text.indexOf("— Mara"));
  });

  it("sets a footer under a rule, as a content slide does", () => {
    const c = statement({ footer: "Source line" });
    expect(c.querySelector("p.border-t-2")?.textContent).toBe("Source line");
  });

  // The frame takes the picture's own shape, so a square QR code is no wide box.
  it("lets a linked image keep its own width", () => {
    const img = statement({
      linkedImage: { src: "/qr.png", href: "https://example.com" },
    }).querySelector("figure img");
    expect(img?.className.split(" ")).toEqual(expect.arrayContaining(["w-auto", "max-w-full"]));
  });
});
