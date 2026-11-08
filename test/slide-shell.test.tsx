import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GROUNDS, SlideShell, groundOf } from "../components/slides/SlideShell";

// A ground whose class slides.css lacks draws no background at all.
const css = readFileSync("styles/slides.css", "utf8");
it.each(Object.values(GROUNDS))("slides.css defines %s", (name) => {
  expect(css).toContain(`.${name} {`);
});

function shellClass(props: Parameters<typeof SlideShell>[0]): string {
  const { container } = render(<SlideShell {...props} />);
  return (container.firstChild as HTMLElement).className;
}

describe("SlideShell", () => {
  it("defaults to a row layout with the intro background and no overflow clip", () => {
    const cls = shellClass({ children: "x" });
    expect(cls).toContain("relative flex min-h-screen items-center justify-center");
    expect(cls).toContain("bg-section-intro");
    expect(cls).not.toContain("flex-col");
    expect(cls).not.toContain("overflow-hidden");
  });

  it('adds flex-col for direction="col"', () => {
    expect(shellClass({ children: "x", direction: "col" })).toContain("flex-col");
  });

  it("adds overflow-hidden when overflowHidden is set", () => {
    expect(shellClass({ children: "x", overflowHidden: true })).toContain("overflow-hidden");
  });

  it("draws the named ground instead of the default", () => {
    const cls = shellClass({ children: "x", ground: "primary" });
    expect(cls).toContain("bg-section-primary");
    expect(cls).not.toContain("bg-section-intro");
  });

  it("reads the deprecated background class as its ground, and no other class", () => {
    expect(groundOf({ background: "bg-section-accent" })).toBe("accent");
    expect(groundOf({ ground: "success", background: "bg-section-accent" })).toBe("success");
    expect(groundOf({ background: "bg-section-growth" as never })).toBe("intro");
    expect(groundOf({})).toBe("intro");
  });

  it("appends className extras (e.g. text-text)", () => {
    expect(shellClass({ children: "x", className: "text-text" })).toContain("text-text");
  });

  it("renders its children", () => {
    const { getByText } = render(<SlideShell>hello</SlideShell>);
    expect(getByText("hello")).toBeInTheDocument();
  });
});

describe("fit guard", () => {
  // A body 25% too tall whose height a wider layout does not change, as a table whose rows keep
  // their lines: shrunk to 0.8, it is laid out at 125% so it still spans the slide's width.
  it("lays a shrunk body out wider even where that gains no height", () => {
    const height = (el: HTMLElement, client: number, scroll: number) => {
      Object.defineProperty(el, "clientHeight", { configurable: true, get: () => client });
      Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => scroll });
    };
    const original = HTMLElement.prototype.querySelector;
    HTMLElement.prototype.querySelector = function (this: HTMLElement, selector: string) {
      const el = original.call(this, selector) as HTMLElement | null;
      if (el?.classList.contains("slide-body")) height(el, 1000, 1250);
      return el;
    } as typeof original;
    try {
      const { container } = render(
        <SlideShell>
          <div className="slide-content slide-titled">
            <div className="slide-body">table</div>
          </div>
        </SlideShell>,
      );
      const body = container.querySelector<HTMLElement>(".slide-body")!;
      expect(body.style.zoom).toBe("0.8");
      expect(body.style.getPropertyValue("--hw-zoom")).toBe("0.8");
      expect(body.style.scale).toBe("");
      // jsdom reads the width as declared; a browser reads it in px, which zooms with the body.
      expect(body.style.width).toBe("125%");
    } finally {
      HTMLElement.prototype.querySelector = original;
    }
  });

  // A centred slide 20% too tall for the space between its edges (5% of its height each, where it
  // has no padding): shrunk from the top edge, never centred in its padding box, which put a
  // centred headline under the strip.
  it.each([
    ["without a body", <div key="q">questions</div>],
    // An untitled body grows with what it holds, so it read as fitting: a tall picture on a
    // media slide without a headline ran under the strip and the corner.
    [
      "with an untitled body",
      <div key="b" className="slide-body">
        picture
      </div>,
    ],
  ])("shrinks a slide %s into the space between its edges", (_, child) => {
    const original = HTMLElement.prototype.querySelector;
    HTMLElement.prototype.querySelector = function (this: HTMLElement, selector: string) {
      const el = original.call(this, selector) as HTMLElement | null;
      if (el?.classList.contains("slide-content")) {
        Object.defineProperty(el, "clientHeight", { configurable: true, get: () => 1000 });
        const child = el.firstElementChild as HTMLElement;
        Object.defineProperty(child, "offsetTop", { configurable: true, get: () => 0 });
        Object.defineProperty(child, "offsetHeight", { configurable: true, get: () => 1080 });
      }
      return el;
    } as typeof original;
    try {
      const { container } = render(
        <SlideShell>
          <div className="slide-content">{child}</div>
        </SlideShell>,
      );
      const content = container.querySelector<HTMLElement>(".slide-content")!;
      // The style serializes a number to six significant digits, as a browser does.
      const zoom = Number(content.style.zoom);
      expect(zoom).toBeCloseTo(900 / 1080, 5);
      expect(Number(content.style.getPropertyValue("--hw-zoom"))).toBeCloseTo(zoom, 5);
      expect(content.style.justifyContent).toBe("flex-start");
      expect(content.style.marginInline).toBe("auto");
      // The top edge in the zoomed box's own pixels, so it draws 50 px down.
      expect(parseFloat(content.style.paddingTop) * zoom).toBeCloseTo(50, 3);
    } finally {
      HTMLElement.prototype.querySelector = original;
    }
  });
});
