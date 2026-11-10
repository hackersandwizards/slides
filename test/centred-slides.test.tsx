import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";

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

  // The subtitle stands outside the rule so it never reads as said.
  it("sets the attribution after the words said, the subtitle after it outside the rule", () => {
    const c = statement({
      lines: ["Said"],
      closing: "Also said",
      closingStyle: "quote",
      subtitle: "Our note",
      attribution: "Mara",
    });
    const text = c.textContent ?? "";
    expect(text.indexOf("Also said")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Also said")).toBeLessThan(text.indexOf("Mara"));
    expect(text.indexOf("Mara")).toBeLessThan(text.indexOf("Our note"));
    expect(c.querySelector(".hw-quote")?.textContent).not.toContain("Our note");
  });

  it("sets a plain closing after the attribution, as the slide's own words", () => {
    const text = statement({ closing: "Our point", attribution: "Mara" }).textContent ?? "";
    expect(text.indexOf("Mara")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Mara")).toBeLessThan(text.indexOf("Our point"));
  });

  it("sets a quotation beside its portrait, behind brand's rule without one", () => {
    const portrait = statement({ attribution: "Mara", imageSrc: "/mara.png" });
    expect(portrait.querySelector(".hw-quote")).toBeNull();
    expect(portrait.querySelector(".hw-avatar > img")).not.toBeNull();
    const plain = statement({ attribution: "Mara" });
    expect(plain.querySelector(".hw-quote")?.textContent).toContain("Mara");
  });

  it("sets the name in ink and what follows the comma in grey", () => {
    const c = statement({ attribution: "Mara Lindqvist, Lumen Freight" });
    expect(c.querySelector("span.font-semibold")?.textContent).toBe("Mara Lindqvist");
  });

  it("sets a footer under a rule, as a content slide does", () => {
    const c = statement({ footer: "Source line" });
    expect(c.querySelector("p.border-t-2")?.textContent).toBe("Source line");
  });

  it("sizes a linked image's frame by the picture's own ratio", () => {
    const c = statement({ linkedImage: { src: "/shot.png", href: "https://example.com" } });
    const img = c.querySelector<HTMLImageElement>("figure img")!;
    Object.defineProperties(img, { naturalWidth: { value: 1600 }, naturalHeight: { value: 1000 } });
    act(() => {
      img.dispatchEvent(new Event("load"));
    });
    expect(img.parentElement?.style.width).toBe("min(100%, 1.6 * var(--slide-picture-max))");
  });

  // The card's padding is the quiet zone: the brand corner cuts no module of a code without one.
  it("stands a QR code beside the lines on a card, its link and alt text from the address", () => {
    const c = statement({ qr: { src: "/qr.png", href: "https://example.com/board" } });
    expect(c.querySelector(".slide-qr .hw-card img")?.getAttribute("alt")).toBe(
      "QR code: example.com/board",
    );
    expect(c.querySelector(".slide-qr")?.textContent).toContain("example.com/board");
  });

  it.each(["quotation", "qr"] as const)("keeps every field in the %s layout", (kind) => {
    const text =
      statement({
        kicker: "Kicker",
        crossedOut: "Crossed",
        subtitle: "Subtitle",
        points: ["Point"],
        closing: "Closing",
        footer: "Footer",
        ...(kind === "qr"
          ? { qr: { src: "/qr.png", href: "https://example.com" } }
          : { attribution: "Mara" }),
      }).textContent ?? "";
    for (const word of ["Kicker", "Crossed", "Subtitle", "Point", "Closing", "Footer"])
      expect(text).toContain(word);
  });
});

// The fit guard and the page's centring both reach `.slide-content` as the shell's own child: a
// wrapper round it left a closing unfitted, and at the left edge of any window over 1920 px.
it.each(slideCatalog.slides.map((slide, i) => [i, slide.type, slide] as const))(
  "keeps specimen slide %i (%s) directly in its shell",
  (_, type, slide) => {
    const SlideComponent = slideComponents[type];
    const { container } = render(<SlideComponent slide={slide} />);
    const content = container.querySelector(".slide-content");
    expect(content?.parentElement?.hasAttribute("data-hw-scale")).toBe(true);
  },
);
