import { render } from "@testing-library/react";
import verbal from "@hackersandwizards/brand/verbal.json";
import { describe, expect, it } from "vitest";
import { ClosingSlide } from "../components/slides/ClosingSlide";
import { PrintSlide } from "../components/slides/PrintSlide";
import { SlideContainer } from "../components/slides/SlideContainer";
import type { ClosingSlide as Closing, Presentation } from "../types/slide";

const closing: Closing = { type: "closing", line1: "Danke." };
const text = (ui: React.ReactElement) => render(ui).container.textContent ?? "";

describe("a contact closing's claim", () => {
  it("takes the deck's language in print and on screen", () => {
    const deck: Presentation = {
      name: "D",
      slides: [{ type: "title", title: "T", lang: "de" }, closing],
    };
    expect(text(<PrintSlide presentation={deck} index={1} />)).toContain(verbal.claim.de);
    expect(
      text(
        <SlideContainer lang="de">
          <ClosingSlide slide={closing} />
        </SlideContainer>,
      ),
    ).toContain(verbal.claim.de);
  });

  it("is English outside a frame and on a screen given no language, absent when off", () => {
    expect(text(<ClosingSlide slide={closing} />)).toContain(verbal.claim.en);
    expect(
      text(
        <SlideContainer>
          <ClosingSlide slide={closing} />
        </SlideContainer>,
      ),
    ).toContain(verbal.claim.en);
    expect(text(<ClosingSlide slide={{ ...closing, claim: false }} />)).not.toContain(
      verbal.claim.en,
    );
  });
});
