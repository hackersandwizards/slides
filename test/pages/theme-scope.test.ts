import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { limit } from "./limit";

// talks and trainer-hub set a dark theme on <html>. The brand's night rule reaches down to the
// nearest light theme, so every day slide carries data-theme="light" (SlideShell, SlideContainer,
// PrintSlide) and its cards stay white; a night slide's cards stay glass. Measured on the print
// pages' slides, each told day or night by the attribute the engine sets on a night slide, not by
// data-theme. No printed slide stands on night: the night ones are the catalogue page's night
// tiles of the shared elements, which carry the night slide's class.
const page = (name: string) =>
  pathToFileURL(join(import.meta.dirname, "..", "..", "dist", "catalog", "print", name)).href;

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(() => browser?.close());

it(
  "keeps a day slide's cards day and a night slide's cards night under a dark page",
  async () => {
    const cards: { night: boolean; fill: string }[] = [];
    for (const name of ["frames.html", "index.html"]) {
      const tab = await browser.newPage();
      await tab.goto(page(name), { waitUntil: "load" });
      cards.push(
        ...(await tab.evaluate(() => {
          document.documentElement.setAttribute("data-theme", "dark");
          return [
            ...document.querySelectorAll(
              ":is(.print-slide, .slide-night) .hw-card:not([data-variant])",
            ),
          ].map((el) => ({
            night: !!el.closest("[data-hw-night]"),
            fill: getComputedStyle(el).backgroundColor,
          }));
        })),
      );
      await tab.close();
    }
    const day = cards.filter((c) => !c.night);
    const night = cards.filter((c) => c.night);
    expect(day.length).toBeGreaterThan(0);
    expect(night.length).toBeGreaterThan(0);
    expect(day.filter((c) => c.fill !== "rgb(255, 255, 255)")).toEqual([]);
    expect(night.filter((c) => c.fill === "rgb(255, 255, 255)")).toEqual([]);
  },
  limit(60_000),
);
