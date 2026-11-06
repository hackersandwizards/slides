import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(__dirname, "../scripts/pins.ts");

/** A consumer pinning brand at `pin` (no pin when undefined). */
function consumer(pin?: string) {
  const root = mkdtempSync(join(tmpdir(), "slides-pins-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { "@hackersandwizards/brand": pin, react: "19.0.0" } }),
  );
  const run = spawnSync("bun", [script], { cwd: root, encoding: "utf8" });
  return { code: run.status, err: run.stderr };
}

const tag = (v: string) => `git+https://github.com/hackersandwizards/brand.git#v${v}`;

describe("slides-pins", () => {
  it("passes a consumer that pins brand", () => {
    expect(consumer(tag("0.24.4")).code).toBe(0);
  });

  it("fails a consumer without a brand pin, naming it", () => {
    const { code, err } = consumer();
    expect(code).toBe(1);
    expect(err).toContain("@hackersandwizards/brand: package.json pins no version");
  });
});
