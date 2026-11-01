import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tokens } from "@hackersandwizards/brand/tokens";
import { act, render } from "@testing-library/react";
import githubDark from "shiki/themes/github-dark.mjs";
import { describe, expect, it, vi } from "vitest";
import { CodeLines } from "../lib/use-code-highlight";

const css = readFileSync(join(__dirname, "../styles/tokens.css"), "utf8");
const built = readFileSync(join(__dirname, "../specimen/build/slides.css"), "utf8");
const brand = (name: keyof typeof tokens) => tokens[name];
/** `color-mix(in srgb, a p%, b)` of two hex colours. */
const mix = (a: string, b: string, p: number) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const night = brand("--color-night");
const subtle = mix("#ffffff", night, 0.6);
const muted = mix("#ffffff", night, 0.8);
// The code ground per theme as tokens.css sets it: github-dark's on light decks, the brand-dark
// theme's token on dark ones.
const lightGround = css.match(/--color-code-bg: (#[0-9a-f]{6});/)?.[1] ?? "";
const darkToken = css.match(/--color-code-bg: var\((--color-[a-z0-9-]+)\);/)?.[1];
const grounds = [
  ["light", lightGround, brand("--color-teal")],
  ["dark", brand(darkToken as keyof typeof tokens), brand("--color-teal-night")],
] as const;

/** Renders a code block and waits for Shiki's chunk, as a slide does after mount. */
const block = async (code: string, language?: string) => {
  const view = render(<CodeLines code={code} language={language} />);
  await act(() => vi.dynamicImportSettled());
  return view.container;
};
const colours = async (code: string, language?: string) =>
  [...(await block(code, language)).querySelectorAll("span")].map((span) => [
    span.textContent,
    span.style.color,
  ]);

describe("CodeLines", () => {
  // First in the file: the highlighter loads once per module.
  it("shows the lines in night-muted until Shiki has loaded", () => {
    const { container } = render(<CodeLines code={"name: reviewer\n\nb"} language="yaml" />);
    expect([...container.children].map((line) => line.textContent)).toEqual([
      "name: reviewer",
      "\u00a0",
      "b",
    ]);
    expect(container.querySelector("span")?.className).toBe("text-night-muted");
    expect(contrast(muted, lightGround)).toBeGreaterThanOrEqual(4.5);
  });

  it("colours tokens as the website's github-dark does", async () => {
    expect(await colours("name: reviewer", "yaml")).toContainEqual(["name", "rgb(133, 232, 157)"]);
  });

  it("lifts the theme's comment grey to the brand's night-subtle", async () => {
    expect(await colours("# a comment", "yaml")).toEqual([
      ["# a comment", "var(--slide-code-comment, var(--color-night-subtle))"],
    ]);
  });

  it("renders an unknown language as plain text in the theme's foreground", async () => {
    expect(await colours("plain text", "cobol")).toEqual([["plain text", "rgb(225, 228, 232)"]]);
  });

  it("renders one line per source line, a blank one at full height", async () => {
    const container = await block("a\n\nb");
    expect([...container.children].map((line) => line.textContent)).toEqual(["a", " ", "b"]);
  });

  it("renders angle-bracket content as escaped text, not elements", async () => {
    const container = await block("<script>alert(1)</script>", "typescript");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("sets the dark code ground to night-2, as the PPTX export does, and the utility reads it", () => {
    expect(darkToken).toBe("--color-night-2");
    expect(built).toMatch(/\.bg-code-bg \{\s*background-color: var\(--color-code-bg\);/);
  });

  it.each(grounds)(
    "keeps code text at 4.5:1 or better on the %s code ground",
    (_, ground, teal) => {
      const fg = githubDark.colors?.["editor.foreground"] ?? "";
      // A marked annotated-code line lies under 25 % of the theme's teal, its comment lifted
      // halfway to night-muted (components/slides/Visuals.tsx).
      const marked = mix(teal, ground, 0.25);
      expect(contrast(fg, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(subtle, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(mix(subtle, muted, 0.5), marked)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
