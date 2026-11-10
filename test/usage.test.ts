import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GUIDANCE } from "../catalog/guidance";
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
  return { code: out.status, err: out.stderr, json: out.stdout && JSON.parse(out.stdout) };
};

describe("slides-usage", () => {
  it("finds a catalogue entry for every slide of the specimen deck", () => {
    expect(slideCatalog.slides.filter((s) => !entriesOf(s).length)).toEqual([]);
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
    expect(json).toMatchObject({ decks: 2, slides: 2, entries: { agenda: 2 } });
    expect(json.unused).toContain("wheel");
    expect(json.unused).not.toContain("agenda");
    expect(json.unused.filter((id: string) => /-\d+$/.test(id))).toEqual([]);
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

  it("names a broken deck in an array by its slug, else its name, with its place", () => {
    const deck = { lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] };
    const broken = { lang: "en", slides: [{ type: "nope" }] };
    const named = [{ ...broken, slug: "kickoff" }, { ...broken, slug: "", name: "Retro" }, broken];
    const { code, err } = run([deck, ...named]);
    expect(code).toBe(1);
    expect(err).toMatch(/kickoff \(\S+\[1\]\) slide 1: type nope/);
    expect(err).toMatch(/Retro \(\S+\[2\]\) slide 1: type nope/);
    expect(err).toMatch(/\.json\[3\] slide 1: type nope/);
    const noDeck = run([deck, { name: "Draft" }]);
    expect(noDeck.code).toBe(1);
    expect(noDeck.err).toMatch(/Draft \(\S+\[1\]\) is no deck/);
  });

  // A deck-data lint for what the type checker cannot see: each rule hit by a planted field, and
  // its control, the same slide where the field draws, passing.
  it("names a field that changes nothing the slide draws", () => {
    const ignored = (slide: object) => ignoredFields(slide as Slide);
    const card = (icon?: string) => ({ title: "t", icon });
    expect(ignored({ type: "grid", headline: "h", numberFrom: 3, cards: [card("x")] })).toEqual([
      expect.stringContaining("numberFrom"),
    ]);
    expect(ignored({ type: "grid", headline: "h", numberFrom: 3, cards: [card()] })).toEqual([]);
    const cards = (numbered: boolean) => ({
      type: "content",
      headline: "h",
      content: [{ type: "cards", items: [], numberFrom: 4, numbered }],
    });
    expect(ignored(cards(false))).toHaveLength(1);
    expect(ignored(cards(true))).toEqual([]);
    const content = (extra: object) => ({
      type: "content",
      headline: "h",
      sectionTheme: "accent",
      content: [{ type: "bullets", items: ["a", "b", "c"] }],
      ...extra,
    });
    expect(ignored(content({}))).toEqual([expect.stringContaining("sectionTheme")]);
    expect(ignored(content({ footer: "f" }))).toEqual([]);
    // A footer's rule takes the section's colour; the default section's colour is no change.
    expect(ignored(content({ footer: "f", sectionTheme: "secondary" }))).toHaveLength(1);
    // A principle's pill takes only the success colour.
    expect(ignored(content({ principle: "p" }))).toHaveLength(1);
    expect(ignored(content({ principle: "p", sectionTheme: "success" }))).toEqual([]);
    expect(ignored(content({ sectionTheme: "deepdive" }))).toEqual([]);
    expect(
      ignored({ type: "lanes", headline: "h", lanes: [], sectionTheme: "accent" }),
    ).toHaveLength(1);
    // A centred slide draws neither its footer's rule nor a principle in the section's colour.
    expect(ignored(content({ layout: "centered", footer: "f" }))).toHaveLength(1);
    // The section keeps a lone neutral two-column block a content slide, so it changes the drawing.
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
    expect(ignored(split)).toEqual([]);
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

  it("writes its counts to a file and with --check fails where the file differs", () => {
    const deck = join(dir, "check.json");
    writeFileSync(
      deck,
      JSON.stringify({ lang: "en", slides: [{ type: "agenda", headline: "h", items: [] }] }),
    );
    const file = join(dir, "usage.json");
    const usage = (...args: string[]) =>
      spawnSync("bun", [script, ...args, deck], {
        encoding: "utf8",
        env: { ...process.env, npm_lifecycle_event: "", npm_lifecycle_script: "" },
      });
    expect(usage("--out", file, "--check").status).toBe(1);
    expect(usage("--out", file).status).toBe(0);
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({ entries: { agenda: 1 } });
    expect(usage("--out", file, "--check").status).toBe(0);
    writeFileSync(file, "{}");
    const stale = usage("--out", file, "--check");
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
