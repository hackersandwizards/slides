import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const script = join(__dirname, "../scripts/pins.ts");
const root = mkdtempSync(join(tmpdir(), "slides-pins-"));
afterAll(() => rmSync(root, { recursive: true }));

function consumer(pin?: string) {
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { "@hackersandwizards/brand": pin, react: "19.0.0" } }),
  );
  const run = spawnSync("bun", [script], { cwd: root, encoding: "utf8" });
  return { code: run.status, err: run.stderr };
}

const tag = (v: string) => `git+https://github.com/hackersandwizards/brand.git#v${v}`;

describe("slides-pins", () => {
  const [, minimum] = /brand` v(\d+\.\d+\.\d+) or later/.exec(
    readFileSync(join(__dirname, "../README.md"), "utf8"),
  )!;
  const [major, minor, patch] = minimum.split(".").map(Number);
  const below = patch
    ? `${major}.${minor}.${patch - 1}`
    : minor
      ? `${major}.${minor - 1}.0`
      : `${major - 1}.0.0`;
  // Later by number, earlier as text (2.100.0 against 2.20.0, say): a string comparison fails it.
  const later = `${major}.1${"0".repeat(String(minor).length)}.0`;

  it("passes the README's minimum, a later tag and a range starting there", () => {
    for (const pin of [
      tag(minimum),
      tag(later),
      tag("3.0.0"),
      `^${minimum}`,
      `~${minimum}`,
      minimum,
    ])
      expect(consumer(pin).code, pin).toBe(0);
  });

  it("fails a tag or range below the minimum, naming pin and minimum", () => {
    for (const pin of [tag("1.68.0"), tag(below), `^${below}`]) {
      const { code, err } = consumer(pin);
      expect(code, pin).toBe(1);
      expect(err).toContain(`@hackersandwizards/brand: ${pin}`);
      expect(err).toContain(`v${minimum}`);
    }
  });

  it("fails a pin it cannot read a version from", () => {
    for (const pin of ["git+https://github.com/hackersandwizards/brand.git#main", "*", "latest"]) {
      const { code, err } = consumer(pin);
      expect(code, pin).toBe(1);
      expect(err).toContain("names no version");
    }
  });

  it("fails a consumer without a brand pin, naming it", () => {
    const { code, err } = consumer();
    expect(code).toBe(1);
    expect(err).toContain("@hackersandwizards/brand: package.json pins no version");
  });
});
