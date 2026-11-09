import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintDeck } from "../components/slides/PrintSlide";
import { bulletsAsStatement, replacedBy } from "../lib/slide-utils";
import type { ContentSlide } from "../types/slide";

const few = (items: (string | { text: string; children: string[] })[]): ContentSlide => ({
  type: "content",
  sectionLabel: "Origin",
  headline: "Play before plan",
  content: [{ type: "bullets", items }],
});

describe("bulletsAsStatement", () => {
  it("turns a content slide of two short bullets into a statement", () => {
    expect(bulletsAsStatement(few(["Time, no brief.", "That became our lead."]))).toEqual({
      type: "statement",
      kicker: "Origin",
      lines: ["Play before plan"],
      subtitle: "Time, no brief.",
      closing: "That became our lead.",
    });
    expect(bulletsAsStatement(few(["Time, no brief."]))?.closing).toBeUndefined();
    expect(replacedBy(few(["One.", "Two."]))?.to).toBe("statement");
  });

  it("leaves a slide with three bullets, a long bullet, nested items or another block", () => {
    expect(bulletsAsStatement(few(["One.", "Two.", "Three."]))).toBeUndefined();
    expect(bulletsAsStatement(few(["One.", "x".repeat(91)]))).toBeUndefined();
    expect(bulletsAsStatement(few(["One.", { text: "Two.", children: ["a"] }]))).toBeUndefined();
    const more = few(["One.", "Two."]);
    more.content.push({ type: "paragraph", text: "More." });
    expect(bulletsAsStatement(more)).toBeUndefined();
    expect(bulletsAsStatement({ ...few(["One.", "Two."]), subtitle: "Sub" })).toBeUndefined();
    expect(bulletsAsStatement(few([]))).toBeUndefined();
    expect(bulletsAsStatement({ ...few(["One."]), headline: "Ship **daily**" })).toBeUndefined();
    expect(bulletsAsStatement({ ...few(["One."]), sectionTheme: "deepdive" })).toBeUndefined();
    expect(bulletsAsStatement({ ...few(["One."]), badge: "New" })).toBeUndefined();
    const ordered = few(["One.", "Two."]);
    ordered.content = [{ type: "bullets", ordered: true, items: ["One.", "Two."] }];
    expect(bulletsAsStatement(ordered)).toBeUndefined();
  });
});

// slides-density reads the mark off the printed page and fails the deck's slide on it.
describe("PrintSlide", () => {
  it("marks a content slide a statement carries better", () => {
    const { container } = render(
      <PrintDeck
        presentation={{
          name: "Deck",
          slides: [
            few(["One.", "Two."]),
            few(["One.", "Two.", "Three."]),
            {
              type: "regular",
              headline: "Play before plan",
              sections: [{ items: ["One.", "Two."] }],
            },
          ],
        }}
      />,
    );
    const pages = container.querySelectorAll<HTMLElement>(".print-slide");
    expect(pages[0].dataset.use).toBe("statement");
    expect(pages[1].dataset.use).toBeUndefined();
    // A regular slide draws as the content slide regularAsContent makes of it.
    expect(pages[2].dataset.use).toBe("statement");
  });
});
