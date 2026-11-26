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

import puppeteer, { ProtocolError, type Browser } from "puppeteer";
import { FIT_STYLE } from "../lib/stage-fit";
import { UNFITTED_SLIDE, settlePrintPage } from "./render-pdf";
import { serveDir } from "./serve-dir";

const FAIL = 0.8;
const NOTICE = 0.9;
const SLIDE_FIT = { unfittedSelector: UNFITTED_SLIDE, styleProperties: [...FIT_STYLE] };
const PAGES = 4;
const WORD =
  "a heading's word is wider than its box and shrinks the heading: shorten the word or give it a wider box";
const UNFITTED =
  "the fit guard never ran on this slide, so its scale cannot be read: check the page's console for an error and its print route for client:load";
const STATEMENT =
  "one or two short bullets leave the slide empty: make it the statement slide bulletsAsStatement in lib/content-redraw returns";

const USAGE = [
  'usage: slides-density --site <dir> | --serve "<command>" </deck/print> ...',
  "       slides-density <print-url> ...",
  "  --site <dir>         serve a built site's folder, such as dist, for the run",
  "  --serve \"<command>\"  start the consumer's server through scaffolding's serve, which sets HOST and PORT",
  "With either, a path such as /<deck>/print is read against that server.",
].join("\n");
let failed = 0;
let noticed = 0;
let broken = 0;

async function startServer(site?: string, serve?: string) {
  if (site) return serveDir(site);
  if (!serve) return;
  // Imported only here, so a consumer serving its site itself needs no scaffolding.
  const { serve: start } = await import("@hackersandwizards/scaffolding/serve");
  const { url, stop } = await start(["/bin/sh", "-c", serve]);
  return { origin: url, close: stop };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(USAGE);
    process.exit(0);
  }
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
    console.error(USAGE);
    process.exit(2);
  }
  const server = await startServer(site, serve);
  const urls = args.map((arg) => (server ? new URL(arg, server.origin).href : arg));
  let browser: Browser | undefined;
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
    `[slides-density] ${urls.length} decks: ${failed} findings below ${FAIL}, of the wrong type or unfitted (fail), ${noticed} below ${NOTICE} (notice)${broken ? `, ${broken} decks did not render` : ""}`,
  );
  process.exit(failed || broken ? 1 : 0);
}

async function check(browser: Browser, url: string): Promise<string[]> {
  const deck = new URL(url).pathname.replace(/\/print$/, "").replace(/^\//, "");
  const page = await browser.newPage();
  let reports: string[];
  let closeFailure: { cause: unknown } | undefined;
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await settlePrintPage(page, url);
    const snapshots = await page.$$eval(".print-slide", snapshotSlides, SLIDE_FIT, NOTICE);
    const rows = snapshots.flatMap(classifySlide);
    reports = rows.map((r) => {
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
    reports = [`FAIL ${deck} did not render: ${(e as Error).message}`];
  } finally {
    try {
      await page.close();
    } catch (error) {
      // If Chrome cannot close the tab, the CLI still closes its browser after all decks run.
      if (!(error instanceof ProtocolError) && !page.isClosed() && browser.connected)
        closeFailure = { cause: error };
    }
  }
  if (closeFailure) throw closeFailure.cause;
  return reports;
}

/** A slide the fit guard never fitted, one of the wrong type, one with a heading shrunk to fit a
 *  word, or one the fit guard shrank. */
type Row =
  | { i: number; title: string; unfitted: true }
  | { i: number; title: string; use: true }
  | { i: number; title: string; word: number }
  | { i: number; title: string; scale: number; label: string; groups: number; split: string };

interface BlockLayout {
  tag: string;
  avail: number;
  blocks: { top: number; bottom: number }[];
}

type SlideSnapshot =
  | { i: number; title: string; unfitted: true }
  | {
      i: number;
      title: string;
      unfitted: false;
      use: boolean;
      word: number;
      scale: number;
      layout?: BlockLayout;
    };

function snapshotSlides(
  nodes: Element[],
  { styleProperties, unfittedSelector }: typeof SLIDE_FIT,
  notice: number,
): SlideSnapshot[] {
  return nodes.map((slide, i): SlideSnapshot => {
    const title = slide.querySelector("h1, h2")?.textContent ?? "";
    if (slide.querySelector(unfittedSelector)) return { i, title, unfitted: true };
    const use = !!(slide as HTMLElement).dataset.use;
    // A heading the fit guard shrank so that its widest word fits (SlideShell's fitWords).
    const word = Math.min(
      1,
      ...[...slide.querySelectorAll<HTMLElement>("[data-word-scale]")].map(
        (h) => parseFloat(h.dataset.wordScale!) || 1,
      ),
    );
    const box = slide.querySelector<HTMLElement>(
      ".slide-body[style*='zoom'], .slide-content[style*='zoom']",
    );
    if (!box) return { i, title, unfitted: false, use, word, scale: 1 };
    const scale = parseFloat(box.style.zoom) || 1;
    if (use || scale >= notice) return { i, title, unfitted: false, use, word, scale };
    // Lay the box out at full size and natural width, as the fit guard measures it, to see where
    // its blocks fall.
    const kept = styleProperties.map((p) => box.style.getPropertyValue(p));
    styleProperties.forEach((p) => box.style.removeProperty(p));
    let parent: Element = box;
    while (parent.children.length === 1) parent = parent.children[0];
    const blocks = [...parent.children]
      .filter((c) => getComputedStyle(c).position !== "absolute")
      .map((b) => {
        const { top, bottom } = b.getBoundingClientRect();
        return { top, bottom };
      });
    const avail = box.clientHeight * 0.9;
    styleProperties.forEach((p, k) => box.style.setProperty(p, kept[k]));
    return {
      i,
      title,
      unfitted: false,
      use,
      word,
      scale,
      layout: { tag: parent.tagName, avail, blocks },
    };
  });
}

export function planSplit(
  blocks: readonly { top: number; bottom: number }[],
  avail: number,
): { groups: number; split: string } {
  const groups: number[][] = [];
  let start = blocks[0]?.top ?? 0;
  let group: number[] = [];
  blocks.forEach((r, k) => {
    if (group.length && r.bottom - start > avail) {
      groups.push(group);
      group = [];
      start = r.top;
    }
    group.push(k + 1);
  });
  if (group.length) groups.push(group);
  const split = groups.map((g) => (g.length > 1 ? `${g[0]}-${g.at(-1)}` : `${g[0]}`)).join(" | ");
  return { groups: groups.length, split };
}

function classifySlide(slide: SlideSnapshot): Row[] {
  const { i } = slide;
  const title = slide.title.trim().slice(0, 60);
  if (slide.unfitted) return [{ i, title, unfitted: true }];
  const rows: Row[] = [];
  if (slide.use) rows.push({ i, title, use: true });
  if (slide.word < NOTICE) rows.push({ i, title, word: slide.word });
  if (!slide.use && slide.scale < NOTICE && slide.layout) {
    const label = slide.layout.tag === "UL" ? "list item" : "block";
    rows.push({
      i,
      title,
      scale: slide.scale,
      label,
      ...planSplit(slide.layout.blocks, slide.layout.avail),
    });
  }
  return rows;
}
