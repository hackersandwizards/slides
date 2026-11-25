import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Presentation } from "../types/slide";
import { rendered, specimen } from "./fixtures/rendered-deck";

let dir: string;
let zip: JSZip;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "slides-pptx-"));
  ({ zip } = await specimen());
}, 60_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("slides-pptx as a command", () => {
  const script = join(import.meta.dirname, "../scripts/render-pptx.ts");

  const deck = JSON.stringify({
    name: "T",
    slides: [{ type: "content", headline: "H", content: [{ type: "image", src: "/missing.png" }] }],
  });

  const run = (...flags: string[]) =>
    spawnSync("bun", [script, "-", join(dir, "cli.pptx"), "--assets", dir, ...flags], {
      encoding: "utf8",
      input: deck,
    });

  it("writes the file and reports a warning, and exits 1 on one under --strict", () => {
    const loose = run();
    expect(loose.status).toBe(0);
    expect(loose.stderr).toContain("warning: image /missing.png");
    expect(run("--strict").status).toBe(1);
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

  it("embeds the brand faces only under --embed-fonts: regular and bold as EOT parts PowerPoint lists", async () => {
    expect(Object.keys(zip.files).some((f) => f.startsWith("ppt/fonts/"))).toBe(false);
    expect(await zip.file("ppt/presentation.xml")!.async("string")).not.toContain("embeddedFont");
    const text = JSON.stringify({
      name: "T",
      slides: [{ type: "statement", lines: ["Größe → `code`"] }],
    });
    const out = join(dir, "fonts.pptx");
    const res = spawnSync("bun", [script, "-", out, "--embed-fonts"], {
      encoding: "utf8",
      input: text,
    });
    expect(res.status).toBe(0);
    const z = await JSZip.loadAsync(readFileSync(out));
    const pres = await z.file("ppt/presentation.xml")!.async("string");
    const list = /<p:notesSz[^>]*\/><p:embeddedFontLst>(.*?)<\/p:embeddedFontLst>/.exec(pres)?.[1];
    expect(list).toBeDefined();
    expect([...pres.matchAll(/ saveSubsetFonts=/g)]).toHaveLength(1);
    expect(await z.file("[Content_Types].xml")!.async("string")).toContain(
      '<Default Extension="fntdata" ContentType="application/x-fontdata"/>',
    );
    const rels = await z.file("ppt/_rels/presentation.xml.rels")!.async("string");
    const families: string[] = [];
    for (const [, face, slots] of list!.matchAll(
      /<p:font typeface="([^"]+)"[^>]*\/>(.*?)<\/p:embeddedFont>/g,
    )) {
      for (const [, slot, id] of slots.matchAll(/<p:(regular|bold) r:id="(\w+)"\/>/g)) {
        const target = new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`).exec(rels)![1];
        const eot = Buffer.from(await z.file(`ppt/${target}`)!.async("uint8array"));
        expect(eot.readUInt32LE(0)).toBe(eot.length);
        expect(eot.readUInt32LE(8)).toBe(0x00020001);
        expect(eot.readUInt16LE(34)).toBe(0x504c);
        expect(eot.readUInt32LE(28)).toBe(slot === "bold" ? 700 : 400);
        const size = eot.readUInt16LE(82);
        expect(Buffer.from(eot.subarray(84, 84 + size)).toString("utf16le")).toBe(face);
        families.push(`${face} ${slot}`);
      }
    }
    expect(families).toEqual([
      "Inter regular",
      "Inter bold",
      "JetBrains Mono regular",
      "JetBrains Mono bold",
    ]);
  }, 60_000);
});
