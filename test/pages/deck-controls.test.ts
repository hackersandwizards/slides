import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { slideCatalog } from "../../specimen/slide-catalog";
import { type Served, serveDist } from "./serve-dist";
import { limit, newPage } from "./limit";

// Between 40rem and 48rem no control and no counter showed: the bar ended at `sm` and the counter
// started at `md`.
const DECK = "/slides/stories/Deck/deck-view/specimen-deck/";
const NEXT = 'button[aria-label="Next slide"]';
const COMPACT_WIDTHS = [320, 360, 390, 412, 639, 640, 700, 767];
const WIDE_WIDTHS = [768, 820, 1024, 1280, 1440, 1920];
const NAVIGATION_CASES: { width: number; movePointer: (page: Page) => Promise<void> | void }[] = [
  ...COMPACT_WIDTHS.map((width) => ({ width, movePointer: () => undefined })),
  ...WIDE_WIDTHS.map((width) => ({
    width,
    movePointer: (page: Page) => page.mouse.move(width / 2, 300),
  })),
];
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
  const page = await newPage(browser);
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

/** Presses the arrow until the bar reads `position`; no slide before it may hold a reveal step. */
async function goTo(page: Page, position: number) {
  for (let i = 1; i < position; i++) await page.keyboard.press("ArrowRight");
  await reached(page, position);
}

const shown = (page: Page, opacity = "1") =>
  page.waitForFunction(
    (next, want) => {
      const button = window.requireProbeValue(document.querySelector(next), "next slide button");
      const bar = window.requireProbeValue(button.parentElement, "slide control bar");
      return getComputedStyle(bar).opacity === want;
    },
    { timeout: limit(6000) },
    NEXT,
    opacity,
  );

const reached = (page: Page, position: number) =>
  page.waitForFunction(
    (next, want) => {
      const button = window.requireProbeValue(document.querySelector(next), "next slide button");
      const counter = window.requireProbeValue(button.previousElementSibling, "page counter");
      const text = window.requireProbeValue(counter.textContent, "page counter text");
      return text.startsWith(`${want} /`);
    },
    { timeout: limit(5000) },
    NEXT,
    position,
  );

it("fits the confidentiality line above the lockup and controls at 320 px", async () => {
  const page = await deck(320, true, 720);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const footer = await page.$eval(".slide-footer", (row) => {
    const note = window.requireProbeValue(
      row.querySelector(".slide-confidential"),
      "confidentiality line",
    );
    const mark = window.requireProbeValue(
      row.querySelector<HTMLImageElement>(".slide-corner img.hw-wordmark"),
      "corner wordmark",
    );
    const controls = window.requireProbeValue(
      document.querySelector(".slide-controls"),
      "slide controls",
    );
    const range = document.createRange();
    range.selectNodeContents(note);
    const text = range.getBoundingClientRect();
    const logo = mark.getBoundingClientRect();
    return {
      textWidth: text.width,
      textRight: text.right,
      viewportRight: innerWidth,
      textBottom: text.bottom,
      logoTop: logo.top,
      logoBottom: logo.bottom,
      controlsTop: controls.getBoundingClientRect().top,
    };
  });
  await page.close();
  expect(footer.textWidth).toBeGreaterThan(0);
  expect(footer.textRight).toBeLessThanOrEqual(footer.viewportRight);
  expect(footer.textBottom).toBeLessThanOrEqual(footer.logoTop);
  expect(footer.logoBottom).toBeLessThanOrEqual(footer.controlsTop);
});

it.each(COMPACT_WIDTHS)(
  "%i px shows the buttons with no pointer move",
  async (width) => {
    const page = await deck(width);
    const { opacity } = await bar(page);
    await page.close();
    expect(opacity).toBe(1);
  },
  limit(30_000),
);

