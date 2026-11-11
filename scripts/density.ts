#!/usr/bin/env bun
// The density guard a consumer runs in its own gate: renders each deck's print route at
// 1920x1080 and reads the factor by which the fit guard (SlideShell) shrinks each slide. Below
// FAIL a slide fails the run; below NOTICE it is listed without failing. Body text stands at 36 px
// (18 pt on a 960 pt slide) at factor 1 and shrinks with it, so 0.8 keeps it at 29 px. Each listed
// slide gets a split suggestion: its blocks laid out at full size, grouped into slides that fit.
// A slide the printed page marks with `data-use` (a content slide of one or two short bullets, or
// a regular slide drawn as one) fails too, naming the type that carries it. A slide is named by
// its deck page's path, `/<deck>/<index>`, counted from 0 as the URL counts. A slide the fit guard
// never fitted, as on a print route that did not hydrate, fails, since its scale cannot be read.
//
//   slides-density [--site <dir> | --serve "<command>"] <print-url or path> ...
//
// `--site` serves a built site's folder for the run; `--serve` starts the consumer's server with
// scaffolding's `serve`, which hands it HOST and PORT, waits until it answers and stops it at the
// end. Either way a path (`/deck/print`) is read against that server. Exit 1 on any slide below
// FAIL, marked or unfitted, or any deck that does not render.

import puppeteer, { type Browser } from "puppeteer";
import { FIT_STYLE } from "../lib/slide-utils";
import { settlePrintPage } from "./render-pdf";
import { serveDir } from "./serve-dir";

const FAIL = 0.8;
const NOTICE = 0.9;
const PAGES = 4;
const WORD =
  "a heading's word is wider than its box and shrinks the heading: shorten the word or give it a wider box";
const UNFITTED =
  "the fit guard never ran on this slide, so its scale cannot be read: check the page's console for an error and its print route for client:load";
const STATEMENT =
  "one or two short bullets leave the slide empty: make it the statement slide bulletsAsStatement in lib/slide-utils returns";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args.splice(at, 2)[1];
};
const site = option("--site");
const serve = option("--serve");
// A server this run starts takes a port of its own, so an address naming another port would
// measure whatever answers there.
const absolute = (arg: string) => URL.canParse(arg);
if (!args.length || (site && serve) || ((site || serve) && args.some(absolute))) {
  console.error(
    'usage: slides-density --site <dir> | --serve "<command>" </deck/print> ...\n       slides-density <print-url> ...',
  );
  process.exit(2);
}

async function startServer() {
  if (site) return serveDir(site);
  if (!serve) return;
  // Imported only here, so a consumer serving its site itself needs no scaffolding.
  const { serve: start } = await import("@hackersandwizards/scaffolding/serve");
  const { url, stop } = await start(["/bin/sh", "-c", serve]);
  return { origin: url, close: stop };
}
const server = await startServer();
const urls = args.map((arg) => (server ? new URL(arg, server.origin).href : arg));
let browser: Browser | undefined;
let failed = 0;
let noticed = 0;
let broken = 0;
try {
  // Background pages keep their timers and frames: settle waits on both.
  browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 900_000,
    args: [
      "--use-mock-keychain",
      "--password-store=basic",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const reports: string[][] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PAGES, urls.length) }, async () => {
      while (next < urls.length) {
        const i = next++;
        reports[i] = await check(browser!, urls[i]);
      }
    }),
  );
  for (const line of reports.flat()) console.log(line);
} finally {
  await browser?.close();
  server?.close();
}
console.log(
  `[slides-density] ${urls.length} decks: ${failed} findings below ${FAIL} or of the wrong type (fail), ${noticed} below ${NOTICE} (notice)${broken ? `, ${broken} decks did not render` : ""}`,
);
process.exit(failed || broken ? 1 : 0);

