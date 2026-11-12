import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
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