it.each(NAVIGATION_CASES)(
  "$width px: a position and working buttons",
  async ({ width, movePointer }) => {
    const page = await deck(width);
    await movePointer(page);
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
  limit(30_000),
);

it.each([820, 1024])(
  "%i px on touch shows the buttons with no pointer to move",
  async (width) => {
    const page = await deck(width, true);
    await shown(page);
    expect(await bar(page)).toMatchObject({ opacity: 1, hit: true, inside: true });
    await page.close();
  },
  limit(30_000),
);

it(
  "shows the buttons to the keyboard's focus, not to a drag with the mouse",
  async () => {
    const page = await deck(1440);
    await page.mouse.move(700, 300);
    await shown(page);
    await shown(page, "0");
    await page.mouse.down();
    await page.mouse.move(760, 340);
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect((await bar(page)).opacity).toBe(0);
    await page.$eval(".slide-controls", (controls) => {
      const tabStart = document.createElement("span");
      tabStart.tabIndex = -1;
      controls.before(tabStart);
      tabStart.focus();
    });
    await page.keyboard.press("Tab");
    expect(await page.$eval(NEXT, (next) => next === document.activeElement)).toBe(true);
    await shown(page);
    await page.close();
  },
  limit(30_000),
);

it(
  "keeps a landscape phone's bar asleep until a touch, which steps nothing",
  async () => {
    const page = await deck(844, true, 390);
    const asleep = await bar(page);
    expect(asleep.opacity).toBe(0);
    await page.touchscreen.tap(asleep.x, asleep.y);
    await shown(page);
    expect((await bar(page)).position).toMatch(/^1 \//);
    await page.close();
  },
  limit(30_000),
);

it(
  "leaves the bar out of print, and centres it where a partner's logo holds its corner",
  async () => {
    const page = await deck(1440);
    const offCentre = await page.$eval(NEXT, (next) => {
      const logo = document.createElement("div");
      logo.className = "slide-corner-start";
      window
        .requireProbeValue(document.querySelector(".slide-viewport"), "slide viewport")
        .append(logo);
      const box = window
        .requireProbeValue(next.parentElement, "slide control bar")
        .getBoundingClientRect();
      return box.x + box.width / 2 - innerWidth / 2;
    });
    expect(Math.abs(offCentre)).toBeLessThan(1);
    await page.emulateMediaType("print");
    expect(
      await page.$eval(
        NEXT,
        (next) =>
          getComputedStyle(window.requireProbeValue(next.parentElement, "slide control bar"))
            .display,
      ),
    ).toBe("none");
    await page.close();
  },
  limit(30_000),
);

it(
  "draws nothing over a projected slide once the mouse rests, and keeps the counter there",
  async () => {
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
  },
  limit(30_000),
);

// A click on Next that reveals a step leaves Next mounted and focused; the arrow key after it made
// the focus visible, and the bar stayed drawn over the slide for good.
it(
  "lets the bar sleep once the presenter goes back to the keys after clicking Next",
  async () => {
    const target =
      slideCatalog.slides.findIndex((s) => JSON.stringify(s).includes('"reveal":true')) + 1;
    const page = await deck(1440);
    await goTo(page, target);
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
  },
  limit(30_000),
);

// The position once: from md the slide's corner counts the slides and the bar holds only its
// buttons; a phone hides the corner counter, and a title slide has none, so both keep the pill.
const counted = slideCatalog.slides.findIndex((s) => s.type !== "title") + 1;
it.each([
  { width: 390, slide: counted, position: { pill: true, corner: false } },
  { width: 1440, slide: counted, position: { pill: false, corner: true } },
  { width: 1440, slide: 1, position: { pill: true, corner: false } },
])(
  "$width px, slide $slide: the bar shows the position: $position.pill",
  async ({ width, slide, position }) => {
    const page = await deck(width);
    for (let i = 1; i < slide; i++) await page.keyboard.press("ArrowRight");
    await reached(page, slide);
    const seen = await page.$eval(NEXT, (next) => {
      const pill = next.previousElementSibling as HTMLElement;
      const corners = [...document.querySelectorAll("[data-page-counter]")];
      return {
        pill: pill.getBoundingClientRect().width > 1,
        corner: corners.some((corner) => corner.getBoundingClientRect().width > 1),
        read: pill.textContent,
      };
    });
    expect(seen).toEqual({
      ...position,
      read: `${slide} / ${slideCatalog.slides.length}`,
    });
    await page.close();
  },
  limit(30_000),
);

// A closing slide's lockup hides the whole corner, its counter included, so the bar keeps the count.
it(
  "keeps the count in the bar where a closing slide hides the corner",
  async () => {
    const page = await deck(1440);
    await goTo(page, counted);
    const pill = await page.$eval(NEXT, (next) => {
      const mark = document.createElement("span");
      mark.className = "slide-closing-mark";
      window
        .requireProbeValue(document.querySelector(".slide-viewport"), "slide viewport")
        .append(mark);
      return window
        .requireProbeValue(next.previousElementSibling, "page counter")
        .getBoundingClientRect().width;
    });
    expect(pill).toBeGreaterThan(1);
    await page.close();
  },
  limit(30_000),
);
