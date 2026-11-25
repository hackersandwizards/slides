import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import type { Presentation } from "../types/slide";
import { rendered } from "./fixtures/rendered-deck";

let dir: string;

beforeAll(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "slides-pptx-")));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("slides-pptx as a command", () => {
  const script = join(import.meta.dirname, "../scripts/render-pptx.ts");

  const deck = JSON.stringify({
    name: "T",
    lang: "en",
    slides: [{ type: "content", headline: "H", content: [{ type: "image", src: "/missing.png" }] }],
  });

  const run = (...flags: string[]) =>
    spawnSync("bun", [script, "-", join(dir, "cli.pptx"), "--assets", dir, ...flags], {
      encoding: "utf8",
      input: deck,
    });

  it("exits 1 on a warning under --strict", () => {
    expect(run("--strict").status).toBe(1);
  });

  const readyDeck = JSON.stringify({
    name: "Ready",
    lang: "en",
    slides: [{ type: "statement", lines: ["Ready"] }],
  });
  const usage =
    "Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]";
  const invalidDeck = "is not a presentation: it needs a name and a slides array.";

  beforeAll(() => {
    writeFileSync(join(dir, "missing-name.json"), JSON.stringify({ slides: [] }));
    writeFileSync(join(dir, "invalid-slides.json"), JSON.stringify({ name: "Ready", slides: {} }));
  });

  it.each([
    {
      label: "no arguments",
      args: [],
      input: "",
      output: "no-input.pptx",
      expected: { status: 1, stdout: "", stderr: usage, written: false },
    },
    {
      label: "one argument",
      args: ["-"],
      input: readyDeck,
      output: "no-output.pptx",
      expected: { status: 1, stdout: "", stderr: usage, written: false },
    },
    {
      label: "an output suffix other than .pptx",
      args: ["-", "invalid-output.zip"],
      input: readyDeck,
      output: "invalid-output.zip",
      expected: { status: 1, stdout: "", stderr: usage, written: false },
    },
    {
      label: "a JSON file without a name",
      args: ["missing-name.json", "from-unnamed.pptx"],
      input: "",
      output: "from-unnamed.pptx",
      expected: {
        status: 1,
        stdout: "",
        stderr: `missing-name.json ${invalidDeck}`,
        written: false,
      },
    },
    {
      label: "a JSON file without a slides array",
      args: ["invalid-slides.json", "from-invalid-slides.pptx"],
      input: "",
      output: "from-invalid-slides.pptx",
      expected: {
        status: 1,
        stdout: "",
        stderr: `invalid-slides.json ${invalidDeck}`,
        written: false,
      },
    },
    {
      label: "a deck on standard input",
      args: ["-", "from-stdin.pptx"],
      input: readyDeck,
      output: "from-stdin.pptx",
      expected: { status: 0, stdout: "Wrote from-stdin.pptx: 1 slides", stderr: "", written: true },
    },
    {
      label: "a missing image without --strict",
      args: ["-", "with-warning.pptx", "--assets", "."],
      input: deck,
      output: "with-warning.pptx",
      expected: {
        status: 0,
        stdout: "Wrote with-warning.pptx: 1 slides",
        stderr: "warning: image /missing.png: not found under <assets>",
        written: true,
      },
    },
  ])("reports the result for $label", ({ args, input, output, expected }) => {
    const result = spawnSync("bun", [script, ...args], { cwd: dir, encoding: "utf8", input });
    expect({
      status: result.status,
      stdout: result.stdout.trimEnd(),
      stderr: result.stderr.replaceAll(dir, "<assets>").split("\n")[0],
      written: existsSync(join(dir, output)),
    }).toEqual(expected);
  });

  // A mistyped flag ran the export loose and exited 0 in a gate that asked for --strict.
  it("refuses an argument it does not know, and --assets without a directory", () => {
    expect(run("--stric").status).toBe(1);
    expect(
      spawnSync("bun", [script, "-", join(dir, "cli.pptx"), "--assets"], { input: deck }).status,
    ).toBe(1);
  });

  it("warns once about a missing picture on a slide it measures before drawing", async () => {
    const closing = {
      name: "T",
      slides: [
        {
          type: "closing",
          line1: "Thanks",
          partners: [{ company: "P", src: "/missing.png", width: 2, height: 1 }],
        },
      ],
    } as unknown as Presentation;
    const { warnings } = await rendered(closing, dir);
    expect(warnings.filter((w) => w.includes("/missing.png"))).toHaveLength(1);
  });

  describe("--embed-fonts", () => {
    const text = JSON.stringify({
      name: "T",
      slides: [{ type: "statement", lines: ["Größe → `code`"] }],
    });
    let status: number | null;
    let zip: JSZip;
    let presentation: string;
    let relationships: string;
    let styles: string[];
    let relationshipIds: Map<string, string>;

    beforeAll(async () => {
      const out = join(dir, "fonts.pptx");
      ({ status } = spawnSync("bun", [script, "-", out, "--embed-fonts"], {
        encoding: "utf8",
        input: text,
      }));
      zip = await JSZip.loadAsync(readFileSync(out));
      const pres = await zip.file("ppt/presentation.xml")?.async("string");
      const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
      assert(pres && rels, "Missing presentation or its relationships");
      presentation = pres;
      relationships = rels;
      const list = /<p:embeddedFontLst>(.*?)<\/p:embeddedFontLst>/.exec(presentation)?.[1] ?? "";
      const slots = Array.from(
        list.matchAll(/<p:font typeface="([^"]+)"[^>]*\/>(.*?)<\/p:embeddedFont>/g),
      ).flatMap(([, family, styles]) =>
        Array.from(styles.matchAll(/<p:(regular|bold) r:id="(\w+)"\/>/g), ([, slot, id]) => ({
          style: `${family} ${slot}`,
          id,
        })),
      );
      styles = slots.map(({ style }) => style);
      relationshipIds = new Map(slots.map(({ style, id }) => [style, id]));
    }, 60_000);

    it("writes the deck and exits successfully with --embed-fonts", () => {
      expect(status).toEqual(0);
    });

    it("writes no font parts or font list without --embed-fonts", async () => {
      const out = join(dir, "without-fonts.pptx");
      spawnSync("bun", [script, "-", out], { encoding: "utf8", input: text });
      const plain = await JSZip.loadAsync(readFileSync(out));
      const xml = await plain.file("ppt/presentation.xml")?.async("string");
      expect({
        parts: Object.keys(plain.files).filter((name) => name.startsWith("ppt/fonts/")),
        fontList: xml?.includes("embeddedFont"),
      }).toEqual({ parts: [], fontList: false });
    });

    it("declares the font part content type", async () => {
      expect(await zip.file("[Content_Types].xml")?.async("string")).toContain(
        '<Default Extension="fntdata" ContentType="application/x-fontdata"/>',
      );
    });

    it("lists both faces and styles after notes size and declares subsetting once", () => {
      expect({
        afterNotes: /<p:notesSz[^>]*\/><p:embeddedFontLst>/.test(presentation),
        subsetDeclarations: [...presentation.matchAll(/ saveSubsetFonts=/g)].length,
        styles,
      }).toEqual({
        afterNotes: true,
        subsetDeclarations: 1,
        styles: ["Inter regular", "Inter bold", "JetBrains Mono regular", "JetBrains Mono bold"],
      });
    });

    it.each([
      { family: "Inter", slot: "regular", weight: 400 },
      { family: "Inter", slot: "bold", weight: 700 },
      { family: "JetBrains Mono", slot: "regular", weight: 400 },
      { family: "JetBrains Mono", slot: "bold", weight: 700 },
    ])("links $family $slot to its EOT part", async ({ family, slot, weight }) => {
      const id = relationshipIds.get(`${family} ${slot}`);
      assert(id, `No font slot for ${family} ${slot}`);
      const relationship = new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`).exec(relationships);
      assert(relationship, `No relationship target for ${id}`);
      const [, target] = relationship;
      const file = zip.file(`ppt/${target}`);
      assert(file, `Missing font part ${target}`);
      const eot = Buffer.from(await file.async("uint8array"));
      const size = eot.readUInt16LE(82);
      expect({
        length: eot.readUInt32LE(0),
        version: eot.readUInt32LE(8),
        magic: eot.readUInt16LE(34),
        weight: eot.readUInt32LE(28),
        family: eot.subarray(84, 84 + size).toString("utf16le"),
      }).toEqual({ length: eot.length, version: 0x00020001, magic: 0x504c, weight, family });
    });
  });
});
