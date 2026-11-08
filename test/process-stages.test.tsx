import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessSlide } from "../components/slides/ProcessSlide";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import type { EvolutionSlide as EvolutionSlideType } from "../types/slide";

const stage = (multiplier: string, title: string, isHighlighted = false) => ({
  multiplier,
  title,
  subtitle: "",
  description: `${title} desc`,
  isHighlighted,
});

const Evolution = slideComponents.evolution;

function printed(stages: EvolutionSlideType["stages"]) {
  return render(
    <PrintProvider>
      <Evolution slide={{ type: "evolution", headline: "Stages", stages }} />
    </PrintProvider>,
  );
}

describe("evolution, through the process slide", () => {
  it("sets short multipliers in the tiles", () => {
    const { getByText } = printed([stage("1x", "Chat"), stage("10x", "Harness")]);
    expect(getByText("10x").tagName).toBe("SPAN");
    // The tile draws its text in a span of its own, trimmed to the cap height.
    expect(getByText("10x").parentElement!.nextElementSibling?.tagName).toBe("H2");
  });

  it("moves every label above the title when one is too long for a tile", () => {
    const { getByText } = printed([stage("Basis", "Chat"), stage("Harness", "Harness")]);
    expect(getByText("Basis").nextElementSibling?.tagName).toBe("H2");
    expect(getByText("Basis").previousElementSibling?.textContent).toBe("1");
  });

  // "Stage 1" over a tile reading 1 says the number twice: a label carrying a number leaves the
  // tiles empty.
  it("leaves the tiles empty when a label carries a number", () => {
    const { getByText } = printed([stage("Stage 1", "Chat"), stage("Monat 2 und 3", "Harness")]);
    expect(getByText("Stage 1").previousElementSibling?.textContent).toBe("");
    expect(getByText("Monat 2 und 3").previousElementSibling?.textContent).toBe("");
  });

  // Print opens with every stage showing: the named stage is the one lit, as on process.
  it("lights the named stage in print", () => {
    const { getByText } = printed([stage("1x", "Chat"), stage("10x", "Harness", true)]);
    expect(getByText("Harness").className).toContain("text-primary");
    expect(getByText("Chat").className).not.toContain("text-primary");
  });
});

describe("ProcessSlide, loop false", () => {
  it("draws no loop and no circle", () => {
    const nodes = [
      { title: "Chat", description: "a", label: "1x" },
      { title: "Harness", description: "b", label: "10x" },
    ];
    const { container: once } = render(
      <PrintProvider>
        <ProcessSlide slide={{ type: "process", headline: "S", loop: false, nodes }} />
      </PrintProvider>,
    );
    const { container: cycle } = render(
      <PrintProvider>
        <ProcessSlide slide={{ type: "process", headline: "S", nodes }} />
      </PrintProvider>,
    );
    expect(once.querySelector(".process-canvas")).toBeNull();
    expect(cycle.querySelector(".process-canvas")).not.toBeNull();
    expect(once.textContent).toContain("10x");
  });
});

// On a phone a row of three holds a ten-glyph word per column at most; a longer one, which the
// hyphenator may not split, stacks the steps rather than cutting it ("Autocomplet / e").
describe("FlowSteps on a phone", () => {
  it("stacks the steps where a title's word is wider than its column", () => {
    const row = (titles: string[]) =>
      printed(titles.map((title, i) => stage(`${i}x`, title))).container.querySelector(
        ".slide-flow",
      )!.className;
    expect(row(["Autocomplete", "Chat", "Harness"])).toContain("slide-flow-long");
    expect(row(["Manual", "Chat", "Harness"])).not.toContain("slide-flow-long");
    expect(row(["**Auto**complete", "Chat", "Harness"])).toContain("slide-flow-long");
  });
});
