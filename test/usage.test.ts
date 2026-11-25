import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GUIDANCE } from "../catalog/guidance";
import { readUsage } from "../catalog/usage";
import { entriesOf, ignoredFields } from "../scripts/usage";
import { twoColumnAsSplit } from "../lib/slide-utils";
import { slideCatalog } from "../specimen/slide-catalog";
import type { ContentSlide, Slide } from "../types/slide";

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
  const json: unknown = out.stdout && JSON.parse(out.stdout);
  return { code: out.status, err: out.stderr, json };
};

describe("catalog usage counts", () => {
  it("sums entry IDs that match inherited object properties", () => {
    const first = join(dir, "usage-first.json");
    const second = join(dir, "usage-second.json");
    writeFileSync(first, '{"decks":1,"slides":3,"entries":{"constructor":1,"__proto__":2}}');
    writeFileSync(second, '{"decks":1,"slides":2,"entries":{"constructor":2,"__proto__":1}}');

    expect(Object.entries(readUsage([first, second].join(",")).entries)).toEqual([
      ["constructor", 3],
      ["__proto__", 3],
    ]);
  });

  it("rejects an array in place of the entry count object", () => {
    const file = join(dir, "usage-array.json");
    writeFileSync(file, '{"decks":1,"slides":3,"entries":[3]}');

    expect(() => readUsage(file)).toThrow(/usage-array\.json holds no slides-usage output/);
  });
});

