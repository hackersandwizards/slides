import { render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import type { Slide } from "../types/slide";

describe("lanes slide", () => {
  // The footer renders inline markdown as every other footer does, never literal asterisks.
  it("renders bold in the footer", () => {
    const SlideComponent = slideComponents.lanes;
    const slide = { type: "lanes", headline: "Lanes", lanes: [], footer: "Run **three** at once" };
    const { container } = render(<SlideComponent slide={slide as Slide} />);
    expect(container.textContent).not.toContain("**");
    expect(container.querySelector("strong")?.textContent).toBe("three");
  });

  it("highlights the first lane, dims following lanes, and separates stages with arrows", () => {
    const SlideComponent = slideComponents.lanes;
    const slide = {
      type: "lanes",
      headline: "Lanes",
      codeSnippet: { language: "ts", code: "const n = 2;" },
      lanes: [
        { label: "Lane 1", stages: ["Plan", "Build", "Ship"] },
        { label: "Lane 2", stages: ["Test"] },
      ],
    };
    const { container, getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText("Lane 1").closest(".opacity-100")).not.toBeNull();
    expect(getByText("Lane 2").closest(".opacity-70")).not.toBeNull();
    expect(container.querySelectorAll("span.text-xl")).toHaveLength(2);
    const snippet = container.querySelector("code.font-code");
    assert(snippet, "The lane slide has a code snippet");
    expect(snippet.textContent).toContain("const n = 2;");
  });
});
