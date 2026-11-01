import { spawnSync } from "node:child_process";
import { globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Every list marker and step number on the specimen page's slides, measured on the pixels Chrome
// paints at 1920x1080. Markers drifted 1.2 to 3.4 px off for months while every check passed,
// since only a render shows where they land. The squares are the brand's .hw-marker, measured by
// the brand's own `brand-markers` command on each slide frame written to a file of its own. A step
// number's baseline on its line's baseline, which brand-markers does not measure, is measured
// here.
const TOLERANCE = 0.6; // CSS px at 1920x1080; step numbers measured within it at 4x (2026-11-01)
const SCALE = 4;
const SPECIMEN = join(import.meta.dirname, "..", "specimen");

type Box = { x: number; y: number; width: number; height: number };
type Probe = { label: string; number: Box; text: Box };

/** Runs in the page: the bare step numbers left of their line, with the boxes to read. */
function collect(): Probe[] {
  const firstText = (el: Node) => {
    if (el instanceof Text) return el.data.trim() ? el : null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    return walker.nextNode() as Text | null;
  };
  const after = (el: Element) => {
    let next = el.nextSibling;
    while (next && !next.textContent!.trim()) next = next.nextSibling;
    return next && firstText(next);
  };
  const rectOf = (node: Node, end?: number, start = 0) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end ?? node.textContent!.length);
    return range.getClientRects()[0]!;
  };
  // A step number is a bare numeral left of its line; one in a badge, or above its text, is not.
  const bare = (el: Element) => getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)";
  const box = (r: { left: number; right: number; top: number; bottom: number }): Box => ({
    x: r.left + scrollX,
    y: r.top + scrollY,
    width: r.right - r.left,
    height: r.bottom - r.top,
  });
  const found: [Element, Text][] = [];
  for (const mark of document.querySelectorAll("li *, .flex > *")) {
    if (mark.children.length || !/^\d{1,2}\.?$/.test(mark.textContent!.trim())) continue;
    const text = after(mark);
    if (!text || !bare(mark) || !bare(mark.parentElement!)) continue;
    const [m, t] = [mark.getBoundingClientRect(), rectOf(text)];
    if (t.left >= m.right && t.top < m.bottom && t.bottom > m.top) found.push([mark, text]);
  }
  // The line's first words become "xxxx", so its ink's bottom is the baseline.
  for (const [, text] of found) text.data = "xxxx " + text.data.trimStart();
  return found.map(([mark, text]) => ({
    label: `"${mark.parentElement!.textContent!.trim().slice(0, 30)}"`,
    // Read off the full stop where the number has one: the half-ink rule puts the bottom of a 4 at
    // its crossbar, about 5 px above the line (the content block's ordered "4." read -4.75).
    number: box(
      rectOf(
        mark.firstChild!,
        undefined,
        /\.\s*$/.test(mark.textContent!) ? mark.firstChild!.textContent!.trimEnd().length - 1 : 0,
      ),
    ),
    text: box(rectOf(text, 4)),
  }));
}

/** Runs in the page: the y in CSS px, from the top of the shot, of its ink's bottom edge (the
 * last row holding at least half the fullest row's ink). */
async function inkBottom(png: string, scale: number): Promise<number> {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const ctx = new OffscreenCanvas(img.width, img.height).getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  // The background is the commonest colour on the shot's edge; a pixel's ink is its distance
  // from it, full from half the largest distance on.
  const at = (x: number, y: number) => (y * width + x) * 4;
  const counts = new Map<number, number>();
  const count = (x: number, y: number) => {
    const i = at(x, y);
    const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let x = 0; x < width; x++) for (const y of [0, height - 1]) count(x, y);
  for (let y = 0; y < height; y++) for (const x of [0, width - 1]) count(x, y);
  const bg = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  const dist = new Float64Array(width * height);
  for (let p = 0; p < dist.length; p++)
    dist[p] = Math.hypot(
      data[p * 4]! - (bg >> 16),
      data[p * 4 + 1]! - ((bg >> 8) & 255),
      data[p * 4 + 2]! - (bg & 255),
    );
  const full = Math.max(...dist) / 2;
  const rows = Array.from({ length: height }, (_, y) => {
    let ink = 0;
    for (let x = 0; x < width; x++) ink += Math.min(1, dist[y * width + x]! / full);
    return ink;
  });
  if (!rows.some(Boolean)) throw new Error("no ink in the probed box");
  const fullest = Math.max(...rows);
  return (rows.findLastIndex((ink) => ink >= fullest / 2) + 1) / scale;
}

