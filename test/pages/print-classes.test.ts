import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { compile } from "@tailwindcss/node";
import puppeteer from "puppeteer";
import { expect, it } from "vitest";

// The print pages' stylesheet is compiled from the markup print.ts hands it, not from a scan of the
// pages: a tile left out of that list drew without its utilities, and the night tiles lost their
// ground (06.11.2026). Here Tailwind compiles every class the built pages write, frames included,
// and each rule it draws must be in the shipped stylesheet. A class name alone proves nothing:
// `.bg-background` stood in the night override of slides.css while its utility was absent.
const print = join(import.meta.dirname, "..", "..", "dist", "catalog", "print");
const shipped = readFileSync(join(print, "build/slides.css"), "utf8");
const stylesheet = join(import.meta.dirname, "..", "..", "styles", "slides.css");

// A frame's markup sits escaped in its srcdoc, so an entity in one of its classes is escaped twice.
const unescaped = (html: string) =>
  [0, 1].reduce(
    (text) =>
      text
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&"),
    html,
  );
const classes = ["index.html", "frames.html"].flatMap((page) =>
  [...unescaped(readFileSync(join(print, page), "utf8")).matchAll(/\bclass="([^"]*)"/g)].flatMap(
    ([, list]) => list.split(/\s+/).filter(Boolean),
  ),
);

const selectors = (css: string) =>
  css
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(".") && line.endsWith("{"));
const compiler = await compile(readFileSync(stylesheet, "utf8"), {
  base: dirname(stylesheet),
  from: stylesheet,
  onDependency: () => {},
});
const drawn = selectors(compiler.build([...new Set(classes)]));
const absentFrom = (css: string) => {
  const present = new Set(selectors(css));
  return drawn.filter((selector) => !present.has(selector));
};

it("ships a rule for every class the print pages write", () => {
  expect(absentFrom(shipped)).toEqual([]);
});

it("names a rule the stylesheet lacks, though the class still stands in another selector", () => {
  expect(classes).toContain("bg-background");
  expect(shipped).toContain(" .bg-background");
  const without = shipped.replace(/^\s*\.bg-background \{$/m, "");
  expect(absentFrom(without)).toEqual([".bg-background {"]);
});

it("draws each night tile on the night ground", async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--use-mock-keychain"] });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(print, "index.html")).href, { waitUntil: "load" });
  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll("[data-hw-tile]")].map((tile) => {
      const [day, night] = [...tile.children].map((c) => getComputedStyle(c).backgroundColor);
      return { name: tile.getAttribute("data-hw-tile"), day, night };
    }),
  );
  await browser.close();
  expect(tiles.length).toBeGreaterThan(0);
  expect(tiles.filter((t) => t.night === "rgba(0, 0, 0, 0)" || t.night === t.day)).toEqual([]);
}, 60_000);
