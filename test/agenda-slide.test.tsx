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
      expect(getByText(item as string)).toBeTruthy();
    }
  });

  // With times the left column holds them instead of the numbers, a time repeated from the row
  // above is left out, and the line under a title and the footer show.
  it("sets a schedule's times in place of the numbers", () => {
    const SlideComponent = slideComponents.agenda;
    const { queryByText, getAllByText, getByText } = render(
      <SlideComponent
        slide={{
          type: "agenda",
          headline: "Tag 1",
          items: [
            { when: "09:00", title: "Ankommen" },
            { when: "09:00", title: "Erwartungen", text: "alle" },
            { when: "10:30", title: "Pause" },
          ],
          footer: "Entscheidung heute",
        }}
      />,
    );
    expect(getAllByText("09:00")).toHaveLength(1);
    expect(queryByText("1.")).toBeNull();
    expect(getByText("alle")).toBeTruthy();
    expect(getByText("Entscheidung heute")).toBeTruthy();
  });
});
