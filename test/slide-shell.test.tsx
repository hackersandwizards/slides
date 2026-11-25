import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GROUNDS, SlideShell, groundOf } from "../components/slides/SlideShell";
import { fitSlide } from "../components/slides/fit-slide";

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

  it("keeps the row layout for an unknown direction", () => {
    expect(shellClass({ children: "x", direction: "toString" as never })).toBe(
      shellClass({ children: "x" }),
    );
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
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("runs fitSlide on mount and marks the slide content as fitted", () => {
    const { container } = render(
      <SlideShell>
        <div className="slide-content">hello</div>
      </SlideShell>,
    );
    const content = container.querySelector<HTMLElement>(".slide-content");
    expect(content).toHaveAttribute("data-fitted", "");
  });

  // A body 25% too tall whose height a wider layout does not change, as a table whose rows keep
  // their lines: shrunk to 0.8, it is laid out at 125% so it still spans the slide's width.
  it("lays a shrunk body out wider even where that gains no height", () => {
    const shell = document.createElement("div");
    const content = document.createElement("div");
    content.className = "slide-content slide-titled";
    const body = document.createElement("div");
    body.className = "slide-body";
    body.textContent = "table";
    Object.defineProperty(body, "clientHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, get: () => 1250 });
    content.append(body);
    shell.append(content);
    document.body.append(shell);

    fitSlide(shell);
    expect(body.style.zoom).toBe("0.8");
    expect(body.style.getPropertyValue("--hw-zoom")).toBe("0.8");
    // jsdom reads the width as declared; a browser reads it in px, which zooms with the body.
    expect(body.style.width).toBe("125%");
  });

  // A centred slide 20% too tall for the space between its edges (5% of its height each, where it
  // has no padding): shrunk from the top edge, never centred in its padding box, which put a
  // centred headline under the strip.
  it.each([
    ["without a body", "", "questions"],
    // An untitled body grows with what it holds, so it read as fitting: a tall picture on a
    // media slide without a headline ran under the strip and the corner.
    ["with an untitled body", "slide-body", "picture"],
  ])("shrinks a slide %s into the space between its edges", (_, childClass, text) => {
    const shell = document.createElement("div");
    const content = document.createElement("div");
    content.className = "slide-content";
    const child = document.createElement("div");
    child.className = childClass;
    child.textContent = text;
    Object.defineProperty(content, "clientHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(child, "offsetTop", { configurable: true, get: () => 0 });
    Object.defineProperty(child, "offsetHeight", { configurable: true, get: () => 1080 });
    content.append(child);
    shell.append(content);
    document.body.append(shell);

    fitSlide(shell);
    // The style serializes a number to six significant digits, as a browser does.
    const zoom = Number(content.style.zoom);
    expect(zoom).toBeCloseTo(900 / 1080, 5);
    expect(Number(content.style.getPropertyValue("--hw-zoom"))).toBeCloseTo(zoom, 5);
    expect(content.style.justifyContent).toBe("flex-start");
    // The top edge in the zoomed box's own pixels, so it draws 50 px down.
    expect(parseFloat(content.style.paddingTop) * zoom).toBeCloseTo(50, 3);
  });
});
