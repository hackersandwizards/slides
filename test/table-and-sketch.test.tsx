import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

const content = (block: unknown): Slide =>
  ({ type: "content", headline: "H", content: [block] }) as Slide;

describe("table", () => {
  // A fixed layout let a long word run into the next cell; a hyphen let "Self-serve" split.
  it("lays out automatically and breaks only at spaces", () => {
    const SlideComponent = slideComponents.content;
    const { container, getByText } = render(
      <SlideComponent
        slide={content({
          type: "table",
          widths: [2, 1],
          headers: ["Deliverable", "W1"],
          rows: [
            ["Survey", "Self-serve rollout"],
            ["Übergabe", "Schlüssel-Übergabe"],
          ],
        })}
      />,
    );
    expect(container.querySelector("table")!.className).not.toContain("table-fixed");
    expect(getByText("Self‑serve rollout")).not.toBeNull();
    expect(getByText("Schlüssel\u2011Übergabe")).not.toBeNull();
  });
});

describe("image beside a grid", () => {
  const block = (sketch?: boolean) => ({
    type: "image-and-grid",
    image: { src: "/a.png", alt: "A", sketch },
    items: [{ title: "T", subtitle: "S" }],
  });

  it("frames a screenshot", () => {
    const SlideComponent = slideComponents.content;
    const { getByAltText } = render(<SlideComponent slide={content(block())} />);
    expect(getByAltText("A").className).toContain("border");
  });

  it("stands a sketch on the ground without a frame", () => {
    const SlideComponent = slideComponents.content;
    const { getByAltText } = render(<SlideComponent slide={content(block(true))} />);
    expect(getByAltText("A").className).not.toContain("border");
  });
});
