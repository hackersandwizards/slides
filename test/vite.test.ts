import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importsOf, slidesOptimizeDeps } from "../lib/vite";

/** The browser code: lib/deck-edit-server.ts runs in the dev server's Node middleware and
 *  lib/vite.ts in the config, never in the browser. */
function browserSources(): string[] {
  const root = join(import.meta.dirname, "..");
  return ["components", "lib"].flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file) && !/(^|\/)(deck-edit-server|vite)\.ts$/.test(file))
      .map((file) => readFileSync(join(root, dir, file), "utf8")),
  );
}

/** The bare packages the browser code imports, read by a second, plainer scan than `importsOf`:
 *  one `from` per statement, no comment or string handling; a type-only import never reaches the
 *  browser. */
function bareImports(): string[] {
  return browserSources().flatMap((source) =>
    [...source.matchAll(/^(?:import|export) (?!type )[^;]*?from "([^./][^"]*)"/gm)].map(
      ([, spec]) => spec!,
    ),
  );
}

// Safari before 16.4 rejects a lookbehind as the module parses, so no slide renders there.
it("ships no regex lookbehind to the browser", () => {
  const sources = browserSources();
  expect(sources.some((source) => source.includes("INLINE_MARKDOWN"))).toBe(true);
  expect(sources.filter((source) => /\(\?<[=!]/.test(source))).toEqual([]);
});

describe("slidesOptimizeDeps", () => {
  // An excluded package is not scanned, so a client import missing from the list is found on first
  // render and re-runs the optimizer mid-load.
  it("names every package the plainer scan finds", () => {
    // JSON and `?url` assets, which Vite does not pre-bundle.
    const browser = [...new Set(bareImports())].filter((spec) => !/\.json$|\?url/.test(spec));
    const { include } = slidesOptimizeDeps();
    expect(browser.length).toBeGreaterThan(5);
    expect(browser.filter((spec) => !include.includes(spec))).toEqual([]);
  });

  it("excludes the engine and names the packages its islands import", () => {
    const { exclude, include } = slidesOptimizeDeps();
    expect(exclude).toEqual(["@hackersandwizards/slides"]);
    expect(include).toEqual(
      expect.arrayContaining(["recharts", "motion/react", "shiki/core", "lucide-react/icons/mail"]),
    );
    expect(
      include.filter((s) => /^(node:|next\/|prettier$|\.)|\.(json|css)$|\?url/.test(s)),
    ).toEqual([]);
  });

  it("reads a comment marker inside a string as text", () => {
    const source = [
      'const a = "x/*y";',
      'import b from "kept-package";',
      "/* a comment */",
      'import c from "other";',
      '// import d from "commented-out";',
    ].join("\n");
    expect(importsOf(source)).toEqual(["kept-package", "other"]);
  });
});
