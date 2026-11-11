import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("--help", () => {
  for (const [script, flags] of [
    ["density.ts", ["--site", "--serve"]],
    ["usage.ts", ["--out", "--check"]],
    ["render-pptx.ts", ["--assets", "--strict", "--embed-fonts"]],
  ] as const)
    it(`${script} prints its arguments and exits 0`, () => {
      const run = spawnSync("bun", [join(__dirname, "../scripts", script), "--help"], {
        encoding: "utf8",
      });
      expect(run.status).toBe(0);
      expect(run.stdout).toMatch(/^usage: slides-/i);
      for (const flag of flags) expect(run.stdout).toContain(flag);
    });
});
