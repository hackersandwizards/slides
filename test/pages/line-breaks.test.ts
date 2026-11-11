import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { claim } from "@hackersandwizards/brand/verbal.json";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";

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

/** The number of lines a run of text starting at `from` and `length` long covers inside the first
 *  element under `scope` whose text starts with `starts`. */
const linesOf = (page: Page, scope: string, starts: string, from: string, length: number) =>
  page.evaluate(
    (scope, starts, from, length) => {
      const box = [...document.querySelectorAll(`${scope} *`)].find(
        (e) => e.textContent?.startsWith(starts) && !e.querySelector("p"),
      );
      if (!box) return 0;
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let start = -1;
      let seen = 0;
      const text = box.textContent ?? "";
      const at = text.indexOf(from);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (start < 0 && seen + node.length > at) {
          range.setStart(node, at - seen);
          start = at;
        }
        if (start >= 0 && seen + node.length >= at + length) {
          range.setEnd(node, at + length - seen);
          break;
        }
        seen += node.length;
      }
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    },
    scope,
    starts,
    from,
    length,
  );

// The built frames page keeps the specimen's `\n` as text, so only the stylesheet can break it.
it("breaks a statement's closing where the deck types \\n", async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
  const closing = "The plan comes first.";
  const text = await page.evaluate(
    (c) =>
      [...document.querySelectorAll("p")].find((e) => e.textContent?.startsWith(c))?.textContent,
    closing,
  );
  expect(await linesOf(page, "body", closing, closing, (text ?? "").length)).toBe(2);
  await page.close();
}, 60_000);

// The specimen closing set in each language's claim: at the lead step the German claim took two
// rows and the fit guard shrank the closing with speaker photos further.
it.each(["en", "de"] as const)(
  "sets brand's %s claim on one row of a contact closing",
  async (lang) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const rows = await page.evaluate(
      (built, word, text) => {
        // The specimen deck is English, so the built page accents the English word.
        const accent = [...document.querySelectorAll("p > span.text-primary")].find(
          (s) => s.textContent === built,
        );
        const line = accent?.parentElement;
        if (!line) return 0;
        const at = text.indexOf(word);
        accent.textContent = word;
        line.replaceChildren(text.slice(0, at), accent, text.slice(at + word.length));
        const range = document.createRange();
        range.selectNodeContents(line);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      },
      claim.word.en,
      claim.word[lang],
      claim[lang],
    );
    await page.close();
    expect(rows).toBe(1);
  },
  60_000,
);

// A narrow box broke "self-service?" after its hyphen, leaving "service?" alone on the next line.
it.each([1366, 1440])(
  "%i px: keeps a hyphenated compound on one line",
  async (width) => {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(`${served.origin}/slides/stories/Types/decision-slide/specimen3/`, {
      waitUntil: "load",
    });
    await page.waitForSelector(".decision-grid");
    await page.evaluate(() => document.fonts.ready);
    const compound = "self-service";
    expect(
      await linesOf(page, ".decision-grid", "Can it be offered", compound, compound.length),
    ).toBe(1);
    await page.close();
  },
  60_000,
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
    const page = await browser.newPage();
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
          inside:
            chip.getBoundingClientRect().left >= 0 &&
            chip.getBoundingClientRect().right <= document.documentElement.clientWidth,
        };
      }),
    );
    await page.close();
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.filter((c) => c.lines !== 1 || !c.inside)).toEqual([]);
  },
  60_000,
);

// "87,3 %" broke before its unit beside a lone figure's label: in its row the figure may shrink,
// and a spaced unit's space was a break. A figure taller than itself held on one line wrapped; one
// kept on its line must still leave its label inside the row.
/** Runs in the page: each figure of a numbers block or timeline, the heights it takes as set and
 *  held on one line, and how far it or its row's contents stand past the row's right edge. */
function figureHeights() {
  return [
    ...document.querySelectorAll<HTMLElement>(
      ".slide-figure-row > :first-child, .slide-figure-cell > :first-child, .slide-timeline-figure",
    ),
  ].map((f) => {
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
const PLACE: Record<string, string> = {
  "visual-numbers-one": "beside",
  "numbers-long-figure": "beside",
  "numbers-label-below": "below",
};
const wrapped = (figures: ReturnType<typeof figureHeights>) =>
  figures.filter(({ set, one, over }) => set > one + 1 || over > 1);

it("keeps every figure on one line and inside its row in print", async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.emulateMediaType("print");
  await page.goto(pathToFileURL(FRAMES).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const figures = await page.evaluate(figureHeights);
  await page.close();
  expect(figures.map((f) => f.text)).toContain("87,3 %");
  expect(wrapped(figures)).toEqual([]);
}, 60_000);

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
  ].flatMap((story) => [1920, 1440, 390].map((width) => [story, width] as const)),
)(
  "keeps every figure of %s on one line and inside its row at %i px",
  async (story, width) => {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width > 800 ? (width * 9) / 16 : 844 });
    await page.goto(`${served.origin}/slides/stories/Types/${story}/`, {
      waitUntil: "networkidle0",
    });
    await page.evaluate(() => document.fonts.ready);
    const figures = await page.evaluate(figureHeights);
    // A lone figure's label stands beside it on the stage while its longest word finds room there.
    const place = width > 800 && PLACE[story.split("/")[1]];
    const below =
      place &&
      (await page.$eval(".slide-figure-row", (row) => {
        const [figure, label] = [...row.children].map((c) => c.getBoundingClientRect());
        return label.top >= figure.bottom;
      }));
    await page.close();
    expect(figures.length).toBeGreaterThan(0);
    expect(wrapped(figures)).toEqual([]);
    if (place) expect(below ? "below" : "beside").toBe(place);
  },
  60_000,
);
