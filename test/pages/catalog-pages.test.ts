import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { TICK_GAP } from "../../components/slides/ChartPlots";
import { type Served, serveDist } from "./serve-dist";

// Served under the Pages base, since a built state page loads its stylesheets from /slides/.
const NIGHT = "rgb(11, 17, 24)";
let browser: Browser;
let served: Served;
let page: (path: string) => string;
beforeAll(async () => {
  served = await serveDist();
  page = (path) => `${served.origin}/slides/${path}/`;
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  served?.close();
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

// A tile's frame loads once the home has painted and the tile is within
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
  const tiles = ".hw-catalog-preview iframe";
  const count = await tab.$$eval(tiles, (all) => all.length);
  await tab.$$eval(tiles, async (all) => {
    for (const frame of all) {
      frame.scrollIntoView();
      await new Promise((done) => setTimeout(done, 50));
    }
  });
  const allDrawn = (selector: string) =>
    [...document.querySelectorAll<HTMLIFrameElement>(selector)].every((frame) =>
      frame.contentDocument?.querySelector("[data-hw-scale]"),
    );
  await tab.waitForFunction(allDrawn, { timeout: 60_000 }, tiles).catch(() => undefined);
  expect(count).toBeGreaterThan(20);
  expect(await tab.evaluate(allDrawn, tiles)).toBe(true);
  expect(failed).toEqual([]);
  await tab.close();
}, 120_000);

it("turns the catalog page night with its dark theme button, and back", async () => {
  const tab = await newTab();
  await tab.goto(page("dashboard/Types/closing-slide/contact"), { waitUntil: "load" });
  // The shell paints the ground on <html>; the body is transparent over it.
  const ground = () =>
    tab.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
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

const stylesheets = async (url: string) => {
  const tab = await newTab();
  await tab.goto(url, { waitUntil: "load" });
  const links = await tab.$$eval('link[rel="stylesheet"]', (all) =>
    all.map((link) => (link as HTMLLinkElement).href),
  );
  await tab.close();
  return links;
};

it("links slides.css on a slide's page alone, never on the state's page framing it", async () => {
  const isSlidesCss = (href: string) => /\/slides\.[^/]+\.css$/.test(href);
  expect((await stylesheets(page("dashboard/Types/title-slide/specimen"))).some(isSlidesCss)).toBe(
    false,
  );
  expect((await stylesheets(page("stories/Types/title-slide/specimen"))).some(isSlidesCss)).toBe(
    true,
  );
}, 60_000);

// SlideFrame's style inlines only under Astro's 4 KB limit: above it every state's page waits on a
// stylesheet of its own before the header's logo paints, the LCP element.
it("links no stylesheet on a state's page beyond the shell's on the home", async () => {
  const home = await stylesheets(`${served.origin}/slides/`);
  expect(home.length).toBeGreaterThan(0);
  for (const path of ["dashboard/Types/title-slide/specimen", "dashboard/Parts/axis-tick/variants"])
    expect(home).toEqual(expect.arrayContaining(await stylesheets(page(path))));
}, 60_000);

// A wide window scaled the slide to the page's width alone, so its bottom ran below the window
// (ActivitySlide at about 1900x1200).
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

// The fit guard shrinks with zoom, which draws a px width zoomed but a percentage at full size: a
// shrunk titled body still spans the slide's width, and an untitled one fills its height, centred,
// also once its slide narrows without the text changing size, as a deck window wider than 16:9 does
// (the stage follows the height alone).
it("draws a shrunk slide at the slide's full width or height", async () => {
  const tab = await newTab();
  await tab.setViewport({ width: 1920, height: 1080 });
  const read = async (story: string, selector: string, narrow = false) => {
    await tab.goto(page(`stories/Types/${story}`), { waitUntil: "load" });
    await tab.waitForSelector(`${selector}[style*="zoom"]`);
    return tab.evaluate(
      async (selector, narrow) => {
        const settle = async () => {
          for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
        };
        await document.fonts.ready;
        await settle();
        const box = document.querySelector<HTMLElement>(selector)!;
        // Narrowed once the fit the font's arrival sets off has run.
        if (narrow) {
          await new Promise((r) => setTimeout(r, 300));
          box.parentElement!.style.maxWidth = "1600px";
          await settle();
        }
        const outer = box.parentElement!;
        const cs = getComputedStyle(outer);
        const r = box.getBoundingClientRect();
        const o = outer.getBoundingClientRect();
        return {
          zoom: Number(box.style.zoom),
          width: box.style.width,
          drawn: {
            left: r.left - o.left,
            right: o.right - r.right,
            top: r.top - o.top,
            height: r.height,
          },
          inner: o.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
          outer: { width: o.width, height: o.height },
        };
      },
      selector,
      narrow,
    );
  };
  const body = await read("content-slide/density", ".slide-body");
  expect(body.zoom).toBeGreaterThan(0.5);
  expect(body.zoom).toBeLessThan(1);
  expect(body.width).toMatch(/px$/);
  expect(body.outer.width - body.drawn.left - body.drawn.right).toBeCloseTo(body.inner, 0);
  const resized = await read("content-slide/density", ".slide-body", true);
  expect(resized.outer.width - resized.drawn.left - resized.drawn.right).toBeCloseTo(
    resized.inner,
    0,
  );
  const content = await read("closing-slide/contact", ".slide-content");
  expect(content.zoom).toBeGreaterThan(0.5);
  expect(content.zoom).toBeLessThan(1);
  expect(content.drawn.top).toBeCloseTo(0, 0);
  expect(content.drawn.height).toBeCloseTo(content.outer.height, 0);
  expect(content.drawn.left).toBeCloseTo(content.drawn.right, 0);
  await tab.close();
}, 60_000);

it("keeps the deck's shortcut dialog inside a phone's width", async () => {
  const tab = await newTab();
  await tab.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await tab.goto(page("stories/Deck/deck-view/specimen-deck"), { waitUntil: "networkidle0" });
  await tab.keyboard.type("?");
  await tab.waitForSelector("dialog[open]");
  const [scroll, client] = await tab.$eval("dialog[open]", (d) => [d.scrollWidth, d.clientWidth]);
  expect(scroll).toBeLessThanOrEqual(client);
  await tab.close();
}, 60_000);
