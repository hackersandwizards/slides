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
});
