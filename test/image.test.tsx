import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Image from "../components/ui/image";

const srcOf = (src: string) =>
  render(<Image src={src} alt="" />)
    .container.querySelector("img")
    ?.getAttribute("src");

describe("Image", () => {
  it("draws a mark a deck names by its root path from brand's exports", () => {
    expect(srcOf("/hw-lockup-night.svg")).toMatch(
      /@hackersandwizards\/brand\/logos\/lockup-night\.svg/,
    );
  });

  it("leaves any other path as it stands", () => {
    expect(srcOf("/hw-lockup-screen.svg")).toBe("/hw-lockup-screen.svg");
    expect(srcOf("/deck/photo.jpg")).toBe("/deck/photo.jpg");
  });
});
