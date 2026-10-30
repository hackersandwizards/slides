import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { highlightCode } from "../lib/code-highlight";

const colours = (code: string, language?: string) =>
  [...render(<>{highlightCode(code, language)}</>).container.querySelectorAll("span")].map(
    (span) => [span.textContent, span.style.color],
  );

describe("highlightCode", () => {
  it("colours tokens as the website's github-dark does", () => {
    expect(colours("name: reviewer", "yaml")).toContainEqual(["name", "rgb(133, 232, 157)"]);
  });

  it("lifts the theme's comment grey as the website's comment-contrast transformer does", () => {
    expect(colours("# a comment", "yaml")).toEqual([["# a comment", "rgb(149, 157, 165)"]]);
  });

  it("renders an unknown language as plain text in the theme's foreground", () => {
    expect(colours("plain text", "cobol")).toEqual([["plain text", "rgb(225, 228, 232)"]]);
  });

  it("renders one line per source line, a blank one at full height", () => {
    const { container } = render(<>{highlightCode("a\n\nb")}</>);
    expect([...container.children].map((line) => line.textContent)).toEqual(["a", " ", "b"]);
  });

  it("renders angle-bracket content as escaped text, not elements", () => {
    const { container } = render(<>{highlightCode("<script>alert(1)</script>", "typescript")}</>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });
});
