import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import Image from "../components/ui/image";
import { SlidesAdapterProvider, type AdapterImageProps } from "../lib/adapter";
import { PrintProvider } from "../lib/print-context";

const Framework = ({ loading }: AdapterImageProps) => <i data-loading={loading} />;
const loadingOf = (ui: ReactNode, adapter: boolean) =>
  render(
    adapter ? (
      <SlidesAdapterProvider adapter={{ Image: Framework }}>{ui}</SlidesAdapterProvider>
    ) : (
      ui
    ),
  ).container.firstElementChild?.getAttribute(adapter ? "data-loading" : "loading");

// The print route stacks every slide, so a lazy image below the first screen exports empty.
describe("Image", () => {
  it.each([true, false])("loads eagerly on the print route (adapter: %s)", (adapter) => {
    expect(
      loadingOf(
        <PrintProvider>
          <Image src="/x.png" />
        </PrintProvider>,
        adapter,
      ),
    ).toBe("eager");
  });

  it("leaves an adapter's image to its own loading outside print", () => {
    expect(loadingOf(<Image src="/x.png" />, true)).toBeNull();
  });

  it("draws a mark a deck names by its root path from brand's exports", () => {
    const src = (adapter: boolean) =>
      render(
        <SlidesAdapterProvider
          adapter={adapter ? { Image: (p) => <img src={p.src} alt="" /> } : {}}
        >
          <Image src="/hw-lockup-night.svg" />
        </SlidesAdapterProvider>,
      )
        .container.querySelector("img")
        ?.getAttribute("src");
    expect(src(false)).toMatch(/brand\/logos\/lockup-night\.svg/);
    expect(src(true)).toBe(src(false));
  });

  it.each(["/hw-lockup-screen.svg", "/hw-constructor.svg", "/deck/photo.jpg"])(
    "leaves %s as it stands",
    (path) => {
      const { container } = render(<Image src={path} />);
      expect(container.querySelector("img")?.getAttribute("src")).toBe(path);
    },
  );
});
