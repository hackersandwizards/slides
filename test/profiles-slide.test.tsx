import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfilesSlide } from "../components/slides/ProfilesSlide";
import type { ProfilesSlide as ProfilesSlideType } from "../types/slide";

const slide: ProfilesSlideType = {
  type: "profiles",
  headline: "Who is here",
  profiles: [{ name: "Ada", title: "Engineer", company: "h&w", bullets: [] }],
};

describe("ProfilesSlide", () => {
  it("shows a footer line under the portraits when the deck gives one", () => {
    const { getByText } = render(<ProfilesSlide slide={{ ...slide, footer: "We are six." }} />);
    expect(getByText("We are six.")).toBeInTheDocument();
  });

  it("adds nothing without one", () => {
    const { container } = render(<ProfilesSlide slide={slide} />);
    expect(container.querySelectorAll("p.text-center")).toHaveLength(0);
  });
});
