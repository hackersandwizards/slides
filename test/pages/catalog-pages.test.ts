import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Served under the Pages base, since a built state page loads its stylesheets from /slides/.
const dist = join(import.meta.dirname, "..", "..", "dist");
const NIGHT = "rgb(11, 17, 24)";
const TYPES: Record<string, string> = { ".css": "text/css", ".js": "text/javascript" };

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
  browser = await puppeteer.launch({ headless: true, args: ["--use-mock-keychain"] });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

it("turns the catalog page night with its dark theme button, and back", async () => {
  const tab = await browser.newPage();
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
  const tab = await browser.newPage();
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
    const tab = await browser.newPage();
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
  tab.evaluate(() => {
    const card = document.querySelector(".story-stage")!;
    const stage = card.getBoundingClientRect();
    const frame = document.querySelector(".story-stage iframe")!.getBoundingClientRect();
    const embed = document.querySelector(".story-embed")!;
    const bar = embed.previousElementSibling?.getBoundingClientRect().bottom ?? 0;
    const pane = embed.parentElement!.getBoundingClientRect();
    return {
      inside:
        stage.top >= bar && stage.bottom <= Math.min(innerHeight, pane.bottom) && stage.left >= 0,
      wide: stage.right <= innerWidth,
      centred: Math.abs(stage.left - pane.left - (pane.right - stage.right)) <= 1,
      ratio: Math.abs(stage.width / stage.height - 16 / 9) < 0.01,
      framed:
        Math.abs(frame.width - card.clientWidth) <= 2 &&
        Math.abs(frame.height - card.clientHeight) <= 2,
    };
  });
const fitted = { inside: true, wide: true, centred: true, ratio: true, framed: true };

it.each([
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [390, 844],
])(
  "shows a story's whole slide in a %ix%i window",
  async (width, height) => {
    const tab = await browser.newPage();
    await tab.setViewport({ width, height });
    await tab.goto(page("dashboard/Types/activity-slide/specimen3"), { waitUntil: "networkidle0" });
    expect(await fits(tab)).toEqual(fitted);
    await tab.close();
  },
  60_000,
);

it("fits the slide again when the window changes", async () => {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1280, height: 720 });
  await tab.goto(page("dashboard/Types/activity-slide/specimen3"), { waitUntil: "networkidle0" });
  await tab.setViewport({ width: 1920, height: 1080 });
  await tab.waitForNetworkIdle();
  expect(await fits(tab)).toEqual(fitted);
  await tab.setViewport({ width: 1440, height: 600 });
  await tab.waitForNetworkIdle();
  expect(await fits(tab)).toEqual(fitted);
  await tab.close();
}, 60_000);
