import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every value a slide draws is a named token of styles/tokens.css: colours, type steps, tracking,
// leading, measures, spacing, rules, marks. slides.css and the components name tokens only, so a
// value changes in one place and no slide type carries a value of its own. A length a component
// derives from its data (a bar's share, a column's span, a canvas measured in its own units) is
// computed, not written, and stays.
const ROOT = join(import.meta.dirname, "..");
const SOURCES = ["components", "lib"].flatMap((dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`),
);
// Motion keyframes: motion interpolates the numbers inside a filter or an observer margin, which a
// custom property hides from it. They move a fade, never a slide's resting layout.
const MOTION = new Set(["components/ui/blur-fade.tsx"]);

// A length with a unit; a full measure (100vh, 100cqw) and a share (50%) are no design values,
// except inside a Tailwind bracket, where a share is a width chosen by hand.
const UNIT = "px|rem|em|ex|ch|lh|vh|vw|vmin|vmax|cqw|cqh|pt|mm|cm";
const LENGTH = new RegExp(
  `(?<![\\w.#-])-?(?!100(vh|vw|cqw|cqh)\\b)\\d*\\.?\\d+(${UNIT})(?![\\w-])`,
);
const BRACKET_LENGTH = new RegExp(`(?<![\\w.#-])-?\\d*\\.?\\d+(${UNIT}|%)(?![\\w-])`);
const COLOUR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
const NAMED_COLOUR = /:[^;{}]*(?<![\w-])(white|black|red|green|blue|gr[ae]y|teal|purple)(?![\w-])/;

/** Source with comments left out, so a comment may name a value. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Every raw value in a component or lib source: a Tailwind bracket holding a length, a colour
 *  or a bare line height, and a string or numeric style value holding a length or a colour. A
 *  media query's breakpoint is Tailwind's `md`, which no custom property can name. */
export function rawSourceValues(text: string): string[] {
  const found: string[] = [];
  const source = code(text);
  for (const [, utility, value] of source.matchAll(/([\w:-]*?)-\[([^\]\s"'`]+)\]/g))
    if (
      BRACKET_LENGTH.test(value) ||
      COLOUR.test(value) ||
      value.startsWith("color-mix(") ||
      /(^|:)leading$/.test(utility)
    )
      found.push(`${utility}-[${value}]`);
  const strings = source.replace(/[\w:-]*-\[[^\]\s"'`]+\]/g, "");
  for (const [literal] of strings.matchAll(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g))
    if (
      (LENGTH.test(literal) || COLOUR.test(literal)) &&
      !/\(\s*(min-|max-)?width\s*[<>:]/.test(literal)
    )
      found.push(`literal ${literal}`);
  for (const [, style] of source.matchAll(/\bstyle=\{\{([\s\S]*?)\}\}/g))
    for (const [declaration] of style.matchAll(/\b[a-zA-Z]+: -?(?!0\b)\d+(\.\d+)?\b(?!\s*[*/+-])/g))
      if (!/^(zIndex|opacity|flex|order|gridColumn|gridRow|scale)\b/.test(declaration))
        found.push(`style ${declaration}`);
  return found;
}

/** Every raw value in a stylesheet: a length, a colour, a named colour or a bare line height. A
 *  colour mixed from tokens is a derivation, not a value. */
export function rawCssValues(css: string): string[] {
  const text = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/url\([^)]*\)/g, "url()")
    .replace(/@media[^{]*/g, "@media")
    // A page box's size takes no custom property.
    .replace(/@page\s*\{[^}]*\}/g, "");
  const found: string[] = [];
  for (const [declaration] of text.matchAll(/[\w-]+\s*:[^;{}]+;/g))
    if (
      LENGTH.test(declaration) ||
      COLOUR.test(declaration) ||
      NAMED_COLOUR.test(declaration) ||
      /^line-height:\s*[\d.]+/.test(declaration)
    )
      found.push(declaration.trim());
  return found;
}

describe("tokens", () => {
  it("styles/slides.css names tokens only", () => {
    expect(rawCssValues(readFileSync(join(ROOT, "styles", "slides.css"), "utf8"))).toEqual([]);
  });

  for (const file of SOURCES.filter((f) => !MOTION.has(f)))
    it(`${file} names tokens only`, () => {
      expect(rawSourceValues(readFileSync(join(ROOT, file), "utf8"))).toEqual([]);
    });

  it("control: every kind of raw value is caught, a token, a breakpoint and a comment are not", () => {
    expect(
      rawSourceValues(
        `// 4rem
        <div className="max-w-[72rem] text-[13rem] leading-[1.05] text-[color-mix(in_srgb,red_60%,blue)] max-w-measure grid-cols-[1fr_auto] my-[calc(var(--a)/2)] w-(--b)" style={{ height: "26.25rem", width: 1920, top: 0, zIndex: 90, left: \`calc(\${x} - 4rem)\`, color: "#fff" }} />;
        const logo = { width: 200 };
        matchMedia("screen and (width < 48rem)"); const w = \`\${share * 100}%\`;`,
      ),
    ).toEqual([
      "max-w-[72rem]",
      "text-[13rem]",
      "leading-[1.05]",
      "text-[color-mix(in_srgb,red_60%,blue)]",
      'literal "26.25rem"',
      "literal `calc(${x} - 4rem)`",
      'literal "#fff"',
      "style width: 1920",
    ]);
    expect(
      rawCssValues(
        `/* 4rem */ @media (width >= 48rem) { a { padding: 5.5rem 0 0; color: #fff; line-height: 1.1; gap: var(--slide-gap); background: url("x.png"); height: 100vh; width: 50%; border-color: white; fill: color-mix(in srgb, var(--a) 7%, transparent); } } @page { size: 1920px 1080px; }`,
      ),
    ).toEqual([
      "padding: 5.5rem 0 0;",
      "color: #fff;",
      "line-height: 1.1;",
      "border-color: white;",
    ]);
  });
});
