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
