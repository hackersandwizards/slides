import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { slideCatalog } from "../../specimen/slide-catalog";
import { type Served, serveDist } from "./serve-dist";

// Between 40rem and 48rem no control and no counter showed: the bar ended at `sm` and the counter
// started at `md`.
const DECK = "/slides/stories/Deck/deck-view/specimen-deck/";
const NEXT = 'button[aria-label="Next slide"]';
const WIDTHS = [320, 360, 390, 412, 639, 640, 700, 767, 768, 820, 1024, 1280, 1440, 1920];
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

async function deck(width: number, touch = false, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, hasTouch: touch, isMobile: touch });
  await page.goto(`${served.origin}${DECK}`, { waitUntil: "load" });
  await page.waitForSelector(NEXT);
  // A press before hydration reaches no handler.
  await page.waitForSelector("astro-island:not([ssr])");
  return page;
}

/** The bar as a reader sees it: its opacity, what it says, and where Next can be pressed. */
const bar = (page: Page) =>
  page.$eval(NEXT, (next) => {
    const box = next.parentElement as HTMLElement;
    const rect = next.getBoundingClientRect();
    const [x, y] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
    return {
      opacity: Number(getComputedStyle(box).opacity),
      position: (next.previousElementSibling as HTMLElement).textContent,
      size: parseFloat(getComputedStyle(next.previousElementSibling as HTMLElement).fontSize),
      x,
      y,
      hit: next.contains(document.elementFromPoint(x, y)),
      inside: box.getBoundingClientRect().right <= innerWidth && box.getBoundingClientRect().x >= 0,
    };
  });

const shown = (page: Page, opacity = "1") =>
  page.waitForFunction(
    (next, want) => getComputedStyle(document.querySelector(next)!.parentElement!).opacity === want,
    { timeout: 6000 },
    NEXT,
    opacity,
  );

const reached = (page: Page, position: number) =>
  page.waitForFunction(
    (next, want) =>
      document.querySelector(next)!.previousElementSibling!.textContent!.startsWith(`${want} /`),
    { timeout: 5000 },
    NEXT,
    position,
  );

it.each(WIDTHS)(
  "%i px: a position and working buttons",
  async (width) => {
    const page = await deck(width);
    if (width < 768) expect((await bar(page)).opacity).toBe(1);
    else await page.mouse.move(width / 2, 300);
    await shown(page);
    const before = await bar(page);
    expect(before).toMatchObject({ hit: true, inside: true });
    expect(before.position).toMatch(/^1 \/ \d+$/);
    expect(before.size).toBeGreaterThanOrEqual(16);
    await page.mouse.click(before.x, before.y);
    await reached(page, 2);
    // No pointer move between the presses: each slide mounts its navigation anew.
    await shown(page);
    await page.mouse.click(before.x, before.y);
    await reached(page, 3);
    await page.close();
  },
  30_000,
);

it.each([820, 1024])(
  "%i px on touch shows the buttons with no pointer to move",
  async (width) => {
    const page = await deck(width, true);
    await shown(page);
    expect(await bar(page)).toMatchObject({ opacity: 1, hit: true, inside: true });
    await page.close();
  },
  30_000,
);

it("shows the buttons to the keyboard's focus, not to a drag with the mouse", async () => {
  const page = await deck(1440);
  await page.mouse.move(700, 300);
  await shown(page);
  await shown(page, "0");
  await page.mouse.down();
  await page.mouse.move(760, 340);
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect((await bar(page)).opacity).toBe(0);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    if (await page.$eval(NEXT, (next) => next === document.activeElement)) break;
  }
  await shown(page);
  await page.close();
}, 30_000);

it("keeps a landscape phone's bar asleep until a touch, which steps nothing", async () => {
  const page = await deck(844, true, 390);
  const asleep = await bar(page);
  expect(asleep.opacity).toBe(0);
  await page.touchscreen.tap(asleep.x, asleep.y);
  await shown(page);
  expect((await bar(page)).position).toMatch(/^1 \//);
  await page.close();
}, 30_000);

it("leaves the bar out of print, and centres it where a partner's logo holds its corner", async () => {
  const page = await deck(1440);
  const offCentre = await page.$eval(NEXT, (next) => {
    const logo = document.createElement("div");
    logo.className = "slide-corner-start";
    document.querySelector(".slide-viewport")!.append(logo);
    const box = next.parentElement!.getBoundingClientRect();
    return box.x + box.width / 2 - innerWidth / 2;
  });
  expect(Math.abs(offCentre)).toBeLessThan(1);
  await page.emulateMediaType("print");
  expect(await page.$eval(NEXT, (next) => getComputedStyle(next.parentElement!).display)).toBe(
    "none",
  );
  await page.close();
}, 30_000);

it("draws nothing over a projected slide once the mouse rests, and keeps the counter there", async () => {
  const page = await deck(1440);
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await page.mouse.move(700, 300);
  await shown(page);
  await shown(page, "0");
  const counter = await page.$eval(".slide-corner", (corner) => {
    const span = corner.querySelector("span") as HTMLElement;
    return { text: span.textContent, width: span.getBoundingClientRect().width };
  });
  expect(counter.text).toMatch(/^\d+ \/ \d+$/);
  expect(counter.width).toBeGreaterThan(0);
  await page.close();
}, 30_000);

// A click on Next that reveals a step leaves Next mounted and focused; the arrow key after it made
// the focus visible, and the bar stayed drawn over the slide for good.
it("lets the bar sleep once the presenter goes back to the keys after clicking Next", async () => {
  const target =
    slideCatalog.slides.findIndex((s) => JSON.stringify(s).includes('"reveal":true')) + 1;
  const page = await deck(1440);
  for (let i = 1; i < target; i++) await page.keyboard.press("ArrowRight");
  await reached(page, target);
  await page.mouse.move(700, 300);
  await shown(page);
  const { x, y } = await bar(page);
  await page.mouse.click(x, y);
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect((await bar(page)).position).toMatch(new RegExp(`^${target} /`));
  await page.mouse.move(700, 300);
  await page.keyboard.press("ArrowRight");
  await shown(page, "0");
  await page.close();
}, 30_000);
