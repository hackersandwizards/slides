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

// A discussion closing stands as a titled slide: its headline where a content slide's is, so five
// questions never push it under the strip.
describe("a discussion closing", () => {
  it("sets its headline as a slide title and its questions in the body", () => {
    const { container } = render(
      <ClosingSlide
        slide={{
          type: "closing",
          variant: "discussion",
          headline: "Q?",
          seedQuestions: ["A", "B"],
        }}
      />,
    );
    expect(container.querySelector(".slide-titled .slide-title")?.textContent).toBe("Q?");
    expect(container.querySelectorAll(".slide-body p")).toHaveLength(2);
    expect(container.querySelector("canvas, [class*='gradient'], [class*='blur-']")).toBeNull();
  });
});

// The partners' logos were the engine's own list of two companies and logo paths only one
// consumer's `public/` held (F13): now each deck names its partners.
describe("a contact closing's partners", () => {
  const speakers = [
    { name: "A", company: "Partner Co" },
    { name: "B", company: "Elsewhere" },
  ];
  it("draws each partner's logo before the lockup, and its speaker without a company line", () => {
    const partners = [{ company: "partner co", src: "/p.png", width: 4, height: 1 }];
    const { container } = render(<ClosingSlide slide={{ ...closing, speakers, partners }} />);
    expect(container.querySelector('img[src="/p.png"]')?.getAttribute("alt")).toBe("partner co");
    expect(container.textContent).not.toContain("Partner Co");
    expect(container.textContent).toContain("Elsewhere");
  });

  it("draws no partner and names every company where the deck names none", () => {
    const { container } = render(<ClosingSlide slide={{ ...closing, speakers }} />);
    expect(container.querySelectorAll("img").length).toBe(2);
    expect(container.textContent).toContain("Partner Co");
  });
});
