import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Image from "../components/ui/image";
import { PrintProvider } from "../lib/print-context";

const img = (ui: React.ReactNode) => render(ui).container.querySelector("img");

// The print route stacks every slide, so a lazy image below the first screen exports empty.
describe("Image", () => {
  it("loads eagerly on the print route and lazily elsewhere", () => {
    expect(
      img(
        <PrintProvider>
          <Image src="/x.png" />
        </PrintProvider>,
      )?.getAttribute("loading"),
    ).toBe("eager");
    expect(img(<Image src="/x.png" />)?.getAttribute("loading")).toBe("lazy");
  });

  it("draws a mark a deck names by its root path from brand's exports", () => {
    expect(img(<Image src="/hw-lockup-night.svg" />)?.getAttribute("src")).toMatch(
      /brand\/logos\/lockup-night\.svg/,
    );
  });

  it.each(["/hw-lockup-screen.svg", "/hw-constructor.svg", "/deck/photo.jpg"])(
    "leaves %s as it stands",
    (path) => {
      expect(img(<Image src={path} />)?.getAttribute("src")).toBe(path);
    },
  );
});
