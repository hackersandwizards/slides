import { act, render } from "@testing-library/react";
import { assert, describe, expect, it } from "vitest";
import { ContentSlide } from "../components/slides/ContentSlide";
import type { ContentBlock, ContentSlide as ContentSlideType } from "../types/slide";

const draw = (blocks: ContentBlock[], extra: Partial<ContentSlideType> = {}) =>
  render(
    <ContentSlide slide={{ type: "content", headline: "Headline", content: blocks, ...extra }} />,
  ).container;

describe("TableBlock", () => {
  it("sizes columns proportionally from widths in a colgroup", () => {
    const c = draw([
      {
        type: "table",
        widths: [1, 3],
        headers: ["Col A", "Col B"],
        rows: [["A1", "B1"]],
      },
    ]);
    const widths = [...c.querySelectorAll<HTMLElement>("colgroup col")].map(
      (col) => col.style.width,
    );
    expect(widths).toEqual(["25%", "75%"]);
  });

  it.each([
    { compact: true, tableSize: "text-lg", pad: "px-4" },
    { compact: false, tableSize: "text-xl", pad: "px-6" },
  ])(
    "applies compact=$compact sizing to table, headers and cells",
    ({ compact, tableSize, pad }) => {
      const c = draw([{ type: "table", compact, headers: ["H"], rows: [["Cell"]] }]);
      expect(c.querySelector("table")?.className).toContain(tableSize);
      expect(c.querySelector("th")?.className).toContain(pad);
      expect(c.querySelector("td")?.className).toContain(pad);
    },
  );

  it("reveals the first column then one row at a time when reveal is enabled", () => {
    const c = draw([
      {
        type: "table",
        reveal: true,
        rows: [
          ["R1", "V1"],
          ["R2", "V2"],
        ],
      },
    ]);
    const shown = () =>
      [...c.querySelectorAll("tbody td")].map((td) => td.classList.contains("opacity-100"));
    expect(shown()).toEqual([false, false, false, false]);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
    });
    expect(shown()).toEqual([true, false, true, false]);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
    });
    expect(shown()).toEqual([true, true, true, false]);
  });
});

describe("ContentSlide block rendering", () => {
  it("draws nothing inside the block wrapper for an unknown constructor block", () => {
    const block = { type: "constructor" } as unknown as ContentBlock;
    const c = draw([block]);
    expect(c.querySelector(".slide-blocks > div")?.innerHTML).toBe("");
  });

  it.each([
    {
      mode: "standard",
      blocks: [{ type: "paragraph", text: "Plain **copy**" }],
      slide: {},
      selector: "p strong",
      text: "copy",
    },
    {
      mode: "rule-separated",
      blocks: [{ type: "paragraph", text: "Takeaway", centered: true }],
      slide: { sectionTheme: "success" },
      selector: ".border-t-2.border-green-dark\\/25 p",
      text: "Takeaway",
    },
    {
      mode: "centered-slide",
      blocks: [
        { type: "paragraph", text: "Lead" },
        { type: "terminal", commands: [{ prefix: "$", text: "ls" }] },
      ],
      slide: { layout: "centered" },
      selector: "p.max-w-3xl",
      text: "Lead",
    },
  ] satisfies {
    mode: string;
    blocks: ContentBlock[];
    slide: Partial<ContentSlideType>;
    selector: string;
    text: string;
  }[])("renders a $mode paragraph", ({ blocks, slide, selector, text }) => {
    const c = draw(blocks, slide);
    expect(c.querySelector(selector)?.textContent).toBe(text);
  });

  it("renders ordered and unordered bullets including nested items", () => {
    const c = draw([
      { type: "bullets", ordered: true, items: [{ text: "Step one", children: ["Detail"] }] },
      { type: "bullets", items: ["Plain item"] },
    ]);
    expect(c.querySelector("ol li")?.textContent).toContain("1.");
    expect(c.querySelector("ol ul li")?.textContent).toContain("Detail");
    expect(c.querySelector("ul .hw-marker")).not.toBeNull();
  });

  it("renders two-column cards with titles, fenced code, bullet paragraphs, and items", () => {
    const c = draw([
      {
        type: "two-column",
        variant: "success-error",
        left: { title: "Good", text: "```ts\nconst x = 1;\n```" },
        right: { title: "Bad", text: "Intro\n\n• Bullet A\n• Bullet B", items: ["Extra"] },
      },
    ]);
    expect(c.querySelectorAll(".grid-cols-2 > *")).toHaveLength(2);
    expect(c.querySelector("pre code")?.textContent).toContain("const x = 1;");
    expect(c.querySelectorAll("ul li")).toHaveLength(3);
  });

  it("renders a code block in a code panel", () => {
    const c = draw([{ type: "code", language: "bash", code: "echo hi" }]);
    expect(c.querySelectorAll(".hw-code")).toHaveLength(1);
    expect(c.querySelector(".hw-code code")?.textContent).toBe("echo hi");
  });

  it("renders code and its labelled explanation together", () => {
    const c = draw([
      {
        type: "code-and-text",
        language: "ts",
        code: "let n = 1;",
        sections: [{ title: "Why", text: "Because" }],
      },
    ]);
    expect(c.querySelectorAll(".hw-code")).toHaveLength(1);
    expect(c.querySelector(".hw-code code")?.textContent).toBe("let n = 1;");
    expect(c.querySelector("h2.hw-label")?.textContent).toBe("Why");
  });

  it("renders hook names as inline code", () => {
    const c = draw([
      { type: "hooks", items: [{ name: "pre-commit", description: "Checks staged files" }] },
    ]);
    expect(c.querySelector("code.hw-inline-code")?.textContent).toBe("pre-commit");
  });

  it.each([
    { variant: "info" as const, hue: "purple", exception: undefined },
    { variant: "warning" as const, hue: undefined, exception: "callout-status" },
    { variant: "success" as const, hue: undefined, exception: "callout-status" },
  ])("renders a $variant callout with its brand attributes", ({ variant, hue, exception }) => {
    const c = draw([{ type: "callout", text: "Watch out", variant }]);
    const box = c.querySelector("p.text-xl")?.parentElement;
    assert(box, "callout box rendered");
    expect(box.dataset.hue).toBe(hue);
    expect(box.dataset.hwException).toBe(exception);
  });

  it("renders terminal command prefixes in their respective colours", () => {
    const c = draw([
      {
        type: "terminal",
        commands: [
          { prefix: "$", text: "run" },
          { prefix: "→", text: "ok" },
          { prefix: "#", text: "note" },
        ],
      },
    ]);
    const prefixes = [...c.querySelectorAll(".font-mono span")].map((s) => s.className);
    expect(prefixes).toEqual(["text-(--code-inserted)", "text-amber", "text-(--code-comment)"]);
  });

  it("renders a terminal command with the constructor prefix in the comment colour", () => {
    const c = draw([{ type: "terminal", commands: [{ prefix: "constructor", text: "note" }] }]);
    const prefix = c.querySelector(".font-mono span");
    expect(prefix?.textContent).toBe("constructor");
    expect(prefix?.classList.contains("text-(--code-comment)")).toBe(true);
  });

  it("steps through image-steps on ArrowRight and updates caption", () => {
    const c = draw([
      {
        type: "image-steps",
        alt: "Diagram",
        steps: [
          { src: "/step1.png", caption: "First" },
          { src: "/step2.png", caption: "Second" },
        ],
      },
    ]);
    expect(c.querySelector("figcaption")?.textContent).toBe("First");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
    });
    expect(c.querySelector("figcaption")?.textContent).toBe("Second");
  });
});
