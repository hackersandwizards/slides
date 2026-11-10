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

// Each tile's drawn mark, and the mark of a plot still growing: a bar group without its bar, an
// area under the clip recharts widens.
it.each([
  ["chart-trend", ".recharts-area-curve", ".recharts-area [clip-path]"],
  ["chart-bar", ".recharts-bar-rectangle path", ".recharts-bar-rectangle:not(:has(path))"],
])(
  "draws the plot of the %s tile at once",
  async (id, drawn, growing) => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1600, height: 1000 });
      await page.goto(`${dist.origin}/slides/catalog/print/`, { waitUntil: "load" });
      const handle = await page.waitForSelector(`[id="${id}"] iframe`);
      await handle!.scrollIntoView();
      const frame = await handle!.contentFrame();
      // A tile opens its slide revealed, the plot drawn at once: grown, its bars stayed out for
      // seconds.
      await frame.waitForSelector("svg :is(.recharts-bar-rectangle, .recharts-area-curve)", {
        timeout: 20_000,
      });
      expect(await frame.$$eval(`svg ${drawn}`, (marks) => marks.length)).toBeGreaterThan(0);
      expect(await frame.$$eval(`svg ${growing}`, (marks) => marks.length)).toBe(0);
    } finally {
      await page.close();
    }
  },
  60_000,
);
