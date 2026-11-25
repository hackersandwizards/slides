import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Served, serveDist } from "./serve-dist";
import { limit, newPage } from "./limit";

// Every numbered badge on the specimen slides, its numeral's ink centred in the badge, and a code
// line's badge on its line, which it hung below with the row aligned to its top. A tile
// centres its line box, and JetBrains Mono's ascent and descent put the figures 0.8 to 1.5 px
// above the middle until NumberTile trimmed its numeral to the cap height. The ink is
// the font's own outline box for the numeral (canvas `measureText`) on the line's baseline, read
// off an empty inline-block, so the reading is exact: a pixel reading at 4x scattered ±0.6 px.
// Horizontal centring is the font's: a 1 carries its ink left of its advance.
const TOLERANCE = 0.5; // CSS px at 1920x1080; a numeral's own overshoot accounts for up to 0.2
const DIST = join(import.meta.dirname, "..", "..", "dist");

type Reading = { label: string; offset: number };
type BadgeTile = { tile: Element; numeral: Element; text: string };

function readBadgeTiles(): BadgeTile[] {
  function assertBadgeText(text: string | null): asserts text is string {
    if (text === null) throw new Error("A drawn element must have text content");
  }
  const drawn = new Set(
    [...document.querySelectorAll("body *")].filter((el) => {
      const style = getComputedStyle(el);
      return style.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(style.borderTopWidth) > 0;
    }),
  );
  return [...drawn].flatMap((tile) => {
    const content = tile.textContent;
    assertBadgeText(content);
    const text = content.trim();
    if (!/^\d{1,2}$/.test(text) || tile.getBoundingClientRect().height < 12) return [];
    if (!tile.children.length) return [{ tile, numeral: tile, text }];
    // A tile may draw its numeral in a span of its own.
    return [...tile.children]
      .filter(
        (child) =>
          !child.children.length && !drawn.has(child) && child.textContent?.trim() === text,
      )
      .map((numeral) => ({ tile, numeral, text }));
  });
}

/** Runs in the page: each numeral on a fill or border of its own, with its ink's offset from the
 *  badge's centre, positive below. */
function measureBadgeCentres(tiles: BadgeTile[]): Reading[] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  return tiles.map(({ tile, numeral, text }) => {
    const box = tile.getBoundingClientRect();
    const probe = document.createElement("span");
    probe.style.cssText = "display: inline-block; width: 0; height: 0";
    numeral.append(probe);
    const baseline = probe.getBoundingClientRect().bottom;
    probe.remove();
    const style = getComputedStyle(numeral);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = ctx.measureText(text);
    const centre = baseline + (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2;
    const label = `${tile.className.toString().slice(0, 50)} "${text}"`;
    return { label, offset: centre - (box.top + box.height / 2) };
  });
}

function measureCodeLineBadges(tiles: BadgeTile[]): Reading[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("The code badge probe requires a 2D canvas");
  return tiles.flatMap(({ tile, text }) => {
    // A code line's badge stands between the middles of its line's capitals and lower case.
    const line = tile.closest("pre") && tile.parentElement?.nextElementSibling;
    if (!line) return [];
    const strut = document.createElement("span");
    strut.style.cssText = "display: inline-block; width: 0; height: 0";
    line.prepend(strut);
    const base = strut.getBoundingClientRect().bottom;
    strut.remove();
    const code = getComputedStyle(line);
    ctx.font = `${code.fontWeight} ${code.fontSize} ${code.fontFamily}`;
    const [cap, x] = ["H", "x"].map((c) => base - ctx.measureText(c).actualBoundingBoxAscent / 2);
    const box = tile.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    const offset = middle < cap! ? middle - cap! : middle > x! ? middle - x! : 0;
    return [{ label: `${tile.className.toString().slice(0, 50)} "${text}" on its line`, offset }];
  });
}

let browser: Browser;
let served: Served;
beforeAll(async () => {
  served = await serveDist();
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(async () => {
  await browser?.close();
  served?.close();
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
  .map((file) => `/slides/stories/${file.replace(/index\.html$/, "")}`);

// The control: numerals untrimmed and the code rows aligned to their top with
// the badge a spacing step down, must read off centre.
const CONTROL =
  ".tabular-nums > span { text-box: none !important } pre div { align-items: start !important } pre div > span:first-child { padding-top: calc(var(--spacing) * 1) }";

const ALIGNMENTS = [
  { name: "numbered badges centre their numerals", kind: "centres", measure: measureBadgeCentres },
  { name: "code badges align with their lines", kind: "codeLines", measure: measureCodeLineBadges },
] as const;

type AlignmentReadings = { found: Reading[]; control: Reading[] };
const readings: Record<(typeof ALIGNMENTS)[number]["kind"], AlignmentReadings> = {
  centres: { found: [], control: [] },
  codeLines: { found: [], control: [] },
};

/** Each badge's offset on every print frame and code story, as drawn and under the control. */
beforeAll(async () => {
  const page = await newPage(browser);
  const readAlignments = async (where: string, mode: keyof AlignmentReadings) => {
    const tiles = await page.evaluateHandle(readBadgeTiles);
    try {
      for (const alignment of ALIGNMENTS) {
        const measured = await tiles.evaluate(alignment.measure);
        readings[alignment.kind][mode].push(
          ...measured.map((item) => ({ ...item, label: `${where}: ${item.label}` })),
        );
      }
    } finally {
      await tiles.dispose();
    }
  };
  const read = async (where: string) => {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await readAlignments(where, "found");
    await page.addStyleTag({ content: CONTROL });
    await readAlignments(where, "control");
  };
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${served.origin}/slides/catalog/print/frames.html`, { waitUntil: "load" });
    await read("frames");
    for (const path of codeStories) {
      const url = `${served.origin}${path}`;
      await page.goto(url, { waitUntil: "networkidle0" });
      // The slide enters as one reached from the one before, and the code colours after load.
      await page.waitForFunction(() => !document.querySelector("[data-code-plain]"));
      await new Promise((done) => setTimeout(done, 1500));
      await read(url);
    }
  } finally {
    await page.close();
  }
}, limit(300_000));

const outside = (readings: Reading[]) =>
  readings
    .filter(({ offset }) => Math.abs(offset) > TOLERANCE)
    .map(({ label, offset }) => `${label}: ${offset.toFixed(2)} px`);

it.each(ALIGNMENTS)("$name", ({ kind }) => {
  expect(readings[kind].found.length).toBeGreaterThan(0);
  expect(outside(readings[kind].found)).toEqual([]);
});

it("covers specimen badges in stories and detects deliberate misalignment", () => {
  const found = Object.values(readings).flatMap((reading) => reading.found);
  const control = Object.values(readings).flatMap((reading) => reading.control);
  expect(found.filter(({ label }) => label.startsWith(served.origin)).length).toBeGreaterThan(0);
  expect(found.length).toBeGreaterThan(20);
  expect(outside(control).length).toBeGreaterThan(10);
  expect(outside(readings.codeLines.control).length).toBeGreaterThan(0);
});
