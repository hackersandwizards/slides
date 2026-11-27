import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { planSplit } from "../../scripts/density";
import { limit } from "./limit";

const dir = mkdtempSync(join(tmpdir(), "slides-density-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const page = (name: string, fitted: boolean, script = "") => {
  mkdirSync(join(dir, name, "print"), { recursive: true });
  writeFileSync(
    join(dir, name, "print", "index.html"),
    `<!doctype html><div class="print-slide"><div class="slide-shell"><div class="slide-content"${
      fitted ? " data-fitted" : ""
    }><h2>${name}</h2></div></div></div>${script}`,
  );
};

// A page that never hydrated read as a deck whose every slide fits: no zoom was taken for scale 1.
it(
  "fails a slide the fit guard never fitted, and passes one it did, late ones included",
  () => {
    page("unfitted", false);
    page("fitted", true);
    // Fitted three seconds after load, past network idle, as a slow hydration.
    page(
      "late",
      false,
      `<script>setTimeout(() => document.querySelector(".slide-content").setAttribute("data-fitted", ""), 3000)</script>`,
    );
    const run = spawnSync(
      "bun",
      ["scripts/density.ts", "--site", dir, "/unfitted/print", "/fitted/print", "/late/print"],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain('FAIL /unfitted/0 "unfitted": the fit guard never ran');
    expect(run.stdout).not.toContain("/fitted/");
    expect(run.stdout).not.toContain("/late/");
    expect(run.status).toBe(1);
  },
  limit(120_000),
);

it(
  "reports misused statements, shrunk headings, and split suggestions for shrunk slides",
  () => {
    mkdirSync(join(dir, "measured", "print"), { recursive: true });
    writeFileSync(
      join(dir, "measured", "print", "index.html"),
      `<!doctype html><style>.slide-body { height: 200px; } ul, li { margin: 0; padding: 0; }</style>
      <div class="print-slide" data-use="statement"><div class="slide-shell"><div class="slide-content" data-fitted><h2>Misused</h2></div></div></div>
      <div class="print-slide"><div class="slide-shell"><div class="slide-content" data-fitted><h2 data-word-scale="0.75">Narrow</h2></div></div></div>
      <div class="print-slide"><div class="slide-shell"><div class="slide-content" data-fitted><h2 data-word-scale="0.85">Tight</h2></div></div></div>
      <div class="print-slide"><div class="slide-shell"><div class="slide-content" data-fitted><h2>List</h2><div class="slide-body" style="zoom: 0.75"><ul><li style="height: 120px">a</li><li style="height: 120px">b</li></ul></div></div></div></div>
      <div class="print-slide"><div class="slide-shell"><div class="slide-content" data-fitted><h2>Tall</h2><div class="slide-body" style="zoom: 0.85"><div style="height: 250px">big</div><div style="height: 50px; position: absolute">abs</div></div></div></div></div>`,
    );
    const run = spawnSync("bun", ["scripts/density.ts", "--site", dir, "/measured/print"], {
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stdout.trim().split("\n")).toEqual([
      'FAIL /measured/0 "Misused": one or two short bullets leave the slide empty: make it the statement slide bulletsAsStatement in @hackersandwizards/slides/lib/slide-utils returns',
      'FAIL /measured/1 heading scale 0.75 "Narrow": a heading\'s word is wider than its box and shrinks the heading: shorten the word or give it a wider box',
      'NOTICE /measured/2 heading scale 0.85 "Tight": a heading\'s word is wider than its box and shrinks the heading: shorten the word or give it a wider box',
      'FAIL /measured/3 scale 0.75 "List": split into 2 slides by list item: 1 | 2',
      'NOTICE /measured/4 scale 0.85 "Tall": one block is taller than the slide: split its text or show it as a diagram',
      "[slides-density] 1 decks: 3 findings below 0.8, of the wrong type or unfitted (fail), 2 below 0.9 (notice)",
    ]);
  },
  limit(120_000),
);

it("publishes the statement conversion named in the density diagnostic", async () => {
  const slideUtils = await import("@hackersandwizards/slides/lib/slide-utils");
  expect(slideUtils).toHaveProperty("bulletsAsStatement", expect.any(Function));
});

it("groups block ranges into slides that fit within the available height", () => {
  expect(
    planSplit(
      [
        { top: 0, bottom: 80 },
        { top: 80, bottom: 160 },
        { top: 160, bottom: 260 },
      ],
      180,
    ),
  ).toEqual({ groups: 2, split: "1-2 | 3" });
});
