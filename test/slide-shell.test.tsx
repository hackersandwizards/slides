import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SlideShell } from "../components/slides/SlideShell";

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

  it("uses the provided background instead of the default", () => {
    const cls = shellClass({ children: "x", background: "bg-section-deepdive" });
    expect(cls).toContain("bg-section-deepdive");
    expect(cls).not.toContain("bg-section-intro");
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
          <div className="slide-content">
            <div className="slide-body">table</div>
          </div>
        </SlideShell>,
      );
      const body = container.querySelector<HTMLElement>(".slide-body")!;
      expect(body.style.scale).toBe("0.8");
      expect(body.style.width).toBe("125%");
    } finally {
      HTMLElement.prototype.querySelector = original;
    }
  });
});
