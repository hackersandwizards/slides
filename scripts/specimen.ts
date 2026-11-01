// Writes the specimen page, specimen/index.html and specimen/build/slides.css: one slide per
// registered slide type, the first of its type in the specimen deck, then every specimen slide
// labelled "Block: …" or "Visual: …", one per content block and variant, rendered by the engine's
// own components in print mode, with slides.css compiled by Tailwind. `--check` fails when either
// committed file differs from a fresh build.
// Usage: bun scripts/specimen.ts [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import { cornerMark } from "../lib/logo";
import { pageLabel } from "../lib/slide-utils";
import { BrandStrip, HwWordmark, PageCounter } from "../components/slides/SlideContainer";
import { slideCatalogue } from "../specimen/slide-catalogue";

const root = join(import.meta.dirname, "..");
const out = join(root, "specimen", "index.html");
const brand = join(root, "node_modules", "@hackersandwizards", "brand");
// Paths the page links, relative to specimen/: the brand files stay in node_modules.
const brandHref = relative(join(root, "specimen"), brand).split(sep).join("/");

const deck = slideCatalogue.slides;
const picks = (Object.keys(slideComponents) as (keyof typeof slideComponents)[]).map((type) => {
  const index = deck.findIndex((s) => s.type === type);
  if (index < 0) throw new Error(`specimen deck has no slide of type ${type}`);
  return index;
});

const blockLabel = /^(Block|Visual): /;
// A code block's Shiki colours are inline hex, which the brand colour scan allows in
// styles/slides.css only, so the page leaves the slides that carry code to the types above.
const codeBlocks = new Set(["code", "code-and-text", "annotated-code"]);
const blockPicks = deck.flatMap((s, index) =>
  s.type === "content" &&
  s.sectionLabel &&
  blockLabel.test(s.sectionLabel) &&
  !s.content?.some((b) => codeBlocks.has(b.type))
    ? [index]
    : [],
);

