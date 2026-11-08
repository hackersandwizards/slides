import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { classesIn, compileSlides, unescapeHtml } from "../../catalog/print-css";

// The print stylesheet is compiled from the markup print.ts hands it, not from a scan of the pages,
// so a class the built pages write can miss its rule; a class name alone in the CSS proves nothing.
const NIGHT = "rgb(11, 17, 24)";
const root = join(import.meta.dirname, "..", "..");
const print = join(root, "dist", "catalog", "print");
const shipped = readFileSync(join(print, "build/slides.css"), "utf8");
const pages = ["index.html", "frames.html"].map((page) => readFileSync(join(print, page), "utf8"));
const srcdocs = [...pages[0].matchAll(/srcdoc="([^"]*)"/g)].map(([, doc]) => unescapeHtml(doc));
const classes = [...pages, ...srcdocs].flatMap(classesIn);

// Lines as Tailwind writes them, indentation kept: the same selector nested elsewhere is no match.
const selectors = (css: string) => css.split("\n").filter((line) => /^\s*\..*\{$/.test(line));
const compiler = await compileSlides(root);
const drawn = selectors(compiler.build([...new Set(classes)]));
const absentFrom = (css: string) => {
  const present = new Set(selectors(css));
  return drawn.filter((selector) => !present.has(selector)).map((selector) => selector.trim());
};

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(() => browser?.close());

it("ships a rule for every class the print pages write", () => {
  expect(absentFrom(shipped)).toEqual([]);
});

it("names a rule the stylesheet lacks, though the class still stands in another selector", () => {
  expect(classes).toContain("bg-background");
  expect(shipped).toContain(" .bg-background");
  const without = shipped.replace(/^\s*\.bg-background \{$/m, "");
  expect(absentFrom(without)).toEqual([".bg-background {"]);
});

it("reads a class whose markup is escaped, as a frame writes it", () => {
  expect(classesIn('<p class="[&amp;_strong]:block content-[&#x27;x&#x27;]">')).toEqual([
    "[&_strong]:block",
    "content-['x']",
  ]);
});

it("draws each night tile on the night ground", async () => {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(print, "index.html")).href, { waitUntil: "load" });
  const tiles = await page.$$eval("[data-hw-tile] > .slide-night", (grounds) =>
    grounds.map((ground) => getComputedStyle(ground).backgroundColor),
  );
  await page.close();
  expect(tiles.length).toBeGreaterThan(0);
  expect(tiles.filter((ground) => ground !== NIGHT)).toEqual([]);
}, 60_000);
