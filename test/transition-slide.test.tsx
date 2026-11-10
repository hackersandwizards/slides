import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { TransitionSlide } from "../components/slides/TransitionSlide";

// A divider headline breaks only at a space, as a content slide's table cell does: "production-ready"
// moves to the next line whole, its hyphen the one typed, so a copy or a search finds the word.
it("keeps a hyphenated word in the headline whole", () => {
  const { getByText } = render(
    <TransitionSlide
      slide={{ type: "transition", headline: "Can AI create production-ready\nsoftware?" }}
    />,
  );
  expect(getByText("production-ready").className).toBe("inline-block");
  expect(getByText(/^Can AI/).textContent).toBe("Can AI create production-ready\nsoftware?");
});
