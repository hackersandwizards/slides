import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";

// Recharts draws in the browser only, so these two tiles frame a story page, which needs the
// `/slides` base a file:// read does not give.
let browser: Browser;
let dist: Served;
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

it.each([
  ["chart-trend", ".recharts-area-curve"],
  ["chart-bar", ".recharts-bar-rectangle"],
])(
  "draws the plot of the %s tile",
  async (id, mark) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    await page.goto(`${dist.origin}/slides/catalog/print/`, { waitUntil: "load" });
    const handle = await page.waitForSelector(`[id="${id}"] iframe`);
    await handle!.scrollIntoView();
    const frame = await handle!.contentFrame();
    await frame.waitForSelector(`svg ${mark}`, { timeout: 20_000 });
    expect(await frame.$$eval(`svg ${mark}`, (marks) => marks.length)).toBeGreaterThan(0);
    await page.close();
  },
  60_000,
);
