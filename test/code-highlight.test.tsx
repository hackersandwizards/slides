import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tokens } from "@hackersandwizards/brand/tokens";
import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { highlightLines } from "../lib/code-highlight";
import { CodeLines } from "../lib/use-code-highlight";

const css = readFileSync(join(__dirname, "../styles/tokens.css"), "utf8");
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
const lightToken = css.match(/--color-code-bg: var\((--code-bg)\);/)?.[1];
const lightGround = night;
const darkToken = css.match(/--color-code-bg: var\((--color-night-2)\);/)?.[1];
const grounds = [
  ["light", lightGround, brand("--color-teal")],
  ["dark", brand(darkToken as keyof typeof tokens), brand("--color-teal-night")],
] as const;

const block = async (code: string, language?: string) => {
  const view = render(<CodeLines code={code} language={language} />);
  await act(() => vi.dynamicImportSettled());
  return view.container;
};
const classes = async (code: string, language?: string) =>
  [...(await block(code, language)).querySelectorAll("span")].map((span) => [
    span.textContent,
    span.className,
  ]);

describe("CodeLines", () => {
  // First in the file: the highlighter loads once per module.
  it("shows the lines in the panel's text colour until Shiki has loaded", () => {
    const { container } = render(<CodeLines code={"name: reviewer\n\nb"} language="yaml" />);
    expect([...container.children].map((line) => line.textContent)).toEqual([
      "name: reviewer",
      "\u00a0",
      "b",
    ]);
    const span = container.querySelector("span");
    expect(span?.className).toBe("");
    expect(span?.style.color).toBe("");
    expect(container.querySelectorAll("[data-code-plain]")).toHaveLength(3);
  });

  // The PDF export waits until no line carries the marker, an unknown language included.
  it("drops the plain marker once Shiki has loaded", async () => {
    expect((await block("a\nb", "cobol")).querySelector("[data-code-plain]")).toBeNull();
    expect((await block("a: b", "yaml")).querySelector("[data-code-plain]")).toBeNull();
  });

  it("gives each token its brand code role's class, never an inline colour", async () => {
    const container = await block('const a = "b"; // c', "typescript");
    expect([...container.querySelectorAll("span")].every((s) => !s.style.color)).toBe(true);
    expect(await classes('const a = "b"; // c', "typescript")).toEqual(
      expect.arrayContaining([
        ["const", "hw-code-keyword"],
        ['"b"', "hw-code-string"],
        ["// c", "hw-code-comment"],
      ]),
    );
    expect(await classes("name: reviewer", "yaml")).toContainEqual(["name", "hw-code-inserted"]);
  });

  // Shiki stops a line after 500 ms by default and returns its rest as one token, and under load
  // the first line of a language, which compiles the grammar, takes that long.
  it("highlights a line to its end however long the tokenizer takes", () => {
    let now = 0;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => (now += 1000));
    const [line] = highlightLines("// c", "typescript") as ReactElement<{ className?: string }>[][];
    clock.mockRestore();
    expect(line.map((span) => span.props.className)).toContain("hw-code-comment");
  });

  it("maps every colour of the brand theme to a role", async () => {
    const theme = (await import("@hackersandwizards/brand/code-theme.json")).default;
    // A colour outside the six highlightLines knows would render unclassed.
    const known = new Set(
      ["comment", "keyword", "string", "markup.inserted", "markup.deleted"].map(
        (scope) =>
          theme.tokenColors.find((t) => [t.scope].flat().includes(scope))?.settings.foreground,
      ),
    );
    known.add(theme.colors["editor.foreground"]);
    for (const t of theme.tokenColors) expect(known).toContain(t.settings.foreground);
  });

  it("renders an unknown language as plain text in the panel's text colour", async () => {
    expect(await classes("plain text", "cobol")).toEqual([["plain text", ""]]);
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

  it("sets the code ground to the brand's, night-2 on dark decks", () => {
    expect(lightToken).toBe("--code-bg");
    expect(brand("--code-bg")).toBe("var(--color-night)");
    expect(darkToken).toBe("--color-night-2");
  });

  it.each(grounds)(
    "keeps code text at 4.5:1 or better on the %s code ground",
    (_, ground, teal) => {
      const fg = mix("#ffffff", night, 0.92);
      // A marked annotated-code line lies under 25 % of the theme's teal, its comment lifted
      // halfway to night-muted (components/slides/Visuals.tsx).
      const marked = mix(teal, ground, 0.25);
      expect(contrast(fg, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(subtle, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(mix(subtle, muted, 0.5), marked)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
