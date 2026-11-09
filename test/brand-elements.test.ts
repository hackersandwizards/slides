import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { expect, it } from "vitest";
import { brandFile } from "../catalog/brand-urls";
import { STRINGS_OR_COMMENTS } from "../lib/vite";

const ROOT = join(import.meta.dirname, "..");
const ELEMENTS = dirname(brandFile("elements/card.css"));
const SLIDES_CSS = readFileSync(join(ROOT, "styles", "slides.css"), "utf8");

const used = new Set(
  ["components", "lib"]
    .flatMap((dir) =>
      readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
        .filter((f) => /\.(tsx?|css)$/.test(f))
        .map((f) => readFileSync(join(ROOT, dir, f), "utf8")),
    )
    .join("\n")
    .replace(STRINGS_OR_COMMENTS, (_, string?: string) => string ?? "")
    .match(/(?<![\w-])hw-[a-z-]+(?![\w-])/g),
);

/** The classes an element's file defines under its own name (`hw-card`, `hw-card-link`), and a
 *  shorter one its name extends (`hw-arrow` in arrow-link.css). */
const own = (name: string) =>
  [...readFileSync(join(ELEMENTS, `${name}.css`), "utf8").matchAll(/\.(hw-[a-z-]+)/g)]
    .map(([, c]) => c)
    .filter(
      (c) => c === `hw-${name}` || c.startsWith(`hw-${name}-`) || `hw-${name}`.startsWith(`${c}-`),
    );

const drawn = readdirSync(ELEMENTS)
  .filter((f) => f.endsWith(".css"))
  .map((f) => basename(f, ".css"))
  .filter((name) => own(name).some((c) => used.has(c)));
const imported = [
  ...SLIDES_CSS.matchAll(/@import "@hackersandwizards\/brand\/elements\/([\w-]+)\.css"/g),
].map(([, name]) => name);

it("imports no element set whole", () => {
  expect(SLIDES_CSS).not.toMatch(/brand\/elements(\.flat)?\.css/);
});

it("imports the scales and each brand element the slides draw, and no other", () => {
  expect(imported.sort()).toEqual(["scales", ...drawn].sort());
});
