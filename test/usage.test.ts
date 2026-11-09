import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GUIDANCE } from "../catalog/guidance";
import { entriesOf } from "../scripts/usage";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";

const script = join(__dirname, "../scripts/usage.ts");
const dir = mkdtempSync(join(tmpdir(), "slides-usage-"));
afterAll(() => rmSync(dir, { recursive: true }));

const run = (...decks: unknown[]) => {
  const paths = decks.map((deck, i) => {
    const path = join(dir, `${i}.json`);
    writeFileSync(path, JSON.stringify(deck));
    return path;
  });
  const out = spawnSync("bun", [script, ...paths], { encoding: "utf8" });
  return { code: out.status, err: out.stderr, json: out.stdout && JSON.parse(out.stdout) };
};

describe("slides-usage", () => {
  it("finds a catalogue entry for every slide of the specimen deck", () => {
    expect(slideCatalog.slides.filter((s) => !entriesOf(s).length)).toEqual([]);
    for (const id of slideCatalog.slides.flatMap(entriesOf)) expect(GUIDANCE).toHaveProperty(id);
  });

  // Every entry a deck can use is reached by a specimen slide; a "-2" is a specimen's second tile.
  it("reaches every catalogue entry from the specimen deck", () => {
    const reached = new Set(slideCatalog.slides.flatMap(entriesOf));
    expect(Object.keys(GUIDANCE).filter((id) => !reached.has(id) && !/-\d+$/.test(id))).toEqual([]);
  });

  it("counts a type, a variant and each kind of block once per slide", () => {
    const content = {
      type: "content",
      headline: "h",
      content: [
        { type: "cards", items: [] },
        { type: "cards", items: [] },
        { type: "bars", bars: [] },
      ],
    } as unknown as Slide;
    expect(entriesOf(content)).toEqual(["content", "block-cards", "block-bars"]);
    expect(
      entriesOf({ type: "statement", lines: ["a"], attribution: "b" } as unknown as Slide),
    ).toEqual(["statement-quotation"]);
    expect(entriesOf({ type: "chart", variant: "trend" } as unknown as Slide)).toEqual([
      "chart-trend",
    ]);
  });

  it("counts a replaced form for the entry that replaces it", () => {
    const grid = { type: "grid", variant: "stats", cards: [] } as unknown as Slide;
    expect(entriesOf(grid)).toEqual(["block-numbers"]);
  });

  it("prints counts over all decks and lists the unused entries", () => {
    const deck = { slides: [{ type: "agenda", headline: "h", items: [] }] };
    const { code, json } = run(deck, deck);
    expect(code).toBe(0);
    expect(json).toMatchObject({ decks: 2, slides: 2, entries: { agenda: 2 } });
    expect(json.unused).toContain("wheel");
    expect(json.unused).not.toContain("agenda");
  });

  it("fails on a slide no entry draws, naming it, and on a file that is no deck", () => {
    const { code, err } = run({ slides: [{ type: "nope" }] });
    expect(code).toBe(1);
    expect(err).toContain("slide 1: type nope");
    expect(run({ headline: "x" }).code).toBe(1);
  });
});
