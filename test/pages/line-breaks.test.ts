import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { expect, it } from "vitest";

// The built frames page keeps the specimen's `\n` as text, so only the stylesheet can break it.
it("breaks a statement's closing where the deck types \\n", async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const file = join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html");
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    const lines = await page.evaluate(() => {
      const p = [...document.querySelectorAll("p")].find((e) =>
        e.textContent?.startsWith("The plan comes first."),
      );
      if (!p) return 0;
      const range = document.createRange();
      range.selectNodeContents(p);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(lines).toBe(2);
  } finally {
    await browser.close();
  }
}, 60_000);

// A narrow box broke "self-service?" after its hyphen, leaving "service?" alone on the next line.
it.each([1366, 1440])(
  "%i px: keeps a hyphenated compound on one line",
  async (width) => {
    const { serveDist } = await import("./serve-dist");
    const served = await serveDist();
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--use-mock-keychain", "--password-store=basic"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900 });
      await page.goto(`${served.origin}/slides/stories/Types/decision-slide/specimen3/`, {
        waitUntil: "load",
      });
      await page.waitForSelector(".decision-grid");
      await page.evaluate(() => document.fonts.ready);
      const lines = await page.evaluate(() => {
        const box = [...document.querySelectorAll(".decision-grid *")].find(
          (e) => e.textContent?.startsWith("Can it be offered") && e.children.length <= 2,
        );
        const walker = document.createTreeWalker(box!, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          const at = node.data.indexOf("self-service");
          if (at < 0) continue;
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + "self-service".length);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        }
        return 0;
      });
      expect(lines).toBe(1);
    } finally {
      await browser.close();
      served.close();
    }
  },
  60_000,
);
