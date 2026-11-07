import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaSlide } from "../components/slides/MediaSlide";
import type { MediaSlide as MediaSlideType } from "../types/slide";

describe("MediaSlide", () => {
  // The `single` layout (the default when sources.length <= 1) used to
  // dereference sources[0] unguarded, crashing on an empty sources array.
  it("renders without throwing when sources is empty", () => {
    const slide: MediaSlideType = { type: "media", headline: "Empty", sources: [] };
    expect(() => render(<MediaSlide slide={slide} />)).not.toThrow();
  });

  it("renders a single source", () => {
    const slide: MediaSlideType = {
      type: "media",
      sources: [{ src: "/x.png", alt: "x" }],
    };
    const { container } = render(<MediaSlide slide={slide} />);
    expect(container.querySelector("img")).toBeTruthy();
  });

  // The description sat in a sourceless <track>, which no screen reader announces.
  it("names a video by its alt text", () => {
    const slide: MediaSlideType = {
      type: "media",
      sources: [{ src: "/x.mp4", kind: "video", alt: "Agent opens a pull request" }],
    };
    render(<MediaSlide slide={slide} />);
    expect(screen.getByLabelText("Agent opens a pull request").tagName).toBe("VIDEO");
  });

  // A row picture took any height, so a tall one left the stage under the footer.
  it("caps a row picture at the media maximum", () => {
    const slide: MediaSlideType = {
      type: "media",
      layout: "row",
      sources: [{ src: "/x.png", alt: "x", height: 2000 }],
    };
    const { container } = render(<MediaSlide slide={slide} />);
    expect(container.querySelector("img")?.getAttribute("style")).toContain(
      "min(125rem, var(--slide-picture-max-media))",
    );
  });
});
