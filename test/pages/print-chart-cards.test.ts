import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Recharts draws in the browser only, so these two tiles frame a story page, which needs the
// `/slides` base a file:// read does not give: the test serves dist/ under it.
const dist = join(import.meta.dirname, "..", "..", "dist");
const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

let browser: Browser;
let server: Server;
let origin: string;
beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url!, "http://x").pathname.replace(/^\/slides/, "");
    try {
      const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
      res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
      res.end(await readFile(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address() as { port: number };
  origin = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

it.each([
  ["chart-trend", ".recharts-area-curve"],
  ["chart-bar", ".recharts-bar-rectangle"],
])(
  "draws the plot of the %s tile",
  async (id, mark) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    await page.goto(`${origin}/slides/catalog/print/`, { waitUntil: "load" });
    const handle = await page.waitForSelector(`[id="${id}"] iframe`);
    await handle!.scrollIntoView();
    const frame = await handle!.contentFrame();
    await frame.waitForSelector(`svg ${mark}`, { timeout: 20_000 });
    expect(await frame.$$eval(`svg ${mark}`, (marks) => marks.length)).toBeGreaterThan(0);
    await page.close();
  },
  60_000,
);
