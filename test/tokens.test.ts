import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A length a component derives from its data (a bar's share, a column's span, a canvas measured in
// its own units) is computed, not written, and stays.
const ROOT = join(import.meta.dirname, "..");
const FILES = ["components", "lib", "styles"].flatMap((dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" }).map((f) => `${dir}/${f}`),
);
const SOURCES = FILES.filter((f) => /\.tsx?$/.test(f));
// slides.css and the stylesheets beside components it imports; tokens.css defines the tokens.
const SLIDES_CSS = readFileSync(join(ROOT, "styles", "slides.css"), "utf8");
const BESIDE = [...SLIDES_CSS.matchAll(/@import "\.\.\/(components\/[^"]+\.css)"/g)].map(
  ([, f]) => f,
);
const STYLESHEETS = ["styles/slides.css", ...BESIDE];
// Motion interpolates the numbers inside a filter or an observer margin, which a custom property
// hides from it, and these keyframes move only a fade, never a slide's resting layout.
const MOTION = new Set(["components/ui/blur-fade.tsx"]);

// A length with a unit; a full measure (100vh, 100cqi) and a share (50%) are no design values,
// except inside a Tailwind bracket, where a share is a width chosen by hand.
const UNIT = "px|rem|em|ex|ch|lh|vh|vw|vmin|vmax|cqw|cqh|cqi|cqb|pt|mm|cm";
const LENGTH = new RegExp(
  `(?<![\\w.#-])-?(?!100(vh|vw|cqw|cqh|cqi|cqb)\\b)\\d*\\.?\\d+(${UNIT})(?![\\w-])`,
);
// `_` separates the parts of a bracket value, so it bounds a length there.
const BRACKET_LENGTH = new RegExp(`(?<![a-zA-Z\\d.#-])-?\\d*\\.?\\d+(${UNIT}|%)(?![a-zA-Z\\d-])`);
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

/** A stylesheet's `@theme` names with their values: each one is a Tailwind utility. */
export function themeNames(css: string): Map<string, string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return new Map(
    [...text.matchAll(/@theme[^{]*\{([^}]*)\}/g)].flatMap(([, body]) =>
      [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
        ([, name, value]) => [name, value] as const,
      ),
    ),
  );
}

/** Names both stylesheets give a theme value, where the two values differ. */
export function clashes(engine: string, app: string): string[] {
  const names = themeNames(app);
  return [...themeNames(engine)]
    .filter(([name, value]) => names.has(name) && names.get(name) !== value)
    .map(([name]) => name);
}

describe("tokens", () => {
  // A page may load the slide stylesheet beside the app's, and the later `text-accent` then wins
  // over the other's. The heading role is the mono family in both, by two routes. Only the names
  // tokens.css itself sets: those it imports from brand are brand's to keep apart.
  it("no theme name tokens.css sets means one thing on a slide and another in the app", () => {
    const expert = createRequire(import.meta.url).resolve("@hackersandwizards/brand/expert.css");
    expect(
      clashes(
        readFileSync(join(ROOT, "styles", "tokens.css"), "utf8"),
        readFileSync(expert, "utf8"),
      ),
    ).toEqual(["--font-heading"]);
  });

  it("control: a theme name with another value is a clash, the same value is not", () => {
    expect(
      clashes(
        "/* --c: 0; */ @theme { --a: 1; } @theme inline { --b: 2; --d: 4; }",
        "@theme inline { --a: 1; --b: 3; --c: 5; }",
      ),
    ).toEqual(["--b"]);
  });

  // A stylesheet beside a component reaches a page only through slides.css: a component importing
  // it would bring its rules to trainer-hub's hub pages, which render components without slides.css.
  it("slides.css imports every stylesheet beside a component, and no component imports one", () => {
    expect(BESIDE.toSorted()).toEqual(
      FILES.filter((f) => /^(components|lib)\/.*\.css$/.test(f)).toSorted(),
    );
    expect(BESIDE).toContain("components/slides/PrintSlide.css");
    expect(
      SOURCES.filter((f) =>
        /["'][^"'\n]*\.css(\?[^"'\n]*)?["']/.test(code(readFileSync(join(ROOT, f), "utf8"))),
      ),
    ).toEqual([]);
  });

  for (const file of STYLESHEETS)
    it(`${file} names tokens only`, () => {
      expect(rawCssValues(readFileSync(join(ROOT, file), "utf8"))).toEqual([]);
    });

  for (const file of SOURCES.filter((f) => !MOTION.has(f)))
    it(`${file} names tokens only`, () => {
      expect(rawSourceValues(readFileSync(join(ROOT, file), "utf8"))).toEqual([]);
    });

  it("control: every kind of raw value is caught, a token, a breakpoint and a comment are not", () => {
    expect(
      rawSourceValues(
        `// 4rem
        <div className="max-w-[72rem] text-[13rem] leading-[1.05] text-[color-mix(in_srgb,red_60%,blue)] max-w-measure grid-cols-[1fr_auto] grid-cols-[18rem_1fr] my-[calc(var(--a)/2)] w-(--b)" style={{ height: "26.25rem", width: 1920, top: 0, zIndex: 90, left: \`calc(\${x} - 4rem)\`, color: "#fff" }} />;
        const logo = { width: 200 };
        matchMedia("screen and (width < 48rem)"); const w = \`\${share * 100}%\`;`,
      ),
    ).toEqual([
      "max-w-[72rem]",
      "text-[13rem]",
      "leading-[1.05]",
      "text-[color-mix(in_srgb,red_60%,blue)]",
      "grid-cols-[18rem_1fr]",
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

// An inline column template outranks the phone rule in slides.css that stacks every grid into one
// column, so a grid meant to stack sets its count as `--slide-cols` instead. These keep their
// columns on a phone and draw their own phone layout: a flow's steps, a timeline's rail, the
// staggered timeline, a Gantt's months and the phased pills' rows.
it("keeps inline column templates to the grids that keep their columns on a phone", () => {
  const counts = Object.fromEntries(
    SOURCES.map((f) => [
      f,
      readFileSync(join(ROOT, f), "utf8").split("gridTemplateColumns").length - 1,
    ]).filter(([, n]) => n),
  );
  expect(counts).toEqual({
    "components/slides/Visuals.tsx": 3,
    "components/slides/GanttSlide.tsx": 1,
    "components/slides/PhasedPillsSlide.tsx": 2,
  });
});