let browser: Browser;
let frames: { title: string; doc: string }[];
let dir: string;
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${join(SPECIMEN, "index.html")}`);
  frames = await page.$$eval("iframe", (all) =>
    all.map((f) => ({ title: f.title, doc: f.srcdoc })),
  );
  await page.close();
  dir = mkdtempSync(join(tmpdir(), "slides-markers-"));
});
afterAll(async () => {
  await browser?.close();
  if (dir) rmSync(dir, { recursive: true });
});

/** The frames drawing a square marker, each as a file whose relative links resolve in specimen/,
 * with `css` added. */
function frameFiles(css = "") {
  return frames
    .filter(({ doc }) => doc.includes("hw-marker"))
    .map(({ title, doc }, i) => {
      const file = join(dir, `${i}-${title.replace(/[^a-z0-9]+/gi, "-")}.html`);
      writeFileSync(
        file,
        doc.replace("<head>", `<head><base href="file://${SPECIMEN}/"><style>${css}</style>`),
      );
      return file;
    });
}

const brandMarkers = (files: string[]) =>
  spawnSync("bun", ["run", "brand-markers", "--width", "1920", ...files], { encoding: "utf8" });

it("every square marker on the specimen slides sits on its line", () => {
  const files = frameFiles();
  expect(files.length).toBeGreaterThan(10);
  const run = brandMarkers(files);
  expect(run.status, run.stderr + run.stdout).toBe(0);
}, 600_000);

// A marker class no stylesheet defines draws nothing, and brand-markers cannot see what is not
// drawn: comparison's split and activity's demo kept `slide-marker` after v0.18.0 removed it.
it("every marker class in the components is defined", () => {
  const css = [
    join(import.meta.dirname, "..", "styles", "slides.css"),
    fileURLToPath(import.meta.resolve("@hackersandwizards/brand/marker.css")),
  ]
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const root = join(import.meta.dirname, "..");
  const undefinedClasses = globSync("components/**/*.tsx", { cwd: root }).flatMap((file) =>
    [...readFileSync(join(root, file), "utf8").matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
      .flatMap(([, plain, template]) => (plain ?? template).split(/\s+/))
      .filter((name) => /^[\w-]*marker[\w-]*$/.test(name) && !css.includes(`.${name} `))
      .map((name) => `${file}: ${name}`),
  );
  expect(undefinedClasses).toEqual([]);
});

// The control: the same command over the squares moved half a pixel down must fail.
it("brand-markers fails on squares moved by half a pixel", () => {
  const run = brandMarkers(frameFiles(".hw-marker { translate: 0 0.5px }").slice(0, 3));
  expect(run.status).toBe(1);
}, 300_000);

it("every step number on the specimen slides sits on its line", async () => {
  const page = await browser.newPage();
  const off: string[] = [];
  let found = 0;
  try {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: SCALE });
    for (const { title, doc } of frames) {
      await page.goto(`file://${join(SPECIMEN, "index.html")}`);
      await page.setContent(doc, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const read = async (clip: Box) =>
        clip.y +
        (await page.evaluate(
          inkBottom,
          await page.screenshot({ clip, encoding: "base64", captureBeyondViewport: true }),
          SCALE,
        ));
      for (const p of await page.evaluate(collect)) {
        found++;
        const offset = (await read(p.number)) - (await read(p.text));
        if (Math.abs(offset) > TOLERANCE) off.push(`${title}: ${p.label}: ${offset.toFixed(2)} px`);
      }
    }
  } finally {
    await page.close();
  }
  expect(found).toBeGreaterThan(5);
  expect(off).toEqual([]);
}, 120_000);
