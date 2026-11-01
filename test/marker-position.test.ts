import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Every list marker and step number on the specimen page's slides, measured on the pixels Chrome
// paints at 1920x1080: a square's middle on the middle of the x-height of the first line beside it
// (on the caps' middle beside capitals), a step number's baseline on that line's baseline. Markers
// drifted 1.2 to 3.4 px off for months while every check passed, since only a render shows where
// they land. The line's first words become "xxxx", so its ink is the x-height band itself.
const TOLERANCE = 0.6; // CSS px at 1920x1080; the fix measured within it at 2x (2026-11-01)
const SCALE = 4;
const SPECIMEN = join(import.meta.dirname, "..", "specimen");

type Box = { x: number; y: number; width: number; height: number };
type Probe = { label: string; edge: "middle" | "bottom"; marker: Box; text: Box };

/** Runs in the page: rewrites the line beside each marker and returns the boxes to read. */
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
  const rectOf = (node: Node, end?: number) => {
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, end ?? node.textContent!.length);
    return range.getClientRects()[0]!;
  };
  const marked: { mark: Element; text: Text; edge: Probe["edge"] }[] = [];
  for (const mark of document.querySelectorAll(".slide-marker")) {
    const text = after(mark);
    if (text) marked.push({ mark, text, edge: "middle" });
  }
  // A step number is a bare numeral left of its line; one in a badge, or above its text, is not.
  const bare = (el: Element) => getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)";
  for (const mark of document.querySelectorAll("li *, .flex > *")) {
    if (mark.children.length || !/^\d{1,2}\.?$/.test(mark.textContent!.trim())) continue;
    const text = after(mark);
    if (!text || !bare(mark) || !bare(mark.parentElement!)) continue;
    const [m, t] = [mark.getBoundingClientRect(), rectOf(text)];
    if (t.left >= m.right && t.top < m.bottom && t.bottom > m.top)
      marked.push({ mark, text, edge: "bottom" });
  }
  for (const m of marked) m.text.data = "xxxx " + m.text.data.trimStart();
  const box = (r: { left: number; right: number; top: number; bottom: number }, pad = 0): Box => ({
    x: r.left - pad + scrollX,
    y: r.top - pad + scrollY,
    width: r.right - r.left + 2 * pad,
    height: r.bottom - r.top + 2 * pad,
  });
  return marked.map(({ mark, text, edge }) => ({
    label: `${mark.className.toString().split(" ")[0] || mark.tagName} "${mark.parentElement!.textContent!.trim().slice(0, 30)}"`,
    edge,
    marker:
      edge === "middle" ? box(mark.getBoundingClientRect(), 1) : box(rectOf(mark.firstChild!)),
    text: box(rectOf(text, 4)),
  }));
}

/**
 * Runs in the page: the y in CSS px, from the top of the shot, of its ink's middle or of its ink's bottom edge (the last row holding at
 * least half the fullest row's ink).
 */
async function inkEdge(png: string, scale: number, edge: Probe["edge"]): Promise<number> {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const ctx = new OffscreenCanvas(img.width, img.height).getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  // The background is the commonest colour on the shot's edge; a pixel's ink is its distance
  // from it, full from half the largest distance on, so a gradient marker weighs evenly.
  const at = (x: number, y: number) => (y * width + x) * 4;
  const counts = new Map<number, number>();
  for (let x = 0; x < width; x++)
    for (const y of [0, height - 1]) {
      const i = at(x, y);
      const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  for (let y = 0; y < height; y++)
    for (const x of [0, width - 1]) {
      const i = at(x, y);
      const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
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
  const total = rows.reduce((a, b) => a + b, 0);
  if (!total) throw new Error("no ink in the probed box");
  if (edge === "middle") return rows.reduce((a, ink, y) => a + ink * (y + 0.5), 0) / total / scale;
  const fullest = Math.max(...rows);
  return (rows.findLastIndex((ink) => ink >= fullest / 2) + 1) / scale;
}

let browser: Browser;
let frames: { title: string; doc: string }[];
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${join(SPECIMEN, "index.html")}`);
  frames = await page.$$eval("iframe", (all) =>
    all.map((f) => ({ title: f.title, doc: f.srcdoc })),
  );
  await page.close();
});
afterAll(() => browser?.close());

/** Each marker on every specimen slide and how far it sits off its line in CSS px, after `css`. */
async function measure(css = "") {
  const page = await browser.newPage();
  const offsets: { label: string; offset: number }[] = [];
  try {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: SCALE });
    for (const { title, doc } of frames) {
      await page.goto(`file://${join(SPECIMEN, "index.html")}`);
      await page.setContent(doc.replace("<head>", `<head><style>${css}</style>`), {
        waitUntil: "load",
      });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const read = async (clip: Box, edge: Probe["edge"]) =>
        clip.y +
        (await page.evaluate(
          inkEdge,
          await page.screenshot({ clip, encoding: "base64", captureBeyondViewport: true }),
          SCALE,
          edge,
        ));
      for (const p of await page.evaluate(collect))
        offsets.push({
          label: `${title}: ${p.label}`,
          offset: (await read(p.marker, p.edge)) - (await read(p.text, p.edge)),
        });
    }
    return offsets;
  } finally {
    await page.close();
  }
}

it("every marker on the specimen slides sits on its line", async () => {
  const all = await measure();
  expect(all.length).toBeGreaterThan(40);
  const off = all.filter((m) => Math.abs(m.offset) > TOLERANCE);
  expect(off.map((m) => `${m.label}: ${m.offset.toFixed(2)} px`)).toEqual([]);
}, 120_000);

// The control: Chrome paints a marker on whole CSS pixels, so a misplaced one sits a pixel or
// more off. Every square marker moved one pixel down must fail.
it("every square marker moved by 1 px fails", async () => {
  const squares = (await measure(".slide-marker { translate: 0 1px }")).filter((m) =>
    m.label.includes("slide-marker"),
  );
  expect(squares.length).toBeGreaterThan(40);
  for (const m of squares) expect(Math.abs(m.offset), m.label).toBeGreaterThan(TOLERANCE);
}, 120_000);