// Each slide renders in its own 1920x1080 frame, as scripts/render-pdf.ts sets its viewport: a
// slide's lengths in `vh` (`.slide-content`, image heights) read the window that holds them.
const renderFrame = (index: number, name: string) => {
  const slide = deck[index];
  const Slide = slideComponents[slide.type];
  const page = pageLabel(deck, index);
  const markup = renderToStaticMarkup(
    h(
      PrintProvider,
      null,
      h(
        "div",
        { className: "print-slide" },
        h(Slide, { slide }),
        h(BrandStrip),
        h(
          "div",
          { className: "print-watermark flex items-center gap-2" },
          page && h("span", { className: "mr-3" }, h(PageCounter, { label: page })),
          h(HwWordmark, { mark: cornerMark(slideCatalogue, index) }),
        ),
      ),
    ),
  )
    .replace(
      /(src|href)="\/hw-(wordmark|lockup)(-night)?\.svg"/g,
      `$1="${brandHref}/logos/$2$3.svg"`,
    )
    .replace(/(src|href|poster)="\/slide-catalogue\//g, '$1="slide-catalogue/');
  return { name, markup };
};
const frames = picks.map((index) => renderFrame(index, deck[index].type));
const blockFrames = blockPicks.map((index) => {
  const slide = deck[index];
  return renderFrame(
    index,
    slide.type === "content" ? slide.sectionLabel!.replace(blockLabel, "") : "",
  );
});

const stylesheet = join(root, "styles", "slides.css");
const compiler = await compile(readFileSync(stylesheet, "utf8"), {
  base: dirname(stylesheet),
  from: stylesheet,
  onDependency: () => {},
});
const candidates = new Scanner({ sources: compiler.sources }).scan();
for (const { markup } of [...frames, ...blockFrames])
  candidates.push(...new Scanner({}).scanFiles([{ content: markup, extension: "html" }]));
const css = compiler
  .build(candidates)
  // Resolved through the package's exports: `fonts/*` maps to `tokens/fonts/*` on disk.
  .replace(
    /url\("(@hackersandwizards\/brand\/[^"]+)"\)/g,
    (_, id: string) =>
      `url("${relative(join(root, "specimen", "build"), fileURLToPath(import.meta.resolve(id)))
        .split(sep)
        .join("/")}")`,
  );

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
// A type's anchor is its name, as the brand kit links it; a block's is "block-" and its label,
// numbered where two slides share a label.
const ids = new Set<string>();
const anchor = (name: string, prefix = "") => {
  const base = prefix + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  ids.add(id);
  return id;
};
const tile = ({ name, markup }: { name: string; markup: string }, prefix = "") => {
  const id = anchor(name, prefix);
  return `<figure id="${id}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe title="${attr(name)}" srcdoc="${attr(frameDoc(markup))}"></iframe></div></figure>`;
};
const frameDoc = (markup: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="build/slides.css"><style>body{margin:0}</style></head><body>${markup}</body></html>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slide specimen, @hackersandwizards/slides</title>
<!-- Generated by scripts/specimen.ts from specimen/slide-catalogue.ts. Do not edit. -->
<link rel="icon" href="${brandHref}/logos/favicon.ico" sizes="32x32">
<link rel="icon" href="${brandHref}/logos/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${brandHref}/generated/tokens.root.css">
<link rel="stylesheet" href="${brandHref}/expert/header.css">
<link rel="stylesheet" href="build/slides.css">
<style>
body { margin: 0; background: var(--color-tint); color: var(--color-ink); font-family: var(--font-sans); }
.intro { margin: 1.5rem 0 2rem; max-width: 60rem; }
h1 { font: 700 1.5rem/1.25 var(--font-mono); letter-spacing: -0.01em; margin: 0 0 0.5rem; }
h2 { font: 700 1.125rem/1.3 var(--font-mono); margin: 0 0 1rem; }
.intro p { margin: 0 0 0.5rem; font-size: 1rem; }
.intro .setup { font-size: 0.875rem; color: var(--color-muted); }
main { display: grid; grid-template-columns: repeat(auto-fill, 480px); gap: 2rem 1.5rem; padding-bottom: 4rem; }
figure { margin: 0; scroll-margin-top: 5.5rem; }
figcaption { font: 600 0.875rem/1.4 var(--font-mono); margin-bottom: 0.5rem; }
figcaption a { color: inherit; }
.frame { width: 480px; height: 270px; overflow: hidden; outline: 1px solid var(--color-border); }
iframe { width: 1920px; height: 1080px; border: 0; transform: scale(0.25); transform-origin: 0 0; }
figure:target { grid-column: 1 / -1; }
figure:target .frame { width: 1440px; height: 810px; }
figure:target iframe { transform: scale(0.75); }
</style>
</head>
<body>
<header class="hw-header">
<div class="hw-header-strip"></div>
<div class="hw-header-row hw-container">
<a class="hw-header-brand" href="#" aria-label="hackers&amp;wizards Slides"><img class="hw-header-logo" src="${brandHref}/logos/lockup-screen.svg" alt="" width="8042" height="1489"><img class="hw-header-logo-night" src="${brandHref}/logos/lockup-screen-night.svg" alt="" width="8196" height="1641"><span class="hw-header-product">Slides</span></a>
</div>
</header>
<div class="hw-container">
<div class="intro">
<h1>Slide specimen</h1>
<p>Every slide type of the h&amp;w slide engine, one example each, then the content blocks a content slide is built from, as they look in a printed deck. All content is made up. Click a name to see its slide at 1440 px.</p>
<p class="setup">Opens from a checkout of the <code>slides</code> repository after <code>bun install</code>: fonts and logos load from <code>node_modules/@hackersandwizards/brand</code>. Built by <code>bun run specimen</code> from <code>specimen/slide-catalogue.ts</code>.</p>
</div>
<h2>Slide types</h2>
<main>
${frames.map((f) => tile(f)).join("\n")}
</main>
<h2>Content blocks</h2>
<main>
${blockFrames.map((f) => tile(f, "block-")).join("\n")}
</main>
</div>
</body>
</html>
`;

const outputs: [string, string][] = [
  [out, html],
  [join(root, "specimen", "build", "slides.css"), css],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([path, text]) => {
    try {
      return readFileSync(path, "utf8") !== text;
    } catch {
      return true;
    }
  });
  for (const [path] of stale)
    console.error(`${relative(root, path)} is stale: run bun run specimen`);
  if (stale.length) process.exit(1);
} else {
  for (const [path, text] of outputs) writeFileSync(path, text);
}
