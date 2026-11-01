import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { renderMarkdown } from "../lib/markdown";
import type { Slide } from "../types/slide";

const content = (blocks: unknown[]) =>
  render(
    <slideComponents.content
      slide={{ type: "content", headline: "H", content: blocks } as Slide}
    />,
  ).container;

describe("content blocks", () => {
  // Beside bars a callout leaves the value column free, but only where that column exists:
  // on a phone the value drops under the track and the callout takes the full width.
  it("narrows a callout beside bars from the md breakpoint only", () => {
    const c = content([
      { type: "bars", bars: [{ label: "a", value: 50, display: "50%" }] },
      { type: "callout", text: "Note" },
    ]);
    const box = c.querySelector("p.text-xl")?.parentElement;
    expect(box?.className).toContain("md:w-[calc(100%-16rem)]");
    expect(box?.className.split(" ")).not.toContain("w-[calc(100%-16rem)]");
  });

  // An empty labels object adds no label column.
  it("gives a timeline with empty labels no extra column", () => {
    const c = content([
      {
        type: "timeline",
        labels: {},
        events: [
          { when: "1", title: "a" },
          { when: "2", title: "b" },
        ],
      },
    ]);
    const grid = [...c.querySelectorAll<HTMLElement>("div")].find((d) =>
      d.style.gridTemplateColumns.includes("repeat("),
    );
    expect(grid?.style.gridTemplateColumns.startsWith("auto")).toBe(false);
  });

  // Annotated code takes the code panel's faint frame, as every code block does; its own ink
  // frame turned near-white on the night ground, the loudest element on the slide.
  it("frames annotated code as the code panel", () => {
    const c = content([{ type: "annotated-code", code: "a", notes: [] }]);
    expect(c.querySelector("pre")?.className.split(" ")).toEqual(
      expect.arrayContaining(["border-white/7", "bg-code-bg"]),
    );
    expect(c.querySelector("pre")?.className).not.toMatch(/border-(text|4)\b/);
  });
});

describe("inline code", () => {
  // A phone may break long inline code; only from md does a chip stay on one line.
  it("keeps inline code wrappable below md", () => {
    const { container } = render(<p>{renderMarkdown("run `a b c`")}</p>);
    const cls = container.querySelector("code")?.className.split(" ") ?? [];
    expect(cls).not.toContain("whitespace-nowrap");
  });
});
