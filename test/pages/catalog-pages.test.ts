import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { TICK_GAP } from "../../components/slides/ChartPlots";

// Served under the Pages base, since a built state page loads its stylesheets from /slides/.
const dist = join(import.meta.dirname, "..", "..", "dist");
const NIGHT = "rgb(11, 17, 24)";
const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

let browser: Browser;
let server: Server;
let page: (path: string) => string;
beforeAll(async () => {
  server = createServer((request, response) => {
    const url = decodeURI(new URL(request.url ?? "/", "http://x").pathname);
    const path = url.slice("/slides".length);
    const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
    if (
      !url.startsWith("/slides/") ||
      path.includes("..") ||
      !statSync(file, { throwIfNoEntry: false })?.isFile()
    ) {
      response.statusCode = 404;
      return response.end();
    }
    response.setHeader("Content-Type", TYPES[extname(file)] ?? "text/html");
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  page = (path) => `http://127.0.0.1:${port}/slides/${path}/`;
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

// A tab holds focus as the one in front does, as brand-elements emulates it: a background tab never
// paints, and the catalog's frames load only after the first paint.
const newTab = async () => {
  const tab = await browser.newPage();
  await (
    await tab.createCDPSession()
  ).send("Emulation.setFocusEmulationEnabled", { enabled: true });
  return tab;
};

// Since scaffolding v2.22.0 a tile's frame loads once the home has painted and the tile is within
// 200 px of the view, so a check reading the tiles without scrolling them in sees none.
it("loads every tile on the catalog home, with no failed request", async () => {
  const tab = await newTab();
  await tab.setViewport({ width: 1440, height: 900 });
  const failed: string[] = [];
  tab.on("requestfailed", (request) => failed.push(request.url()));
  tab.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await tab.goto(page("").slice(0, -1), { waitUntil: "load" });
  const count = await tab.$$eval(".hw-catalog-preview iframe", (all) => all.length);
  const loaded = () =>
    tab.$$eval(
      ".hw-catalog-preview iframe",
      (all) =>
        all.filter((frame) => frame.contentDocument?.querySelector("[data-hw-scale]")).length,
    );
  for (let at = 0; (await loaded()) < count && at < 100; at++)
    await tab.evaluate(async () => {
      const main = document.querySelector("main")!;
      (main.scrollHeight > main.clientHeight ? main : document.scrollingElement!).scrollBy(0, 400);
      await new Promise((done) => setTimeout(done, 100));
    });
  expect(count).toBeGreaterThan(20);
  expect(await loaded()).toBe(count);
  expect(failed).toEqual([]);
  await tab.close();
}, 120_000);

it("turns the catalog page night with its dark theme button, and back", async () => {
  const tab = await newTab();
  await tab.goto(page("dashboard/Types/closing-slide/contact"), { waitUntil: "load" });
  const ground = () => tab.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const day = await ground();
  await tab.click("button[data-hw-theme]");
  expect(await ground()).toBe(NIGHT);
  await tab.click("button[data-hw-theme]");
  expect(await ground()).toBe(day);
  await tab.close();
}, 60_000);

it("keeps a day slide's story page day under the dark theme", async () => {
  const tab = await newTab();
  await tab.evaluateOnNewDocument(() => localStorage.setItem("theme-toggle", "dark"));
  await tab.goto(page("stories/Types/closing-slide/contact"), { waitUntil: "load" });
  const fill = await tab.evaluate(
    () => getComputedStyle(document.querySelector(".slide-story")!).backgroundColor,
  );
  expect(fill).not.toBe(NIGHT);
  await tab.close();
}, 60_000);

it.each([
  "stories/Types/closing-slide/contact",
  "stories/Parts/picture-link/variants",
  "stories/Parts/video-player/variants",
])(
  "loads %s's images from under the Pages base once hydrated",
  async (path) => {
    const tab = await newTab();
    const missing: string[] = [];
    tab.on("response", (response) => {
      if (response.status() === 404) missing.push(response.url());
    });
    await tab.goto(page(path), { waitUntil: "networkidle0" });
    expect(missing).toEqual([]);
    await tab.close();
  },
  60_000,
);

// A wide window scaled the slide to the page's width alone, so its bottom ran below the window
// (Benedikt, 08.11.2026, ActivitySlide at about 1900x1200).
const fits = (tab: Page) =>
  tab.evaluate(async () => {
    // Two frames give the stage's ResizeObserver its turn after a viewport change.
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const card = document.querySelector(".story-stage")!;
    const stage = card.getBoundingClientRect();
    const frame = card.querySelector("iframe")!.getBoundingClientRect();
    const embed = card.parentElement!;
    const bar = embed.previousElementSibling?.getBoundingClientRect().bottom ?? 0;
    const pane = embed.parentElement!.getBoundingClientRect();
    return {
      inside:
        stage.top >= bar &&
        stage.bottom <= Math.min(innerHeight, pane.bottom) &&
        stage.left >= 0 &&
        stage.right <= innerWidth,
      centred: Math.abs(stage.left - pane.left - (pane.right - stage.right)) <= 1,
      // The card is as large as the window allows: as wide as the page or as tall as the pane.
      filled:
        Math.abs(embed.getBoundingClientRect().bottom - pane.bottom) <= 1 ||
        stage.width >= embed.clientWidth - 2 * parseFloat(getComputedStyle(embed).paddingLeft) - 1,
      // The card's 16:9 is its border box, so the scaled page may overrun its inside by a pixel.
      framed:
        Math.abs(frame.width - card.clientWidth) <= 2 &&
        Math.abs(frame.height - card.clientHeight) <= 2,
    };
  });

it("shows a story's whole slide, centred, and fits it again as the window changes", async () => {
  const tab = await newTab();
  await tab.setViewport({ width: 1920, height: 1080 });
  await tab.goto(page("dashboard/Types/activity-slide/specimen3"), { waitUntil: "networkidle0" });
  // The frame measured is the story's own page, loaded.
  expect(
    await tab.$eval(".story-stage iframe", (frame) =>
      Boolean(frame.contentDocument?.querySelector(".slide-story")),
    ),
  ).toBe(true);
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [390, 844],
    [1440, 600],
  ]) {
    await tab.setViewport({ width, height });
    expect(await fits(tab), `${width}x${height}`).toEqual({
      inside: true,
      centred: true,
      filled: true,
      framed: true,
    });
  }
  await tab.close();
}, 60_000);

// Every category label of a chart story stands below the axis line by the tick gap and whole
// inside its plot, at stage size.
it.each(["bar", "bar-long-names", "trend", "trend-marked"])(
  "keeps %s's labels below the axis and whole",
  async (story) => {
    const tab = await newTab();
    await tab.setViewport({ width: 1920, height: 1080 });
    await tab.goto(page(`stories/Types/chart-slide/${story}`), { waitUntil: "load" });
    await tab.waitForSelector(".recharts-xAxis-tick-labels text");
    const m = await tab.evaluate(async () => {
      // The labels lay out again once the web font arrives, a render or two later.
      await document.fonts.ready;
      for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
      const box = (e: Element) => e.getBoundingClientRect().toJSON() as DOMRect;
      return {
        axis: box(document.querySelector(".recharts-xAxis .recharts-cartesian-axis-line")!),
        plot: box(document.querySelector(".recharts-surface")!),
        labels: [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map(box),
      };
    });
    expect(m.labels.length).toBeGreaterThan(0);
    for (const label of m.labels) {
      expect(label.top).toBeGreaterThanOrEqual(m.axis.bottom + TICK_GAP);
      expect(label.left).toBeGreaterThanOrEqual(m.plot.left);
      expect(label.right).toBeLessThanOrEqual(m.plot.right);
      expect(label.bottom).toBeLessThanOrEqual(m.plot.bottom);
    }
    await tab.close();
  },
  60_000,
);
