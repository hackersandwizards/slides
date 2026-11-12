import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";
import { limit } from "./limit";

// The dashboard's card on a phone draws a slide's text unreadably small: below 40rem it offers an
// enlarged view across the turned phone.
const STORY = "/slides/dashboard/Types/content-slide/density/";
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

const open = async (width: number, height: number) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(`${dist.origin}${STORY}`, { waitUntil: "networkidle0" });
  return page;
};
const scaleOf = () => {
  const frame = document.querySelector<HTMLIFrameElement>(".story-stage iframe")!;
  const { a, b } = new DOMMatrix(getComputedStyle(frame).transform);
  return Math.hypot(a, b);
};

it(
  "scales the slide from brand's page size with no token from the page's own stylesheet",
  async () => {
    const page = await open(1280, 800);
    const size = await page.$eval(".story-stage iframe", (f) => [
      (f as HTMLElement).offsetWidth,
      (f as HTMLElement).offsetHeight,
    ]);
    expect(size).toEqual([1920, 1080]);
    expect(await page.$eval(".story-enlarge", (b) => getComputedStyle(b).display)).toBe("none");
    await page.close();
  },
  limit(60_000),
);

it(
  "enlarges the slide across a portrait phone and closes back to the card",
  async () => {
    const page = await open(390, 844);
    const small = await page.evaluate(scaleOf);
    await page.click(".story-enlarge");
    await page.waitForSelector(".story-stage[data-turned]:popover-open");
    // The `toggle` event that runs the fit is queued after the popover opens.
    await page.waitForFunction(`(${scaleOf})() > ${small}`);
    expect(await page.evaluate(scaleOf)).toBeCloseTo(390 / 1080, 3);
    expect(small).toBeLessThan(0.2);
    const box = await page.$eval(".story-stage iframe", (f) => {
      const r = f.getBoundingClientRect();
      return [r.left, r.right, r.top, r.bottom].map(Math.round);
    });
    expect(box[0]).toBeGreaterThanOrEqual(0);
    expect(box[1]).toBeLessThanOrEqual(390);
    expect(box[2]).toBeGreaterThanOrEqual(0);
    expect(box[3]).toBeLessThanOrEqual(844);
    await page.click(".story-close");
    await page.waitForFunction(`(${scaleOf})() < 0.2`);
    expect(await page.$(".story-stage:popover-open")).toBeNull();
    expect(await page.evaluate(scaleOf)).toBeCloseTo(small, 3);
    await page.close();
  },
  limit(60_000),
);
