import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GUIDANCE } from "../catalog/guidance";
import { readUsage } from "../catalog/usage";
import { twoColumnAsSplit } from "../lib/content-redraw";
import { entriesOf, ignoredFields } from "../scripts/usage";
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
    expect(() => content([{ type: "bulets", items: ["a"] }])).toThrow(
      new Error(blockFinding("block-bulets")),
    );
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

  const blockFinding = (ids: string) =>
    `No catalogue entry for ${ids}, so the blocks cannot be counted. Set each affected content block's type to a supported ContentBlock type from types/slide.`;
  const unknownSlide = (type: string) =>
    `type ${type} cannot be counted. Set the slide's type to a supported Slide type from types/slide.`;
  const missingSlides =
    "has no slides array, so the check cannot count it as a deck. Supply a Presentation with a slides array as defined in types/slide.";
  const malformedSlide = (detail: string) =>
    `malformed slide data (${detail}) cannot be counted. Fix the slide or block fields to match their types in types/slide.`;

  it("explains how to replace a slide type with no catalogue entry", () => {
    const { code, err } = run({ lang: "en", slides: [{ type: "nope" }] });
    expect(code).toBe(1);
    expect(err).toBe(
      `slides-usage: no catalogue entry for ${join(dir, "0.json")} slide 1: ${unknownSlide("nope")}\n`,
    );
  });

  it("explains how to supply a deck with a slides array", () => {
    const { code, err } = run({ headline: "x" });
    expect(code).toBe(1);
    expect(err).toBe(`slides-usage: ${join(dir, "0.json")} ${missingSlides}\n`);
  });

  it("explains how to repair a malformed content slide", () => {
    const { code, err } = run({ lang: "en", slides: [{ type: "content", headline: "x" }] });
    expect(code).toBe(1);
    expect(err).toBe(
      `slides-usage: ${join(dir, "0.json")} slide 1: ${malformedSlide("undefined is not an object (evaluating 'content.length')")}\n`,
    );
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
    expect(empty.stderr).toBe(
      "slides-usage: The input contains no deck, so there is nothing to count. Pass a deck JSON file or pipe a deck or nonempty array of decks to -.\n",
    );
  });

  const validDeck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };

  it.each([
    [
      "its slug at index 1",
      [validDeck, { lang: "en", slug: "kickoff", slides: [{ type: "nope" }] }],
      `no catalogue entry for kickoff (${join(dir, "0.json")}[1]) slide 1: ${unknownSlide("nope")}`,
    ],
    [
      "its name when slug is empty at index 2",
      [validDeck, validDeck, { lang: "en", slug: "", name: "Retro", slides: [{ type: "nope" }] }],
      `no catalogue entry for Retro (${join(dir, "0.json")}[2]) slide 1: ${unknownSlide("nope")}`,
    ],
    [
      "its file and index when unnamed at index 3",
      [validDeck, validDeck, validDeck, { lang: "en", slides: [{ type: "nope" }] }],
      `no catalogue entry for ${join(dir, "0.json")}[3] slide 1: ${unknownSlide("nope")}`,
    ],
    [
      "its name when the item is no deck at index 1",
      [validDeck, { name: "Draft" }],
      `Draft (${join(dir, "0.json")}[1]) ${missingSlides}`,
    ],
  ])("names a broken deck in an array by %s", (_label, decks, expected) => {
    const { code, err } = run(decks);
    expect(code).toBe(1);
    expect(err).toBe(`slides-usage: ${expected}\n`);
  });

  it("reports every broken deck in one run", () => {
    const unknownTypes = ["nope-first", "nope-second", "nope-third"];
    const brokenDecks = unknownTypes.map((type) => ({ lang: "en", slides: [{ type }] }));
    const { code, err } = run([validDeck, ...brokenDecks]);
    expect(code).toBe(1);
    expect(err.trimEnd().split("\n")).toEqual(
      unknownTypes.map(
        (type, i) =>
          `slides-usage: no catalogue entry for ${join(dir, "0.json")}[${i + 1}] slide 1: ${unknownSlide(type)}`,
      ),
    );
  });

  const deckWithBlockType = (type: unknown) => ({
    lang: "en",
    slides: [{ type: "content", headline: "h", content: [{ type }] }],
  });

  it.each([
    ["image-and-grid", "block-image-and-grid"],
    ["terminal", "block-terminal-and-hooks"],
  ])("counts an array block type containing %s", (type, entry) => {
    const { code, json } = run(deckWithBlockType([type]));
    expect(code).toBe(0);
    expect(json).toMatchObject({ entries: { content: 1, [entry]: 1 } });
  });

  it("reports constructor as an unknown block type", () => {
    const { code, err } = run(deckWithBlockType("constructor"));
    expect(code).toBe(1);
    expect(err).toBe(
      `slides-usage: ${join(dir, "0.json")} slide 1: ${blockFinding("block-constructor")}\n`,
    );
  });

  it("reports a missing image using the block expression in the diagnostic", () => {
    const { code, err } = run(deckWithBlockType("image-and-grid"));
    expect(code).toBe(1);
    expect(err).toBe(
      `slides-usage: ${join(dir, "0.json")} slide 1: ${malformedSlide("undefined is not an object (evaluating 'block.image.sketch')")}\n`,
    );
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
      { type: "grid", headline: "h", numberFrom: 3, cards: [{ title: "t", icon: undefined }] },
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
    [
      "a content slide whose content list is null",
      { type: "content", headline: "h", content: null },
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

  it("fails on an ignored field and accepts lang from a title slide", () => {
    const agenda = { type: "agenda", headline: "h", items: [] };
    const lanes = { type: "lanes", headline: "h", lanes: [], sectionTheme: "accent" };
    const dead = run({ lang: "en", slides: [agenda, lanes] });
    expect(dead.code).toBe(1);
    expect(dead.err).toMatch(/slide 2: draws nothing, sectionTheme/);
    expect(run({ slides: [{ type: "title", title: "t", lang: "de" }, agenda] }).code).toBe(0);
  });

  it("explains which lang values give the deck the right language", () => {
    const silent = run({
      name: "Untitled",
      slides: [{ type: "agenda", headline: "h", items: [] }],
    });
    expect(silent.code).toBe(1);
    expect(silent.err).toBe(
      `slides-usage: ${join(dir, "0.json")} names no supported lang on the deck or a title slide, so the deck defaults to English. Set the deck's lang to en or de.\n`,
    );
  });

  it.each([{ args: [] }, { args: ["--check", "-"] }, { args: ["-", "--out"] }])(
    "explains which arguments the check needs ($args)",
    ({ args }) => {
      const result = spawnSync("bun", [script, ...args], { encoding: "utf8" });
      expect(result.status).toBe(2);
      expect(result.stderr.split("\n")[0]).toBe(
        "slides-usage: The check needs deck JSON to count and --check needs a file to compare. Pass a deck JSON path or - for standard input, and supply a file path after --out when using --out or --check.",
      );
    },
  );

  describe("--out and --check", () => {
    const deck = join(dir, "check.json");
    const staleHint = (file: string) =>
      `slides-usage: ${file} is stale: run "slides-usage --out ${file} ${deck}" and commit it\n`;
    const usageOut = (file: string, ...args: string[]) =>
      spawnSync("bun", [script, "--out", file, ...args, deck], {
        encoding: "utf8",
        env: { ...process.env, npm_lifecycle_event: "", npm_lifecycle_script: "" },
      });

    beforeAll(() => {
      writeFileSync(deck, JSON.stringify(validDeck));
    });

    it("writes its counts to --out", () => {
      const file = join(dir, "usage.json");
      expect(usageOut(file).status).toBe(0);
      expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({ entries: { agenda: 1 } });
    });

    it.each([
      {
        label: "fails when the file is missing and names the re-run command",
        prepare: () => {},
        status: 1,
        stderr: staleHint,
      },
      {
        label: "passes when the file matches",
        prepare: (file: string) => usageOut(file),
        status: 0,
        stderr: () => "",
      },
      {
        label: "fails when the file differs and names the re-run command",
        prepare: (file: string) => writeFileSync(file, "{}"),
        status: 1,
        stderr: staleHint,
      },
    ])("with --check $label", ({ prepare, status, stderr }) => {
      const file = join(mkdtempSync(join(dir, "check-")), "usage.json");
      prepare(file);
      const result = usageOut(file, "--check");
      expect(result.status).toBe(status);
      expect(result.stderr).toBe(stderr(file));
    });
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
