import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { serveDist } from "./serve-dist";

// On a phone (390 px) every numbers and cards grid stacks into one column and every figure fits its
// column on one line. An inline column template once outranked the phone rule, so a two-figure row
// kept its columns and "87,3 %", sized for the stage, ran over the figure beside it (2026-11-08).
const STORIES = [
  "content-slide/visual-numbers",
  "content-slide/visual-numbers-one",
  "content-slide/visual-numbers-six",
  "grid-slide/replaced-by-numbers",
  "content-slide/visual-cards",
  "content-slide/visual-cards-four-columns",
  "content-slide/visual-cards-dense",
  "grid-slide/replaced-by-cards",
];

let browser: Browser;
let dist: Awaited<ReturnType<typeof serveDist>>;
beforeAll(async () => {
  dist = await serveDist();
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  dist?.close();
});

/** Runs in the page: the column count of each counted grid, and each figure's overflow in px. */
function measure() {
  const grids = [...document.querySelectorAll<HTMLElement>(".slide-content .grid")].filter((g) =>
    g.style.getPropertyValue("--slide-cols"),
  );
  const figures = [...document.querySelectorAll<HTMLElement>(".slide-content span.font-heading")];
  const width = document.documentElement.clientWidth;
  return {
    columns: grids.map((g) => getComputedStyle(g).gridTemplateColumns.split(" ").length),
    figures: figures.map((f) => ({
      text: f.textContent,
      over: Math.max(
        f.scrollWidth - f.parentElement!.clientWidth,
        f.getBoundingClientRect().right - width,
      ),
    })),
  };
}

it.each(STORIES)(
  "stacks %s into one column with every figure inside it",
  async (story) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${dist.origin}/slides/stories/Types/${story}/`, { waitUntil: "networkidle0" });
    const { columns, figures } = await page.evaluate(measure);
    await page.close();
    expect(figures.filter(({ over }) => over > 1)).toEqual([]);
    // A lone figure stands in no grid; every other story has one, and a numbers story its figures.
    if (!story.endsWith("-one")) expect(columns.length).toBeGreaterThan(0);
    if (story.includes("numbers")) expect(figures.length).toBeGreaterThan(0);
    expect(columns.filter((n) => n !== 1)).toEqual([]);
  },
  60_000,
);

// A profile's company ran past its card beside the portrait on a phone (209 px of text in 148 px,
// 2026-11-08): there the portrait stands above, and one company in the specimen is one long word.
it.each(["profiles-slide/specimen", "profiles-slide/specimen2"])(
  "keeps every line of %s inside its card on a phone",
  async (story) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${dist.origin}/slides/stories/Types/${story}/`, { waitUntil: "networkidle0" });
    const lines = await page.$$eval(".slide-content :is(h2, p)", (all) =>
      all.map((e) => ({ text: e.textContent, over: e.scrollWidth - e.clientWidth })),
    );
    await page.close();
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.filter(({ over }) => over > 1)).toEqual([]);
  },
  60_000,
);
