import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { expect, it } from "vitest";

// A line break a deck types holds in every field on the slide (`.slide-content` in slides.css):
// a statement's closing set it on one line (slides v1.6.1). Measured on the built frames page,
// whose markup keeps the specimen's `\n` as text, so only the stylesheet can break it.
it("breaks a statement's closing where the deck types \\n", async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--use-mock-keychain"] });
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
});
