import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// talks and trainer-hub set a dark theme on <html>. The brand's night rule reaches down to the
// nearest light theme, so every day slide carries data-theme="light" (SlideShell, SlideContainer,
// PrintSlide) and its cards stay white; a night slide's cards stay glass. Measured on the print page's
// slides, each told day or night by the engine's own night class, not by data-theme.
const FRAMES = pathToFileURL(
  join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html"),
).href;

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(() => browser?.close());

it("keeps a day slide's cards day under a dark page", async () => {
  const page = await browser.newPage();
  await page.goto(FRAMES, { waitUntil: "load" });
  const cards = await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return [...document.querySelectorAll(".hw-card:not([data-variant])")].map((el) => ({
      night: !!el.closest(".slide-night, .theme-brand-dark"),
      fill: getComputedStyle(el).backgroundColor,
    }));
  });
  await page.close();
  const day = cards.filter((c) => !c.night);
  const night = cards.filter((c) => c.night);
  expect(day.length).toBeGreaterThan(0);
  expect(day.filter((c) => c.fill !== "rgb(255, 255, 255)")).toEqual([]);
  expect(night.filter((c) => c.fill === "rgb(255, 255, 255)")).toEqual([]);
}, 60_000);
