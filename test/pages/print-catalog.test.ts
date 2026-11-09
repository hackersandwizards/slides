import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect, it } from "vitest";
import { slideComponents } from "../../lib/slide-components";
import { slideCatalog } from "../../specimen/slide-catalog";

// Reads the print page `bun run build` writes into dist/ before `check:pages` runs.
const dist = join(import.meta.dirname, "..", "..", "dist");
const print = join(dist, "catalog/print");
const html = readFileSync(join(print, "index.html"), "utf8");
const entries = [...html.matchAll(/<figure id="[^"]+" data-jobs="([^"]*)" data-search="([^"]*)"/g)];
const jobs = new Set([...html.matchAll(/data-job="([a-z]+)"/g)].map(([, j]) => j));

it("links each brand file where dist/brand/ holds it, under its export name", () => {
  const links = ["index.html", "frames.html", "build/slides.css"].flatMap((page) =>
    [...readFileSync(join(print, page), "utf8").matchAll(/(?:\.\.\/)+brand\/[\w./-]+/g)].map(
      ([link]) => resolve(dirname(join(print, page)), link),
    ),
  );
  const names = links.map((link) => relative(join(dist, "brand"), link));
  for (const name of ["header.css", "tokens.root.css", "logos/favicon.svg"])
    expect(names).toContain(name);
  expect(names.filter((name) => name.startsWith("fonts/")).length).toBeGreaterThan(0);
  for (const link of links) expect(existsSync(link), link).toBe(true);
});

it("puts every entry under one or two of the 13 jobs", () => {
  expect(jobs.size).toBe(13);
  for (const [, entryJobs] of entries) {
    const list = entryJobs.split(" ");
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(2);
    for (const job of list) expect(jobs).toContain(job);
  }
});

it("tells for every entry when to take it, with a do and a don't", () => {
  // Split at the entries' own starts: a slide's markup holds figures of its own.
  const figures = html.split(/(?=<figure id="[^"]+" data-jobs=)/).slice(1);
  expect(figures.length).toBeGreaterThan(50);
  for (const figure of figures) {
    expect(figure, figure.slice(0, 80)).toMatch(/<p class="when">[^<]+<\/p>/);
    expect(figure, figure.slice(0, 80)).toMatch(
      /<dt>Do<\/dt><dd>[^<]+<\/dd><dt>Don't<\/dt><dd>[^<]+<\/dd>/,
    );
  }
});

it("finds a schedule by what it is for, not by its type's name", () => {
  const search = (word: string) => entries.filter(([, , s]) => s.includes(word));
  expect(search("schedule").length).toBeGreaterThan(0);
});

it("finds every slide type and content block by its name", () => {
  const words = new Set(entries.flatMap(([, , search]) => search.split(" ")));
  const blocks = slideCatalog.slides.flatMap((s) =>
    s.type === "content" ? s.content.map((b) => b.type) : [],
  );
  const missing = [...Object.keys(slideComponents), ...blocks].filter((n) => !words.has(n));
  expect(missing).toEqual([]);
});

it("names every linked picture by its alt text", () => {
  const frames = readFileSync(join(print, "frames.html"), "utf8");
  const pictures = [...frames.matchAll(/<a [^>]*>(?:(?!<\/a>)[\s\S])*?<img [^>]*>/g)].map(
    ([link]) => link,
  );
  expect(pictures.length).toBeGreaterThan(0);
  for (const link of pictures) expect(link, link).toMatch(/<img [^>]*alt="[^"]*\S[^"]*"/);
});

it("links a stylesheet defining each brand element class the print pages draw", () => {
  for (const page of ["index.html", "frames.html"]) {
    const markup = readFileSync(join(print, page), "utf8");
    const css = [...markup.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .map(([, href]) => readFileSync(resolve(print, href), "utf8"))
      .join("\n");
    const classes = new Set(
      [...markup.matchAll(/class="([^"]*)"/g)].flatMap(([, list]) =>
        list.split(/\s+/).filter((c) => /^hw-[a-z-]+$/.test(c)),
      ),
    );
    expect(classes.size, page).toBeGreaterThan(0);
    const missing = [...classes].filter((c) => !new RegExp(`\\.${c}(?![\\w-])`).test(css));
    expect(missing, page).toEqual([]);
  }
});
