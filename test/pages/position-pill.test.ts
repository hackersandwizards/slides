import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";

// The phone's position pill set its width by its glyphs, so the swap to the web face moved the
// next-slide button: 3.5 px with a metric-matched fallback, and Chrome counted it as a layout shift.
const DECK = "/slides/stories/Deck/deck-view/specimen-deck/";
let browser: Browser;
let served: Served;

beforeAll(async () => {
  served = await serveDist();
  browser = await puppeteer.launch({ args: ["--use-mock-keychain", "--password-store=basic"] });
});

afterAll(async () => {
  await browser.close();
  served.close();
});

/** The pill on a phone, drawn in the web faces or with every font request refused. */
async function pill(fonts: boolean) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true });
  if (!fonts) {
    await page.setRequestInterception(true);
    page.on("request", (r) => (r.resourceType() === "font" ? r.abort() : r.continue()));
  }
  await page.goto(`${served.origin}${DECK}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const inter = await page.evaluate(() =>
    [...document.fonts].some((f) => f.family.includes("Inter Variable") && f.status === "loaded"),
  );
  expect(inter).toBe(fonts);
  const reading = await page.$eval('button[aria-label="Next slide"]', (next) => {
    const x = next.getBoundingClientRect().x;
    const box = next.previousElementSibling as HTMLElement;
    const digits = box.textContent.split(" / ")[1].length;
    box.textContent = `${"8".repeat(digits)} / ${"8".repeat(digits)}`;
    const text = document.createRange();
    text.selectNodeContents(box);
    const overflow = text.getBoundingClientRect().width - parseFloat(getComputedStyle(box).width);
    return { next: x, overflow };
  });
  await page.close();
  return reading;
}

it("keeps the next-slide button still when the web face swaps in, the longest count fitting", async () => {
  const [web, fallback] = [await pill(true), await pill(false)];
  expect(Math.abs(web.next - fallback.next)).toBeLessThan(0.5);
  expect(web.overflow).toBeLessThanOrEqual(0);
  expect(fallback.overflow).toBeLessThanOrEqual(0);
}, 60_000);
