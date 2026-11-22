import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintDeck } from "../components/slides/PrintSlide";
import type { Presentation } from "../types/slide";

const deck: Presentation = {
  name: "Deck",
  theme: "brand-dark",
  logo: { src: "/client.svg", alt: "Client" },
  slideLogos: { 1: null },
  slides: [
    { type: "title", title: "Hello" },
    { type: "statement", lines: ["One thought"] },
  ],
};

// The chrome talks, trainer-hub and hycle-private each copied: one page per slide, the deck's
// logo in the corner, the h&w mark where a slide overrides it with null.
describe("PrintDeck", () => {
  it("prints the confidentiality line on each page, including the title and contact closing", () => {
    const confidential = "Specimen deck, fictional content";
    const { container } = render(
      <PrintDeck
        presentation={{
          ...deck,
          confidential,
          slides: [...deck.slides, { type: "closing", variant: "contact", line1: "Thanks" }],
        }}
      />,
    );
    const pages = container.querySelectorAll(".print-slide");
    expect(pages).toHaveLength(3);
    for (const page of pages) {
      expect(page.querySelector(".slide-confidential")?.textContent).toBe(confidential);
    }
    expect(pages[2].querySelector(".slide-closing-mark")).not.toBeNull();
  });

  it("adds no footer row or text when the field is unset", () => {
    const { container } = render(<PrintDeck presentation={deck} />);
    expect(container.querySelector(".slide-footer, .slide-confidential")).toBeNull();
    expect(container.querySelectorAll(".print-slide > .print-watermark")).toHaveLength(2);
  });
  // The server's slides waited unfitted and shifted once the fit guard shrank them (CLS 0.097):
  // they come hidden and show once hydration has fitted them.
  it("marks the server's slides unfitted and clears the mark once rendered", () => {
    expect(renderToString(<PrintDeck presentation={deck} />)).toContain("data-print-unfitted");
    const { container } = render(<PrintDeck presentation={deck} />);
    expect(container.querySelectorAll(".print-slide")).toHaveLength(2);
    expect(container.querySelector("[data-print-unfitted]")).toBeNull();
  });

  it("prints every slide with the strip, the theme and its corner logos", () => {
    const { container } = render(<PrintDeck presentation={deck} />);
    const pages = container.querySelectorAll(".print-slide.theme-brand-dark");
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page.getAttribute("data-theme")).toBe("dark");
      expect(page.hasAttribute("data-hw-night")).toBe(true);
    }
    expect(pages[0].querySelector(".hw-strip")).not.toBeNull();
    expect(pages[0].querySelector('.print-watermark img[alt="Client"]')).not.toBeNull();
    expect(pages[1].querySelector('.print-watermark img[alt="Client"]')).toBeNull();
    expect(pages[1].querySelector(".print-watermark .hw-wordmark")).not.toBeNull();
  });

  // Print drew every logo of a list in the corner and none for an empty list, where the screen
  // stands the last in the corner, the others at the bottom left and the h&w mark for an empty one.
  it("stands a logo list as the screen does", () => {
    const { container } = render(
      <PrintDeck
        presentation={{
          ...deck,
          slideLogos: {
            0: [
              { src: "/a.svg", alt: "A" },
              { src: "/b.svg", alt: "B" },
            ],
            1: [],
          },
        }}
      />,
    );
    const pages = container.querySelectorAll(".print-slide");
    expect(
      [...pages[0].querySelectorAll(".print-watermark img")].map((i) => i.getAttribute("alt")),
    ).toEqual(["B"]);
    expect(pages[0].querySelector('.slide-corner-start img[alt="A"]')).not.toBeNull();
    expect(pages[1].querySelector(".print-watermark .hw-wordmark")).not.toBeNull();
  });
});
