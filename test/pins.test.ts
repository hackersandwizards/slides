import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(__dirname, "../scripts/pins.ts");

/** A consumer pinning brand at `pin`, with `installed` in its node_modules (none when undefined). */
function consumer(pin: string, installed?: string) {
  const root = mkdtempSync(join(tmpdir(), "slides-pins-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ devDependencies: { "@hackersandwizards/brand": pin, react: "19.0.0" } }),
  );
  if (installed) {
    const dir = join(root, "node_modules/@hackersandwizards/brand");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ version: installed }));
  }
  const run = spawnSync("bun", [script], { cwd: root, encoding: "utf8" });
  return { code: run.status, err: run.stderr };
}

const tag = (v: string) => `git+https://github.com/hackersandwizards/brand.git#v${v}`;

describe("slides-pins", () => {
  it("passes an install that matches its pin", () => {
    expect(consumer(tag("0.24.4"), "0.24.4").code).toBe(0);
  });

  it("fails a stale install, naming both versions", () => {
    const { code, err } = consumer(tag("0.24.4"), "0.21.6");
    expect(code).toBe(1);
    expect(err).toContain("pins v0.24.4, node_modules holds 0.21.6");
  });

  it("fails a pinned package that is not installed", () => {
    expect(consumer(tag("0.24.4")).code).toBe(1);
  });

  it("fails a pin without a tag", () => {
    expect(consumer("git+https://github.com/hackersandwizards/brand.git", "0.24.4").code).toBe(1);
  });
});
