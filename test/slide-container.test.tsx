import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SlideContainer } from "../components/slides/SlideContainer";
import { logoSizes } from "../lib/brand-logos";
import { HW_LOGO } from "../lib/logo";
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
    expect(
      render(<SlideContainer logo={[]}>slide</SlideContainer>).container.querySelector(
        ".slide-corner .hw-wordmark",
      ),
    ).not.toBeNull();
  });

  it("sizes the h&w lockup in a list by brand's logos.json, not the default box", () => {
    const img = render(
      <SlideContainer logo={[HW_LOGO, logo("client")]}>slide</SlideContainer>,
    ).container.querySelector(`img[alt="${HW_LOGO.alt}"]`)!;
    expect(img.getAttribute("width")).toBe(String(logoSizes["lockup.svg"].width));
  });
});

describe("SlideContainer on a night deck", () => {
  it("puts the night theme on the viewport, which the brand elements read", () => {
    const viewport = render(<SlideContainer theme="brand-dark">slide</SlideContainer>).container
      .firstElementChild!;
    expect(viewport.getAttribute("data-theme")).toBe("dark");
    expect(viewport.hasAttribute("data-hw-night")).toBe(true);
  });
});
