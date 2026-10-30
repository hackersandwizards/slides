import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("AgendaSlide", () => {
  it("renders the headline and every item from the registry", () => {
    const slide: Slide = {
      type: "agenda",
      headline: "Agenda",
      items: ["Der Auftrag", "Warum es so aufgebaut ist", "Die fünf Schritte"],
    };
    const SlideComponent = slideComponents.agenda;
    const { getByText } = render(<SlideComponent slide={slide} />);
    expect(getByText("Agenda")).toBeTruthy();
    for (const item of slide.items) {
      expect(getByText(item)).toBeTruthy();
    }
  });
});
