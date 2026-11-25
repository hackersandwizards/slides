import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { claim } from "@hackersandwizards/brand/verbal.json";
import { afterAll, assert, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";
import { limit, newPage } from "./limit";

const FRAMES = join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html");

let browser: Browser;
let served: Served;
beforeAll(async () => {
  served = await serveDist();
  browser = await puppeteer.launch({ args: ["--use-mock-keychain", "--password-store=basic"] });
});
afterAll(async () => {
  await browser?.close();
  served?.close();
});

type RenderedTextSpan = {
  scope: string;
  starts: string;
  run: string;
};

/** The number of lines `run` covers inside the first element under `scope` whose text starts with
 *  `starts`. */
const linesOf = (page: Page, span: RenderedTextSpan) =>
  page.evaluate(({ scope, starts, run }) => {
    const box = [...document.querySelectorAll(`${scope} *`)].find(
      (e) => e.textContent?.startsWith(starts) && !e.querySelector("p"),
    );
    if (!box) return 0;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let start = -1;
    let seen = 0;
    const text = box.textContent ?? "";
    const at = text.indexOf(run);
    const end = at + run.length;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (start < 0 && seen + node.length > at) {
        range.setStart(node, at - seen);
        start = at;
      }
      if (start >= 0 && seen + node.length >= end) {
        range.setEnd(node, end - seen);
        break;
      }
      seen += node.length;
    }
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  }, span);

// The built frames page keeps the specimen's `\n` as text, so only the stylesheet can break it.
it(
  "breaks a statement's closing where the deck types \\n",
  async () => {
    const page = await newPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
    const closing = "The plan comes first.";
    const text = await page.evaluate(
      (c) =>
        [...document.querySelectorAll("p")].find((e) => e.textContent?.startsWith(c))?.textContent,
      closing,
    );
    assert(text, "The specimen statement must contain its closing text");
    expect(await linesOf(page, { scope: "body", starts: closing, run: text })).toBe(2);
    await page.close();
  },
  limit(60_000),
);

// The specimen closing set in each language's claim: at the lead step the German claim took two
// rows and the fit guard shrank the closing with speaker photos further.
it.each(["en", "de"] as const)(
  "sets brand's %s claim on one row of a contact closing",
  async (lang) => {
    const page = await newPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    // The specimen deck is English, so the built page accents the English word.
    const accentHandle = await page.evaluateHandle(
      (built) =>
        [...document.querySelectorAll("p > span.text-primary")].find(
          (span) => span.textContent === built,
        ),
      claim.word.en,
    );
    const accent = accentHandle.asElement();
    assert(accent, "The specimen contact closing must accent the English claim");
    const rows = await accent.evaluate(
      (span, { word, text }) => {
        const line = span.parentNode as HTMLParagraphElement;
        const at = text.indexOf(word);
        span.textContent = word;
        line.replaceChildren(text.slice(0, at), span, text.slice(at + word.length));
        const range = document.createRange();
        range.selectNodeContents(line);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      },
      { word: claim.word[lang], text: claim[lang] },
    );
    await page.close();
    expect(rows).toBe(1);
  },
  limit(60_000),
);

// A narrow box broke "self-service?" after its hyphen, leaving "service?" alone on the next line.
it.each([1366, 1440])(
  "%i px: keeps a hyphenated compound on one line",
  async (width) => {
    const page = await newPage(browser);
    await page.setViewport({ width, height: 900 });
    await page.goto(`${served.origin}/slides/stories/Types/decision-slide/specimen3/`, {
      waitUntil: "load",
    });
    await page.waitForSelector(".decision-grid");
    await page.evaluate(() => document.fonts.ready);
    const compound = "self-service";
    expect(
      await linesOf(page, {
        scope: ".decision-grid",
        starts: "Can it be offered",
        run: compound,
      }),
    ).toBe(1);
    await page.close();
  },
  limit(60_000),
);

// On a phone a chip with a space broke inside itself: `widths: [2, 1]` drew "[2," and "1]" on two
// lines, `bun run check` lost "check" to the next line, a path stacked in five pieces under its
// flow step.
it.each(
  ["block-table", "primary-theme", "deep-dive-theme", "visual-flow-framed"].flatMap((story) =>
    [360, 390, 1440].map((width) => [story, width] as const),
  ),
)(
  "content-slide/%s at %i px: keeps each inline code on one line inside the page",
  async (story, width) => {
    const page = await newPage(browser);
    await page.setViewport({ width, height: 844 });
    await page.goto(`${served.origin}/slides/stories/Types/content-slide/${story}/`, {
      waitUntil: "networkidle0",
    });
    await page.evaluate(() => document.fonts.ready);
    const chips = await page.$$eval(".slide-content code.hw-inline-code", (all) =>
      all.map((chip) => {
        const walker = document.createTreeWalker(chip, NodeFilter.SHOW_TEXT);
        const tops = new Set<number>();
        while (walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          for (const r of range.getClientRects()) tops.add(Math.round(r.top));
        }
        return {
          text: chip.textContent,
          lines: tops.size,
          left: chip.getBoundingClientRect().left,
          rightOverflow: chip.getBoundingClientRect().right - document.documentElement.clientWidth,
        };
      }),
    );
    await page.close();
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.filter((c) => c.lines !== 1)).toEqual([]);
    expect(chips.filter((c) => c.left < 0)).toEqual([]);
    expect(chips.filter((c) => c.rightOverflow > 0)).toEqual([]);
  },
  limit(60_000),
);

