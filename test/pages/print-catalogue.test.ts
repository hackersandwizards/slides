import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { brandNames } from "../../catalog/brand-urls";
import { slideComponents } from "../../lib/slide-components";
import { slideCatalogue } from "../../specimen/slide-catalogue";

// The print page's catalogue (decision catalogue-grouping), as `bun run build` writes it into dist/
// before `check:pages` runs: every entry under a communication job, and a search
// that finds every slide type, deprecated ones included, and every content block.
const html = readFileSync(
  join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "index.html"),
  "utf8",
);
const dist = join(import.meta.dirname, "..", "..", "dist");
const entries = [...html.matchAll(/<figure id="[^"]+" data-jobs="([^"]*)" data-search="([^"]*)"/g)];
const jobs = new Set([...html.matchAll(/data-job="([a-z]+)"/g)].map(([, j]) => j));

it("finds every brand file the pages link in dist/brand/, under its export name", () => {
  const stylesheet = readFileSync(join(dist, "catalog/print/build/slides.css"), "utf8");
  const names = new Set(brandNames(html + stylesheet));
  for (const name of ["header.css", "tokens.root.css", "logos/favicon.svg"])
    expect(names).toContain(name);
  expect([...names].filter((name) => name.startsWith("fonts/")).length).toBeGreaterThan(0);
  for (const name of names) expect(existsSync(join(dist, "brand", name)), name).toBe(true);
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

it("finds every slide type and content block by its name", () => {
  const words = new Set(entries.flatMap(([, , search]) => search.split(" ")));
  const blocks = slideCatalogue.slides.flatMap((s) =>
    s.type === "content" ? s.content.map((b) => b.type) : [],
  );
  const missing = [...Object.keys(slideComponents), ...blocks].filter((n) => !words.has(n));
  expect(missing).toEqual([]);
});
