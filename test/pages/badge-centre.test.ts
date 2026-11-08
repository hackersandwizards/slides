import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Every numbered badge on the specimen slides, its numeral's ink centred in the badge, and a code
// line's badge on its line, which it hung below (08.11., the row aligned to its top). A tile
// centres its line box, and JetBrains Mono's ascent and descent put the figures 0.8 to 1.5 px
// above the middle (08.11., before NumberTile trimmed its numeral to the cap height). The ink is
// the font's own outline box for the numeral (canvas `measureText`) on the line's baseline, read
// off an empty inline-block, so the reading is exact: a pixel reading at 4x scattered ±0.6 px.
// Horizontal centring is the font's: a 1 carries its ink left of its advance.
const TOLERANCE = 0.5; // CSS px at 1920x1080; a numeral's own overshoot accounts for up to 0.2
const DIST = join(import.meta.dirname, "..", "..", "dist");
const PRINT = join(DIST, "catalog", "print");
const ORIGIN = "http://slides.test";

/** Runs in the page: each numeral on a fill or border of its own, with its ink's offset from the
 *  badge's centre, positive below. */
function measure(): { label: string; offset: number }[] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const drawn = (el: Element) => {
    const style = getComputedStyle(el);
    return style.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(style.borderTopWidth) > 0;
  };
  return [...document.querySelectorAll("body *")].flatMap((el) => {
    const text = el.textContent!.trim();
    if (el.children.length || !/^\d{1,2}$/.test(text)) return [];
    // A tile may draw its numeral in a span of its own.
    const parent = el.parentElement;
    const tile = drawn(el) ? el : parent?.textContent!.trim() === text && drawn(parent) && parent;
    if (!tile) return [];
    const box = tile.getBoundingClientRect();
    if (box.height < 12) return [];
    const probe = document.createElement("span");
    probe.style.cssText = "display: inline-block; width: 0; height: 0";
    el.append(probe);
    const baseline = probe.getBoundingClientRect().bottom;
    probe.remove();
    const style = getComputedStyle(el);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = ctx.measureText(text);
    const centre = baseline + (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2;
    const label = `${tile.className.toString().slice(0, 50)} "${text}"`;
    const found = [{ label, offset: centre - (box.top + box.height / 2) }];
    // A code line's badge stands between the middles of its line's capitals and lower case.
    const line = tile.closest("pre") && tile.parentElement?.nextElementSibling;
    if (line) {
      const strut = probe.cloneNode() as HTMLElement;
      line.prepend(strut);
      const base = strut.getBoundingClientRect().bottom;
      strut.remove();
      const code = getComputedStyle(line);
      ctx.font = `${code.fontWeight} ${code.fontSize} ${code.fontFamily}`;
      const [cap, x] = ["H", "x"].map((c) => base - ctx.measureText(c).actualBoundingBoxAscent / 2);
      const middle = box.top + box.height / 2;
      const offset = middle < cap! ? middle - cap! : middle > x! ? middle - x! : 0;
      found.push({ label: `${label} on its line`, offset });
    }
    return found;
  });
}

let browser: Browser;
let frames: { title: string; doc: string }[];
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
  const page = await browser.newPage();
  await page.goto(`file://${join(PRINT, "index.html")}`);
  frames = await page.$$eval("iframe", (all) =>
    all.map((f) => ({ title: f.title, doc: f.srcdoc })),
  );
  await page.close();
});
afterAll(async () => {
  await browser?.close();
});

// The print page leaves out the slides carrying code (catalog/print.ts): their stories, served
// from dist under the Pages base, carry the annotated code's line badges. A story draws its slide
// after hydration, from props naming the block or the lanes' snippet.
const codeStories = readdirSync(join(DIST, "stories"), { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("index.html"))
  .filter((file) =>
    /annotated-code|codeSnippet|&quot;code&quot;/.test(
      readFileSync(join(DIST, "stories", file), "utf8"),
    ),
  )
  .map((file) => `${ORIGIN}/slides/stories/${file.replace(/index\.html$/, "")}`);

const TYPES: Record<string, string> = { js: "text/javascript", css: "text/css", html: "text/html" };

async function serveDist(page: Page) {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== ORIGIN) return request.continue();
    const path = decodeURIComponent(url.pathname).replace(/^\/slides/, "");
    const file = path.endsWith("/") ? `${path}index.html` : path;
    try {
      return request.respond({
        status: 200,
        body: readFileSync(join(DIST, file)),
        contentType: TYPES[file.split(".").pop()!],
      });
    } catch {
      return request.respond({ status: 404, body: "" });
    }
  });
}

/** Each badge's offset on every print frame and code story, with `css` added. */
async function offsets(css = "") {
  const page = await browser.newPage();
  const found: { label: string; offset: number }[] = [];
  const read = async (where: string) => {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    for (const f of await page.evaluate(measure))
      found.push({ ...f, label: `${where}: ${f.label}` });
  };
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`file://${join(PRINT, "index.html")}`);
    for (const { title, doc } of frames) {
      await page.setContent(doc.replace("</head>", `<style>${css}</style></head>`), {
        waitUntil: "load",
      });
      await read(title);
    }
    await serveDist(page);
    for (const url of codeStories) {
      await page.goto(url, { waitUntil: "networkidle0" });
      if (css) await page.addStyleTag({ content: css });
      // The slide enters as one reached from the one before, and the code colours after load.
      await page.waitForFunction(() => !document.querySelector("[data-code-plain]"));
      await new Promise((done) => setTimeout(done, 1500));
      await read(url);
    }
  } finally {
    await page.close();
  }
  return found;
}

const outside = (found: { label: string; offset: number }[]) =>
  found
    .filter(({ offset }) => Math.abs(offset) > TOLERANCE)
    .map(({ label, offset }) => `${label}: ${offset.toFixed(2)} px`);

it("every numbered badge on the specimen slides centres its numeral", async () => {
  const found = await offsets();
  expect(codeStories.length).toBeGreaterThan(0);
  expect(found.filter(({ label }) => label.startsWith(ORIGIN)).length).toBeGreaterThan(0);
  expect(found.length).toBeGreaterThan(20);
  expect(outside(found)).toEqual([]);
}, 300_000);

// The control: numerals untrimmed and the code rows as before 08.11. must read off centre.
it("reads the untrimmed numerals and top-aligned code badges off centre", async () => {
  const found = await offsets(
    ".tabular-nums > span { text-box: none !important } pre div { align-items: start !important } pre div > span:first-child { padding-top: calc(var(--spacing) * 1) }",
  );
  expect(outside(found).length).toBeGreaterThan(10);
  expect(outside(found).filter((line) => line.includes("on its line")).length).toBeGreaterThan(0);
}, 300_000);
