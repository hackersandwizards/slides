#!/usr/bin/env bun
// The density guard a consumer runs in its own gate: renders each deck's print route at
// 1920x1080 and reads the factor by which the fit guard (SlideShell) shrinks each slide. Below
// FAIL a slide fails the run; below NOTICE it is listed without failing. Body text stands at 36 px
// (18 pt on a 960 pt slide) at factor 1 and shrinks with it, so 0.8 keeps it at 29 px. Each listed
// slide gets a split suggestion: its blocks laid out at full size, grouped into slides that fit.
//
//   slides-density [--serve "<command>"] <print-url> ...
//
// `--serve` starts the consumer's server for the run, waits until the first URL's origin answers
// and stops it at the end. Exit 1 on any slide below FAIL or any deck that does not render.

import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:os";
import puppeteer, { type Browser } from "puppeteer";

const FAIL = 0.8;
const NOTICE = 0.9;

const args = process.argv.slice(2);
const at = args.indexOf("--serve");
const serve = at < 0 ? undefined : args.splice(at, 2)[1];
const urls = args;
if (!urls.length) {
  console.error('usage: slides-density [--serve "<command>"] <print-url> ...');
  process.exit(2);
}

let server: ChildProcess | undefined;
// The server runs detached, so a signal reaches only this process and would leave it running.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
  process.on(signal, () => {
    server?.kill();
    process.exit(128 + constants.signals[signal]);
  });
if (serve) await start(serve, new URL(urls[0]).origin);
let browser: Browser | undefined;
let failed = 0;
let noticed = 0;
let broken = 0;
try {
  browser = await puppeteer.launch({ headless: true, protocolTimeout: 900_000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  for (const url of urls) {
    const deck = new URL(url).pathname.replace(/\/print$/, "").replace(/^\//, "");
    try {
      await settle(page, url);
    } catch (e) {
      broken++;
      console.log(`FAIL ${deck} did not render: ${(e as Error).message}`);
      continue;
    }
    for (const r of await page.$$eval(".print-slide", measure, NOTICE)) {
      const level = r.scale < FAIL ? "FAIL" : "NOTICE";
      if (level === "FAIL") failed++;
      else noticed++;
      const hint =
        r.groups > 1
          ? `split into ${r.groups} slides by ${r.label}: ${r.split}`
          : `one ${r.label} is taller than the slide: split its text or show it as a diagram`;
      console.log(`${level} ${deck}/${r.i} scale ${r.scale.toFixed(2)} "${r.title}": ${hint}`);
    }
  }
} finally {
  await browser?.close();
  server?.kill();
}
console.log(
  `[slides-density] ${urls.length} decks: ${failed} slides below ${FAIL} (fail), ${noticed} below ${NOTICE} (notice)${broken ? `, ${broken} decks did not render` : ""}`,
);
process.exit(failed || broken ? 1 : 0);

async function start(command: string, origin: string) {
  const answers = () =>
    fetch(origin).then(
      () => true,
      () => false,
    );
  // A server left over from an earlier run would answer for this one and be judged instead.
  if (await answers()) throw new Error(`${origin} already answers: stop that server first`);
  const child = (server = spawn(command, { shell: true, stdio: "ignore", detached: true }));
  // Started detached, so the kill reaches the shell's children too.
  const kill = child.kill.bind(child);
  child.kill = () => {
    try {
      process.kill(-child.pid!, "SIGTERM");
      return true;
    } catch {
      return kill();
    }
  };
  for (let i = 0; i < 300; i++) {
    if (await answers()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error(`no server at ${origin} after 60 s`);
}

async function settle(page: import("puppeteer").Page, url: string) {
  const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 300_000 });
  if (!res?.ok()) throw new Error(`HTTP ${res?.status()}`);
  // A chart draws after hydration, and a web font arriving refits the slide.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-chart-plot]")].every((box) => box.querySelector("svg")),
    { timeout: 300_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.$(".print-slide"))) throw new Error("no .print-slide elements");
  // The fit guard refits on its ResizeObserver: two frames and a pause let it land.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await new Promise((r) => setTimeout(r, 500));
}

function measure(nodes: Element[], notice: number) {
  return nodes.flatMap((slide, i) => {
    const box = slide.querySelector<HTMLElement>(
      ".slide-body[style*='scale'], .slide-content[style*='scale']",
    );
    const scale = box ? parseFloat(box.style.scale) || 1 : 1;
    if (!box || scale >= notice) return [];
    // Lay the box out at full size and natural width to see where its blocks fall.
    const kept = [box.style.scale, box.style.width];
    box.style.scale = "";
    box.style.width = "";
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
    [box.style.scale, box.style.width] = kept;
    const title = slide.querySelector("h1, h2")?.textContent?.trim().slice(0, 60) ?? "";
    const label = parent.tagName === "UL" ? "list item" : "block";
    const split = groups.map((g) => (g.length > 1 ? `${g[0]}-${g.at(-1)}` : `${g[0]}`)).join(" | ");
    return [{ i, scale, title, label, groups: groups.length, split }];
  });
}
