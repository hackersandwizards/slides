#!/usr/bin/env bun
// slides-pptx: every text is a text box, a table a PowerPoint table, a trend or bar chart a
// PowerPoint chart, a diagram drawn shapes; only a deck's own images and the h&w logos are pictures.
// A deck on a client's template is that consumer's own exporter.
// Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Presentation } from "../types/slide";
import { renderPptx } from "./pptx/deck";

if (import.meta.main) {
  const args = process.argv.slice(2);
  const usage = [
    "Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]",
    "The deck is a Presentation as JSON; --assets is the directory a slide's /image path resolves in, ./public by default; a path to an existing file is read as it stands. --strict exits 1 on any warning, text past its box included, for a gate; --embed-fonts puts the brand faces into the file, for PowerPoint on a machine without them (needs fonteditor-core).",
  ].join("\n");
  if (args.includes("--help")) {
    console.log(usage);
    process.exit(0);
  }
  const strict = args.includes("--strict");
  if (strict) args.splice(args.indexOf("--strict"), 1);
  const embed = args.includes("--embed-fonts");
  if (embed) args.splice(args.indexOf("--embed-fonts"), 1);
  const at = args.indexOf("--assets");
  const dir = at >= 0 ? args.splice(at, 2)[1] : "public";
  const assets = resolve(dir ?? "");
  const [input, out, ...rest] = args;
  if (!input || !out || !out.endsWith(".pptx") || !dir || rest.length) {
    console.error(usage);
    process.exit(1);
  }
  const deck = JSON.parse(readFileSync(input === "-" ? 0 : input, "utf8")) as Presentation;
  if (typeof deck?.name !== "string" || !Array.isArray(deck.slides)) {
    console.error(`${input} is not a presentation: it needs a name and a slides array.`);
    process.exit(1);
  }
  const { zip, warnings } = await renderPptx(deck, assets);
  if (embed) await (await import("./pptx-fonts")).embedFonts(zip);
  writeFileSync(
    resolve(out),
    await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  );
  for (const w of warnings) console.error(`warning: ${w}`);
  console.log(`Wrote ${out}: ${deck.slides.length} slides`);
  if (strict && warnings.length) process.exit(1);
}
