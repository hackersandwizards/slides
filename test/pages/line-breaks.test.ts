import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";

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
  const file = join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html");
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  const closing = "The plan comes first.";
  const text = await page.evaluate(
    (c) =>
      [...document.querySelectorAll("p")].find((e) => e.textContent?.startsWith(c))?.textContent,
    closing,
  );
  expect(await linesOf(page, "body", closing, closing, (text ?? "").length)).toBe(2);
  await page.close();
}, 60_000);

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
