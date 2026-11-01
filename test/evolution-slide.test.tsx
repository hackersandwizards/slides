import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvolutionSlide } from "../components/slides/EvolutionSlide";
import { PrintProvider } from "../lib/print-context";
import type { EvolutionSlide as EvolutionSlideType } from "../types/slide";

const stage = (multiplier: string, title: string, isHighlighted = false) => ({
  multiplier,
  title,
  subtitle: "",
  description: `${title} desc`,
  isHighlighted,
});

function printed(stages: EvolutionSlideType["stages"]) {
  return render(
    <PrintProvider>
      <EvolutionSlide slide={{ type: "evolution", headline: "Stages", stages }} />
    </PrintProvider>,
  );
}

describe("EvolutionSlide", () => {
  it("sets short multipliers in the tiles", () => {
    const { getByText } = printed([stage("1x", "Chat"), stage("10x", "Harness")]);
    expect(getByText("10x").tagName).toBe("SPAN");
    expect(getByText("10x").nextElementSibling?.tagName).toBe("H3");
  });

  // One label too long for a tile moves every label above its title, and the tiles count.
  it("moves every label above the title when one is too long for a tile", () => {
    const { getByText } = printed([stage("1x", "Chat"), stage("Stage 2", "Harness")]);
    expect(getByText("1x").nextElementSibling?.tagName).toBe("H3");
    expect(getByText("1x").previousElementSibling?.textContent).toBe("1");
  });

  // Print opens with every stage showing: the named stage is the one lit, as on process.
  it("lights the named stage in print", () => {
    const { getByText } = printed([stage("1x", "Chat"), stage("10x", "Harness", true)]);
    expect(getByText("Harness").className).toContain("text-primary");
    expect(getByText("Chat").className).not.toContain("text-primary");
  });
});