describe("slides-usage", () => {
  // Every entry a deck can use; a "-2" anchor is a specimen's second tile.
  const catalogueEntries = Object.keys(GUIDANCE).filter((id) => !/-\d+$/.test(id));

  it("finds a catalogue entry for every slide of the specimen deck", () => {
    expect(slideCatalog.slides.filter((s) => !entriesOf(s).length)).toEqual([]);
  });

  it("reaches every catalogue entry from the specimen deck", () => {
    const reached = new Set(slideCatalog.slides.flatMap(entriesOf));
    expect(catalogueEntries.filter((id) => !reached.has(id))).toEqual([]);
  });

  it("counts the quotation and trend variants under their own entry names", () => {
    expect(
      entriesOf({ type: "statement", lines: ["a"], attribution: "b" } as unknown as Slide),
    ).toEqual(["statement-quotation"]);
    expect(entriesOf({ type: "chart", variant: "trend" } as unknown as Slide)).toEqual([
      "chart-trend",
    ]);
  });

  it("counts a replaced form for the entry that replaces it", () => {
    const grid = { type: "grid", variant: "stats", cards: [] } as unknown as Slide;
    expect(entriesOf(grid)).toEqual(["content", "block-numbers"]);
    const block = (b: object) =>
      entriesOf({ type: "content", headline: "h", content: [b, { type: "table" }] } as never);
    expect(block({ type: "labeled-grid", items: [] })).toContain("block-cards-dense");
    expect(block({ type: "four-column", columns: [] })).toContain("block-cards-dense");
    expect(block({ type: "pipeline", stages: [] })).toEqual([
      "content",
      "block-flow",
      "block-table",
    ]);
    expect(block({ type: "positions", axis: {}, items: [] })).toContain("comparison-positions");
  });

  it("counts a slide as the form it is drawn in", () => {
    const content = (blocks: object[], extra: object = {}) =>
      entriesOf({ type: "content", headline: "h", content: blocks, ...extra } as never);
    const side = { title: "t", items: ["a"] };
    // Drawn as bullets, which the print page marks: counted as drawn (F32).
    expect(content([{ type: "bullets", items: ["a"] }])).toEqual(["content"]);
    expect(() => content([{ type: "bulets", items: ["a"] }])).toThrow(/bulets/);
    expect(content([{ type: "two-column", left: side, right: side }])).toEqual([
      "comparison-split",
    ]);
    expect(
      content([
        { type: "image", src: "a" },
        { type: "image", src: "b" },
      ]),
    ).toEqual(["content", "block-two-images"]);
    const regular = {
      type: "regular",
      headline: "h",
      sections: ["a", "b", "c"].map((title) => ({ title, text: "t" })),
    } as never;
    expect(entriesOf(regular)).toContain("block-cards-dense");
  });

  it("prints counts over all decks and lists the unused entries", () => {
    const deck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };
    const { code, json } = run(deck, deck);
    expect(code).toBe(0);
    expect(json).toEqual({
      decks: 2,
      slides: 2,
      entries: { agenda: 2 },
      unused: catalogueEntries.filter((id) => id !== "agenda"),
    });
  });

  it("fails on a slide no entry draws, naming it, and on a file that is no deck", () => {
    const { code, err } = run({ lang: "en", slides: [{ type: "nope" }] });
    expect(code).toBe(1);
    expect(err).toContain("slide 1: type nope");
    expect(run({ headline: "x" }).code).toBe(1);
    const malformed = run({ lang: "en", slides: [{ type: "content", headline: "x" }] });
    expect(malformed.code).toBe(1);
    expect(malformed.err).toContain("slide 1: malformed");
  });

  it("reads an array of decks from standard input, counting each deck", () => {
    const deck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };
    const out = spawnSync("bun", [script, "-"], {
      encoding: "utf8",
      input: JSON.stringify([deck, deck, deck]),
    });
    expect(out.status).toBe(0);
    expect(JSON.parse(out.stdout)).toMatchObject({ decks: 3, slides: 3, entries: { agenda: 3 } });
  });

  it("reads an array of decks from a file too, and fails on no deck at all", () => {
    const deck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };
    expect(run([deck, deck]).json).toMatchObject({ decks: 2, entries: { agenda: 2 } });
    const empty = spawnSync("bun", [script, "-"], { encoding: "utf8", input: "[]" });
    expect(empty.status).toBe(1);
    expect(empty.stderr).toContain("no deck");
  });

  it.each([
    [
      "its slug",
      { lang: "en", slug: "kickoff", slides: [{ type: "nope" }] },
      /kickoff \(\S+\[1\]\) slide 1: type nope/,
    ],
    [
      "its name when slug is empty",
      { lang: "en", slug: "", name: "Retro", slides: [{ type: "nope" }] },
      /Retro \(\S+\[1\]\) slide 1: type nope/,
    ],
    [
      "its file and index when unnamed",
      { lang: "en", slides: [{ type: "nope" }] },
      /\.json\[1\] slide 1: type nope/,
    ],
    ["its name when the item is no deck", { name: "Draft" }, /Draft \(\S+\[1\]\) is no deck/],
  ])("names a broken deck in an array by %s", (_label, broken, expected) => {
    const deck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };
    const { code, err } = run([deck, broken]);
    expect(code).toBe(1);
    expect(err).toMatch(expected);
  });

  // A deck-data lint for what the type checker cannot see: each rule hit by a planted field, and
  // its control, the same slide where the field draws, passing.
  it.each([
    [
      "a grid whose cards name an icon",
      { type: "grid", headline: "h", numberFrom: 3, cards: [{ title: "t", icon: "x" }] },
      ["numberFrom: a grid numbers its pillars only where no card names an icon"],
    ],
    [
      "a grid without icons",
      { type: "grid", headline: "h", numberFrom: 3, cards: [{ title: "t" }] },
      [],
    ],
    [
      "an unnumbered cards block",
      {
        type: "content",
        headline: "h",
        content: [{ type: "cards", items: [], numberFrom: 4, numbered: false }],
      },
      ["numberFrom: the cards block is not numbered"],
    ],
    [
      "a numbered cards block",
      {
        type: "content",
        headline: "h",
        content: [{ type: "cards", items: [], numberFrom: 4, numbered: true }],
      },
      [],
    ],
  ])("checks numberFrom on %s", (_label, slide, expected) => {
    expect(ignoredFields(slide as Slide)).toEqual(expected);
  });

  const themedContent = (extra: object) => ({
    type: "content",
    headline: "h",
    sectionTheme: "accent",
    content: [{ type: "bullets", items: ["a", "b", "c"] }],
    ...extra,
  });

  it.each([
    [
      "a plain content slide with no rule or pill",
      themedContent({}),
      ["sectionTheme: accent changes no rule, pill or slide type here"],
    ],
    [
      "a content slide with a footer whose border colour changes",
      themedContent({ footer: "f" }),
      [],
    ],
    // A footer's rule takes the section's colour; the default section's colour is no change.
    [
      "a content slide whose footer matches the default border colour",
      themedContent({ footer: "f", sectionTheme: "secondary" }),
      ["sectionTheme: secondary changes no rule, pill or slide type here"],
    ],
    // A principle's pill takes only the success colour.
    [
      "a content slide whose principle matches the default pill colour",
      themedContent({ principle: "p" }),
      ["sectionTheme: accent changes no rule, pill or slide type here"],
    ],
    [
      "a content slide whose principle takes the success pill colour",
      themedContent({ principle: "p", sectionTheme: "success" }),
      [],
    ],
    ["a deep-dive content slide", themedContent({ sectionTheme: "deepdive" }), []],
    [
      "a lanes slide, which draws no section rule or pill",
      { type: "lanes", headline: "h", lanes: [], sectionTheme: "accent" },
      ["sectionTheme: accent changes no rule, pill or slide type here"],
    ],
    // A centred slide draws neither its footer's rule nor a principle in the section's colour.
    [
      "a centred content slide, even with a footer",
      themedContent({ layout: "centered", footer: "f" }),
      ["sectionTheme: accent changes no rule, pill or slide type here"],
    ],
  ])("checks sectionTheme on %s", (_label, slide, expected) => {
    expect(ignoredFields(slide as Slide)).toEqual(expected);
  });

  it("keeps sectionTheme when it prevents a lone neutral two-column block from becoming a split", () => {
    const split = {
      type: "content",
      headline: "h",
      sectionTheme: "accent",
      content: [
        {
          type: "two-column",
          left: { title: "a", items: ["x"] },
          right: { title: "b", items: ["y"] },
        },
      ],
    };
    expect(twoColumnAsSplit({ ...split, sectionTheme: undefined } as ContentSlide)).toBeDefined();
    expect(ignoredFields(split as Slide)).toEqual([]);
  });

  it("fails on such a field and on a deck that names no language, title slides counted", () => {
    const agenda = { type: "agenda", headline: "h", items: [] };
    const lanes = { type: "lanes", headline: "h", lanes: [], sectionTheme: "accent" };
    const dead = run({ lang: "en", slides: [agenda, lanes] });
    expect(dead.code).toBe(1);
    expect(dead.err).toMatch(/slide 2: draws nothing, sectionTheme/);
    const silent = run({ name: "Untitled", slides: [agenda] });
    expect(silent.code).toBe(1);
    expect(silent.err).toContain("names no lang");
    expect(run({ slides: [{ type: "title", title: "t", lang: "de" }, agenda] }).code).toBe(0);
  });

  const usageOut = (deck: string, ...args: string[]) =>
    spawnSync("bun", [script, ...args, deck], {
      encoding: "utf8",
      env: { ...process.env, npm_lifecycle_event: "", npm_lifecycle_script: "" },
    });

  it("writes counts to --out and passes --check when the file matches", () => {
    const deck = join(dir, "write.json");
    writeFileSync(
      deck,
      JSON.stringify({ lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] }),
    );
    const file = join(dir, "written-usage.json");
    expect(usageOut(deck, "--out", file).status).toBe(0);
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({ entries: { agenda: 1 } });
    expect(usageOut(deck, "--out", file, "--check").status).toBe(0);
  });

  it("fails --check when the output file is missing or differs, naming the re-run command", () => {
    const deck = join(dir, "check.json");
    writeFileSync(
      deck,
      JSON.stringify({ lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] }),
    );
    const missing = join(dir, "missing-usage.json");
    expect(usageOut(deck, "--out", missing, "--check").status).toBe(1);
    const file = join(dir, "stale-usage.json");
    writeFileSync(file, "{}");
    const stale = usageOut(deck, "--out", file, "--check");
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain(`is stale: run "slides-usage --out ${file} ${deck}" and commit`);
  });

  it("names the re-run of a stale file a consumer can type: its script, or the pipe's command", () => {
    const file = join(dir, "piped.json");
    writeFileSync(file, "{}");
    const input = JSON.stringify({ lang: "en", slides: [] });
    const piped = (env: Record<string, string>) =>
      spawnSync("bun", [script, "--out", file, "-", "--check"], {
        encoding: "utf8",
        input,
        env: { ...process.env, npm_lifecycle_event: "", npm_lifecycle_script: "", ...env },
      }).stderr;
    expect(piped({})).toContain("run the command that wrote it again, without --check, and commit");
    // Another tool's --check in the script leaves it the one that writes.
    const text = `bun decks.ts | slides-usage --out ${file} - && prettier --check ${file}`;
    expect(piped({ npm_lifecycle_event: "usage", npm_lifecycle_script: text })).toContain(
      'run "bun run usage" and commit',
    );
    // A script that is the check itself would only check again.
    expect(
      piped({ npm_lifecycle_event: "check:usage", npm_lifecycle_script: "bun run usage --check" }),
    ).toContain("run the command that wrote it again");
  });
});
