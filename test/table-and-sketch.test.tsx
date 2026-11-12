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
    // Each compound whole, as an inline block, its hyphen the one typed (F24: U+2011 rewrote it).
    expect(getByText("Self-serve").className).toBe("inline-block [baseline-source:first]");
    expect(getByText("Schlüssel-Übergabe").className).toBe("inline-block [baseline-source:first]");
  });

  // The stripes are exception `slide-table` in brand-elements.json.
  it("tints every second body row", () => {
    const SlideComponent = slideComponents.content;
    const { container } = render(
      <SlideComponent slide={content({ type: "table", rows: [["a"], ["b"], ["c"]] })} />,
    );
    const tinted = [...container.querySelectorAll("tbody tr")].map((tr) =>
      tr.classList.contains("bg-primary/7"),
    );
    expect(tinted).toEqual([false, true, false]);
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
