import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { expect, it } from "vitest";

// slides.css imports brand's elements one by one: the whole elements.css put every app element
// (dialogs, toasts, form fields) into each slide page's render-blocking stylesheet.
const ROOT = join(import.meta.dirname, "..");
const ELEMENTS = dirname(
  createRequire(import.meta.url).resolve("@hackersandwizards/brand/elements/card.css"),
);
// The scales every element reads, and the chosen fill icon-button.css imports itself.
const BASE = new Set(["scales", "chosen"]);

const source = ["components", "lib"]
  .flatMap((dir) =>
    readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(tsx?|css)$/.test(f))
      .map((f) => readFileSync(join(ROOT, dir, f), "utf8")),
  )
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** The classes an element's file defines under its own name (`hw-card`, `hw-card-link`). */
const own = (name: string) => {
  const css = readFileSync(join(ELEMENTS, `${name}.css`), "utf8");
  return [...new Set([...css.matchAll(/\.(hw-[a-z-]+)/g)].map(([, c]) => c))].filter(
    (c) => c === `hw-${name}` || c.startsWith(`hw-${name}-`),
  );
};
const usesClass = (c: string) => new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(source);

const elements = readdirSync(ELEMENTS)
  .filter((f) => f.endsWith(".css") && f !== "elements.css")
  .map((f) => basename(f, ".css"))
  .filter((name) => !BASE.has(name));
const imported = [
  ...readFileSync(join(ROOT, "styles", "slides.css"), "utf8").matchAll(
    /@import "@hackersandwizards\/brand\/elements\/([\w-]+)\.css"/g,
  ),
].map(([, name]) => name);

it("imports no element set whole", () => {
  expect(readFileSync(join(ROOT, "styles", "slides.css"), "utf8")).not.toMatch(
    /brand\/elements(\.flat)?\.css/,
  );
});

it("imports each brand element the slides draw, and no other", () => {
  const used = elements.filter((name) => own(name).some(usesClass));
  expect(imported.filter((name) => !BASE.has(name)).sort()).toEqual(used.sort());
  expect(imported).toContain("scales");
});
