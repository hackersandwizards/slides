import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { limit, newPage } from "./limit";

// Every portrait on the print page's slides, read off its box: a picture fills brand's round
// hw-avatar, a circle, with no mat or ring round it. A mat drawn round a picture with the brand
// corner once poked out at two corners and left gaps at the others; a blind panel took the round
// avatar on every slide. A portrait is any picture of the specimen deck's portraits.
const FRAMES = pathToFileURL(
  join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html"),
).href;
const TOLERANCE = 0.5; // CSS px

/** Runs in the page: per portrait, how far the picture's box lies off its avatar's and how far the
 *  avatar is from a circle. */
function measure() {
  return [...document.querySelectorAll<HTMLImageElement>('img[src*="portrait-"]')]
    .filter((img) => img.getBoundingClientRect().width > 0)
    .map((img) => {
      const avatar = img.parentElement!;
      const [r, a] = [img.getBoundingClientRect(), avatar.getBoundingClientRect()];
      const s = getComputedStyle(avatar);
      return {
        label: img.alt || img.src,
        avatar: avatar.classList.contains("hw-avatar"),
        off: Math.max(
          Math.abs(r.left - a.left),
          Math.abs(r.top - a.top),
          Math.abs(r.right - a.right),
          Math.abs(r.bottom - a.bottom),
          Math.abs(a.width - a.height),
          Math.max(0, a.width / 2 - parseFloat(s.borderTopLeftRadius)),
        ),
      };
    });
}

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(() => browser?.close());

it(
  "draws every portrait as a picture filling a round avatar",
  async () => {
    const page = await newPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(FRAMES, { waitUntil: "load" });
    const fits = await page.evaluate(measure);
    await page.close();
    // Closing, profiles, single profile, grid quote and statement quotation each show one.
    expect(fits.length).toBeGreaterThanOrEqual(5);
    expect(fits.filter(({ avatar, off }) => !avatar || off > TOLERANCE)).toEqual([]);
  },
  limit(60_000),
);
