import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { TransitionSlide } from "../components/slides/TransitionSlide";

// A divider headline breaks only at a space, as a content slide's table cell does: "production-ready"
// never splits at its hyphen.
it("joins a hyphenated word in the headline with a non-breaking hyphen", () => {
  const { getByText } = render(
    <TransitionSlide
      slide={{ type: "transition", headline: "Can AI create production-ready\nsoftware?" }}
    />,
  );
  expect(getByText(/^Can AI/).textContent).toBe("Can AI create production‑ready\nsoftware?");
});
