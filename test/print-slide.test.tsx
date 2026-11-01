import { render } from "@testing-library/react";
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
  it("prints every slide with the strip, the theme and its corner logos", () => {
    const { container } = render(<PrintDeck presentation={deck} />);
    const pages = container.querySelectorAll(".print-slide.theme-brand-dark");
    expect(pages).toHaveLength(2);
    expect(pages[0].querySelector(".brand-strip")).not.toBeNull();
    expect(pages[0].querySelector('.print-watermark img[alt="Client"]')).not.toBeNull();
    expect(pages[1].querySelector('.print-watermark img[alt="Client"]')).toBeNull();
    expect(pages[1].querySelector(".print-watermark .hw-wordmark")).not.toBeNull();
  });
});