// "87,3 %" broke before its unit beside a lone figure's label: in its row the figure may shrink,
// and a spaced unit's space was a break.
const FIGURES =
  ".slide-figure-row > :first-child, .slide-figure-cell > :first-child, .slide-timeline-figure";
/** Runs in the page: each figure of a numbers block or timeline, the heights it takes as set and
 *  held on one line, and how far it or its row's contents stand past the row's right edge. */
function figureHeights(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(selector)].map((f) => {
    const set = f.getBoundingClientRect().height;
    f.style.setProperty("white-space", "nowrap", "important");
    const one = f.getBoundingClientRect().height;
    f.style.removeProperty("white-space");
    const row = f.parentElement!;
    const right = Math.max(...[...row.children].map((c) => c.getBoundingClientRect().right));
    // A block figure's box spans its column, so its text past the box is read off its scroll width.
    const over = Math.max(right - row.getBoundingClientRect().right, f.scrollWidth - f.clientWidth);
    return { text: f.textContent, set, one, over };
  });
}
const STAGE_WIDTHS = [1920, 1440];
const FIGURE_VIEWPORTS = [
  ...STAGE_WIDTHS.map((width) => ({ width, height: (width * 9) / 16 })),
  { width: 390, height: 844 },
];
const PLACE = {
  "content-slide/visual-numbers-one": false,
  "content-slide/numbers-long-figure": false,
  "content-slide/numbers-label-below": true,
} as const;
const wrapped = (figures: ReturnType<typeof figureHeights>) =>
  figures.filter(({ set, one, over }) => set > one + 1 || over > 1);

it(
  "keeps every figure on one line and inside its row in print",
  async () => {
    const page = await newPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.emulateMediaType("print");
    await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const figures = await page.evaluate(figureHeights, FIGURES);
    await page.close();
    expect(figures.map((f) => f.text)).toContain("87,3 %");
    expect(wrapped(figures)).toEqual([]);
  },
  limit(60_000),
);

it.each(
  [
    "content-slide/visual-numbers",
    "content-slide/visual-numbers-one",
    "content-slide/visual-numbers-six",
    "content-slide/numbers-long-figure",
    "content-slide/numbers-label-below",
    "content-slide/numbers-five-digits",
    "grid-slide/replaced-by-numbers",
    // "−90 %" overflows its column on a phone without the timeline's cap.
    "content-slide/visual-timeline-segments",
    "content-slide/visual-timeline-staggered",
  ].flatMap((story) => FIGURE_VIEWPORTS.map((viewport) => ({ story, ...viewport }))),
)(
  "keeps every figure of $story on one line and inside its row at $width px",
  async ({ story, width, height }) => {
    const page = await newPage(browser);
    await page.setViewport({ width, height });
    await page.goto(`${served.origin}/slides/stories/Types/${story}/`, {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector(FIGURES);
    await page.evaluate(() => document.fonts.ready);
    const figures = await page.evaluate(figureHeights, FIGURES);
    await page.close();
    expect(figures.length).toBeGreaterThan(0);
    expect(wrapped(figures)).toEqual([]);
  },
  limit(60_000),
);

// A lone figure's label stands beside it on the stage while its longest word finds room there.
it.each(
  Object.entries(PLACE).flatMap(([story, expectedBelow]) =>
    STAGE_WIDTHS.map((width) => ({ story, width, expectedBelow })),
  ),
)(
  "places the label of $story at $width px (below the figure: $expectedBelow)",
  async ({ story, width, expectedBelow }) => {
    const page = await newPage(browser);
    await page.setViewport({ width, height: (width * 9) / 16 });
    await page.goto(`${served.origin}/slides/stories/Types/${story}/`, {
      waitUntil: "networkidle0",
    });
    await page.evaluate(() => document.fonts.ready);
    const below = await page.$eval(".slide-figure-row", (row) => {
      const [figure, label] = [...row.children].map((c) => c.getBoundingClientRect());
      return label.top >= figure.bottom;
    });
    await page.close();
    expect(below).toBe(expectedBelow);
  },
  limit(60_000),
);
