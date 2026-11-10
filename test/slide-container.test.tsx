import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SlideContainer } from "../components/slides/SlideContainer";
import type { LogoConfig } from "../types/slide";

const logo = (name: string): LogoConfig => ({ src: `/${name}.png`, alt: name });
const drawn = (l: LogoConfig[]) =>
  [
    ...render(<SlideContainer logo={l}>slide</SlideContainer>).container.querySelectorAll("img"),
  ].map((img) => img.getAttribute("alt"));

// The type allows any number of logos and the print page draws them all (F08).
describe("SlideContainer with a list of logos", () => {
  it("draws each logo of a list of any length, the h&w mark where it is empty", () => {
    expect(drawn([logo("client")])).toEqual(["client"]);
    expect(drawn([logo("client"), logo("partner"), logo("third")])).toEqual([
      "client",
      "partner",
      "third",
    ]);
    expect(() => drawn([])).not.toThrow();
  });
});
