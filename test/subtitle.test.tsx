import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import type { Slide } from "../types/slide";

describe("slide subtitles", () => {
  // A "\n" in a subtitle is an explicit line break, so the text keeps it rather than collapsing it.
  it("keeps an explicit line break", () => {
    const SlideComponent = slideComponents.content;
    const slide = {
      type: "content",
      headline: "H",
      subtitle: "First line\nSecond line",
      content: [],
    };
    const { getByText } = render(<SlideComponent slide={slide as Slide} />);
    expect(getByText(/First line/).className).toContain("whitespace-pre-line");
  });
});
