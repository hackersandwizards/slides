import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { slideComponents } from "../lib/slide-components";
import { slideCatalogue } from "../specimen/slide-catalogue";

// The specimen page's catalogue (decision catalogue-grouping), as scripts/specimen.ts writes it
// before the tests run in `bun run check`: every entry under a communication job, and a search
// that finds every slide type, deprecated ones included, and every content block.
const html = readFileSync(join(import.meta.dirname, "..", "specimen", "index.html"), "utf8");
const entries = [...html.matchAll(/<figure id="[^"]+" data-jobs="([^"]*)" data-search="([^"]*)"/g)];
const jobs = new Set([...html.matchAll(/data-job="([a-z]+)"/g)].map(([, j]) => j));

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
