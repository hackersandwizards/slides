import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlurFade } from "../components/ui/blur-fade";
import { PrintProvider } from "../lib/print-context";

// Benedikt 01.11.2026: „Erste ohne Animation“. The server's markup, which the first slide of a
// load hydrates from, is the fade's end state; a fade mounted later starts hidden.
describe("BlurFade", () => {
  it("renders the first slide of a load visible on the server", () => {
    const html = renderToString(<BlurFade>title</BlurFade>);
    expect(html).toContain("opacity:1");
    expect(html).not.toContain("blur(6px)");
  });

  it("starts a fade mounted after hydration hidden", () => {
    const { container } = render(<BlurFade>title</BlurFade>);
    expect((container.firstChild as HTMLElement).style.opacity).toBe("0");
  });

  it.each(["div", "li"] as const)("renders a plain %s without motion in print mode", (tag) => {
    const { container } = render(
      <PrintProvider>
        <BlurFade as={tag} className="item">
          printed
        </BlurFade>
      </PrintProvider>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe(tag.toUpperCase());
    expect(el.className).toBe("item");
    expect(el.hasAttribute("data-entrance")).toBe(false);
  });

  it("renders an li element with data-entrance when as='li'", () => {
    const { container } = render(<BlurFade as="li">item</BlurFade>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("LI");
    expect(el.hasAttribute("data-entrance")).toBe(true);
  });

  it.each(["unknown", "constructor"])(
    "uses the positive y offset for direction %s",
    (direction) => {
      const { container } = render(<BlurFade direction={direction as never}>moved</BlurFade>);
      expect((container.firstChild as HTMLElement).style.transform).toBe("translateY(6px)");
    },
  );

  it.each(["aside", "constructor"])("renders an animated div for tag %s", (tag) => {
    const { container } = render(<BlurFade as={tag as never}>moved</BlurFade>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveAttribute("data-entrance");
  });

  it.each([
    ["up", "translateY(6px)"],
    ["down", "translateY(-6px)"],
    ["left", "translateX(6px)"],
    ["right", "translateX(-6px)"],
  ] as const)("starts offset along direction %s", (direction, transform) => {
    const { container } = render(<BlurFade direction={direction}>moved</BlurFade>);
    expect((container.firstChild as HTMLElement).style.transform).toContain(transform);
  });
});