async function check(browser: Browser, url: string): Promise<string[]> {
  const deck = new URL(url).pathname.replace(/\/print$/, "").replace(/^\//, "");
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await settlePrintPage(page, url);
    return (await page.$$eval(".print-slide", measure, NOTICE, [...FIT_STYLE])).map((r) => {
      if ("unfitted" in r) {
        failed++;
        return `FAIL /${deck}/${r.i} "${r.title}": ${UNFITTED}`;
      }
      if ("use" in r) {
        failed++;
        return `FAIL /${deck}/${r.i} "${r.title}": ${STATEMENT}`;
      }
      if ("word" in r) {
        const fail = r.word < FAIL;
        if (fail) failed++;
        else noticed++;
        return `${fail ? "FAIL" : "NOTICE"} /${deck}/${r.i} heading scale ${r.word.toFixed(2)} "${r.title}": ${WORD}`;
      }
      const level = r.scale < FAIL ? "FAIL" : "NOTICE";
      if (level === "FAIL") failed++;
      else noticed++;
      const hint =
        r.groups > 1
          ? `split into ${r.groups} slides by ${r.label}: ${r.split}`
          : `one ${r.label} is taller than the slide: split its text or show it as a diagram`;
      return `${level} /${deck}/${r.i} scale ${r.scale.toFixed(2)} "${r.title}": ${hint}`;
    });
  } catch (e) {
    broken++;
    return [`FAIL ${deck} did not render: ${(e as Error).message}`];
  } finally {
    // A crashed page rejects close: its deck is already counted as broken.
    await page.close().catch(() => {});
  }
}

/** A slide the fit guard never fitted, one of the wrong type, one with a heading shrunk to fit a
 *  word, or one the fit guard shrank. */
type Row =
  | { i: number; title: string; unfitted: true }
  | { i: number; title: string; use: true }
  | { i: number; title: string; word: number }
  | { i: number; title: string; scale: number; label: string; groups: number; split: string };

function measure(nodes: Element[], notice: number, fitStyle: string[]) {
  return nodes.flatMap((slide, i): Row[] => {
    const title = slide.querySelector("h1, h2")?.textContent?.trim().slice(0, 60) ?? "";
    // The page did not hydrate, so no scale below can be read.
    if (slide.querySelector(".slide-shell > .slide-content:not([data-fitted])"))
      return [{ i, title, unfitted: true as const }];
    const misused = (slide as HTMLElement).dataset.use ? [{ i, title, use: true as const }] : [];
    // A heading the fit guard shrank so that its widest word fits (SlideShell's fitWords).
    const word = Math.min(
      1,
      ...[...slide.querySelectorAll<HTMLElement>("[data-word-scale]")].map(
        (h) => parseFloat(h.dataset.wordScale!) || 1,
      ),
    );
    const words = word < notice ? [{ i, title, word }] : [];
    const box = slide.querySelector<HTMLElement>(
      ".slide-body[style*='zoom'], .slide-content[style*='zoom']",
    );
    const scale = box ? parseFloat(box.style.zoom) || 1 : 1;
    if (misused.length || !box || scale >= notice) return [...misused, ...words];
    // Lay the box out at full size and natural width, as the fit guard measures it, to see where
    // its blocks fall.
    const kept = fitStyle.map((p) => box.style.getPropertyValue(p));
    fitStyle.forEach((p) => box.style.removeProperty(p));
    let parent: Element = box;
    while (parent.children.length === 1) parent = parent.children[0];
    const blocks = [...parent.children].filter((c) => getComputedStyle(c).position !== "absolute");
    const avail = box.clientHeight * 0.9;
    const groups: number[][] = [];
    let start = blocks[0]?.getBoundingClientRect().top ?? 0;
    let group: number[] = [];
    blocks.forEach((b, k) => {
      const r = b.getBoundingClientRect();
      if (group.length && r.bottom - start > avail) {
        groups.push(group);
        group = [];
        start = r.top;
      }
      group.push(k + 1);
    });
    if (group.length) groups.push(group);
    fitStyle.forEach((p, k) => box.style.setProperty(p, kept[k]));
    const label = parent.tagName === "UL" ? "list item" : "block";
    const split = groups.map((g) => (g.length > 1 ? `${g[0]}-${g.at(-1)}` : `${g[0]}`)).join(" | ");
    return [...words, { i, scale, title, label, groups: groups.length, split }];
  });
}
