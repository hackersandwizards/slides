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
      // The card's 16:9 is its border box, so the scaled page may overrun its inside by a pixel.
      framed:
        Math.abs(frame.width - card.clientWidth) <= 2 &&
        Math.abs(frame.height - card.clientHeight) <= 2,
    };
  });

it("shows a story's whole slide, centred, and fits it again as the window changes", async () => {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080 });
  await tab.goto(page("dashboard/Types/activity-slide/specimen3"), { waitUntil: "networkidle0" });
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
      framed: true,
    });
  }
  await tab.close();
}, 60_000);
