import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckTile } from "../components/deck/DeckTile";
import { DeckLang } from "../components/slides/SlideShell";
import { PrintProvider } from "../lib/print-context";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

// The words the engine prints itself were English on German decks (F16).
const shown = (slide: object, lang: "en" | "de") =>
  render(
    <DeckLang.Provider value={lang}>
      <PrintProvider>
        {(() => {
          const Slide = slideComponents[(slide as Slide).type];
          return <Slide slide={slide as never} />;
        })()}
      </PrintProvider>
    </DeckLang.Provider>,
  ).container.textContent;

const cycle = (index?: number) => ({
  type: "chart",
  variant: "cycle",
  headline: "H",
  segments: [
    { label: "A", percentage: 50 },
    { label: "B", percentage: 50 },
  ],
  currentSegmentIndex: index,
});

describe("the engine's own words", () => {
  it("follow the deck's language", () => {
    const guidance = {
      type: "comparison",
      variant: "guidance",
      headline: "H",
      examples: [{ title: "T", bad: "b", good: "g" }],
    };
    expect(shown(guidance, "de")).toMatch(/Schlecht.*Gut/);
    expect(shown(guidance, "en")).toMatch(/Bad.*Good/);
    expect(shown({ type: "closing", variant: "discussion" }, "de")).toContain("Diskussion");
    expect(shown(cycle(1), "de")).toContain("Wir sind hier");
    expect(shown(cycle(1), "en")).toContain("We are here");
  });

  it("mark no segment of a cycle chart that names none", () => {
    expect(shown(cycle(), "en")).not.toContain("We are here");
  });

  it("count a deck's slides in the list's language, one in the singular", () => {
    const tile = (slideCount: number, lang?: "en" | "de") =>
      render(
        <DeckTile
          href="/d"
          title="D"
          slideCount={slideCount}
          family={{ label: "F" }}
          lang={lang}
        />,
      ).container.textContent;
    expect(tile(1)).toContain("1 slide");
    expect(tile(1)).not.toContain("1 slides");
    expect(tile(12)).toContain("12 slides");
    expect(tile(1, "de")).toContain("1 Folie");
    expect(tile(12, "de")).toContain("12 Folien");
  });
});
