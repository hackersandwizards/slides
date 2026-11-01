// Writes the specimen page, specimen/index.html and specimen/build/slides.css: the three layers
// (tokens, parts, types) with every part its variants and the slide types that compose it, then one
// slide per registered slide type, the first of its type in the specimen deck, then every specimen
// slide labelled "Block: …" or "Visual: …", one per content block and variant, rendered by the
// engine's own components in print mode, with slides.css compiled by Tailwind. `--check` fails when
// either committed file differs from a fresh build, and on a part with no entry below.
// Usage: bun scripts/specimen.ts [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { aliasTypes, slideComponents } from "../lib/slide-components";
import { PrintProvider } from "../lib/print-context";
import { PrintSlide } from "../components/slides/PrintSlide";
import { slideCatalogue } from "../specimen/slide-catalogue";
import * as primitives from "../components/slides/primitives";
import * as chrome from "../components/slides/SlideChrome";

const root = join(import.meta.dirname, "..");
const out = join(root, "specimen", "index.html");
const brand = join(root, "node_modules", "@hackersandwizards", "brand");
// Paths the page links, relative to specimen/: the brand files stay in node_modules.
const brandHref = relative(join(root, "specimen"), brand).split(sep).join("/");

const deck = slideCatalogue.slides;
// A type another one replaced (`aliasTypes`) still renders, but the page shows only its successor.
const picks = (Object.keys(slideComponents) as (keyof typeof slideComponents)[])
  .filter((type) => !aliasTypes[type])
  .map((type) => {
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
  const markup = renderToStaticMarkup(
    h(PrintProvider, null, h(PrintSlide, { presentation: slideCatalogue, index })),
  )
    .replace(
      /(src|href)="\/hw-(wordmark|lockup)(-night)?\.svg"/g,
      `$1="${brandHref}/logos/$2$3.svg"`,
    )
    .replace(/(src|href|poster)="\/slide-catalogue\//g, '$1="slide-catalogue/');
  return { name, markup };
};
const frames = picks.map((index) => renderFrame(index, deck[index].type));
// A type whose first slide draws no list marker adds its first slide that does, since the marker
// check (test/marker-position.test.ts) measures only this page: comparison's split and activity's
// demo drew nothing for a release while it passed.
const marked = (index: number) => renderFrame(index, "").markup.includes("hw-marker");
const markerFrames = picks.flatMap((first) => {
  if (marked(first)) return [];
  const index = deck.findIndex((s, i) => s.type === deck[first].type && marked(i));
  return index < 0 ? [] : [renderFrame(index, deck[index].type)];
});
const blockFrames = blockPicks.map((index) => {
  const slide = deck[index];
  return renderFrame(
    index,
    slide.type === "content" ? slide.sectionLabel!.replace(blockLabel, "") : "",
  );
});

// ─── Parts: the components every slide type composes ─────────────────────────────────────────
const {
  CodePanel,
  DashedFrame,
  DisplayHeading,
  NumberTile,
  SlideCaption,
  SlideCard,
  SlideSubtitle,
  SlideTitle,
  VideoPlayer,
} = primitives;
const { GradientTitlePill, PulseDot } = chrome;
const label = (text: string) =>
  h("p", { className: "label-caps mb-3 text-xs text-text-muted" }, text);
const inRow = (...children: ReactNode[]) =>
  h("div", { className: "flex flex-wrap items-start gap-8" }, ...children);
const cell = (name: string, child: ReactNode) => h("div", null, label(name), child);
const tones = ["neutral", "primary", "secondary", "accent", "success", "error"] as const;
const looks = ["tint", "soft", "outline", "line"] as const;

/** Each part with a sheet of its variants; a part missing here fails the build. */
const PARTS: Record<string, () => ReactNode> = {
  DisplayHeading: () =>
    h(
      "div",
      { className: "space-y-10" },
      ...(["xl", "lg", "md", "sm"] as const).map((size) =>
        cell(`size ${size}`, h(DisplayHeading, { size, as: "div", children: "Ship the loop" })),
      ),
    ),
  SlideCard: () =>
    h(
      "div",
      { className: "grid grid-cols-4 gap-6" },
      h(SlideCard, { className: "px-6 py-4 text-lg" }, "neutral"),
      h(SlideCard, { tone: "quiet", className: "col-span-3 w-1/3 px-6 py-4 text-lg" }, "quiet"),
      ...tones
        .filter((tone) => tone !== "neutral")
        .flatMap((tone) =>
          looks.map((look) =>
            h(
              SlideCard,
              { tone, look, key: `${tone}-${look}`, className: "px-6 py-4 text-lg" },
              `${tone} · ${look}`,
            ),
          ),
        ),
    ),
  NumberTile: () =>
    h(
      "div",
      { className: "space-y-8" },
      ...(["solid", "soft", "badge", "ink"] as const).map((tone) =>
        cell(
          `tone ${tone}`,
          inRow(
            ...(["sm", "md", "lg", "xl"] as const).map((size) =>
              h(NumberTile, { size, tone, key: size, children: size === "xl" ? "10x" : "3" }),
            ),
          ),
        ),
      ),
    ),
  DashedFrame: () =>
    inRow(
      cell("neutral", h(DashedFrame, { className: "w-96 p-6 text-lg" }, "A group")),
      ...(["primary", "secondary"] as const).flatMap((tone) =>
        [false, true].map((active) =>
          cell(
            `${tone}${active ? ", active" : ""}`,
            h(
              DashedFrame,
              { tone, active, key: `${tone}${active}`, className: "w-96 p-6 text-lg" },
              "A group",
            ),
          ),
        ),
      ),
    ),
  VideoPlayer: () =>
    h(
      "div",
      { className: "w-1/2 pb-10" },
      h(VideoPlayer, {
        src: "/slide-catalogue/agent-session.mp4",
        poster: "/slide-catalogue/agent-session-poster.png",
        alt: "An agent session",
      }),
    ),
  SlideTitle: () => h(SlideTitle, null, "A slide's headline on one line"),
  SlideSubtitle: () => h(SlideSubtitle, null, "The line under a headline, in muted ink."),
  SlideCaption: () => h(SlideCaption, null, "The caption under a diagram, its last step."),
  CodePanel: () =>
    h(CodePanel, { as: "pre", className: "p-8 font-code text-xl text-white" }, "$ claude --print"),
  TitledContent: () =>
    label("The column of a titled slide: headline, then the body under the fit guard."),
  ChartFrame: () => label("A chart's plot area: a SlideCard of fixed height the chart fills."),
  GradientTitlePill: () => h(GradientTitlePill, null, "The Factory"),
  PulseDot: () =>
    h(
      "span",
      { className: "relative inline-block rounded-brand bg-primary/7 px-6 py-3 text-xl" },
      "New stage",
      h(PulseDot, { category: "primary" }),
    ),
};

const partSources: Record<string, string> = {
  primitives: readFileSync(join(root, "components", "slides", "primitives.tsx"), "utf8"),
  SlideChrome: readFileSync(join(root, "components", "slides", "SlideChrome.tsx"), "utf8"),
};
const partNames = Object.entries({ primitives, SlideChrome: chrome }).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([, v]) => typeof v === "function")
    .map(([name]) => ({ name, file })),
);
const unlisted = partNames.filter(({ name }) => !PARTS[name]).map(({ name }) => name);
if (unlisted.length) throw new Error(`parts without a catalogue entry: ${unlisted.join(", ")}`);

/** A part's purpose: the first sentence of the comment over its export. */
function purpose(name: string, file: string): string {
  const before = partSources[file].slice(0, partSources[file].indexOf(`export function ${name}(`));
  const end = before.lastIndexOf("*/");
  if (end < 0 || before.slice(end + 2).trim()) return "";
  const text = before
    .slice(before.lastIndexOf("/**", end) + 3, end)
    .replace(/^\s*\* ?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(/(?<=\.)\s/)[0] ?? "";
}

// The slide types that compose each part: a type's component and every local component it imports.
const registry = readFileSync(join(root, "lib", "slide-components.ts"), "utf8");
const typeFiles = [...registry.matchAll(/^\s*"?([\w-]+)"?: (\w+) as SlideComponent/gm)]
  .filter(([, type]) => !aliasTypes[type as keyof typeof aliasTypes])
  .map(([, type, component]) => ({ type, component }));
const sourceOf = (component: string) =>
  readFileSync(join(root, "components", "slides", `${component}.tsx`), "utf8");
const reach = (component: string, seen = new Set<string>()): string => {
  if (seen.has(component) || component === "primitives" || component === "SlideChrome") return "";
  seen.add(component);
  const source = sourceOf(component);
  return [source, ...[...source.matchAll(/from "\.\/(\w+)"/g)].map(([, c]) => reach(c, seen))].join(
    "\n",
  );
};
const typeSources = typeFiles.map(({ type, component }) => ({ type, source: reach(component) }));
const usedBy = (name: string) =>
  typeSources
    .filter(({ source }) => new RegExp(`<${name}[\\s/>]`).test(source))
    .map(({ type }) => type);

const partFrames = partNames.map(({ name, file }) => ({
  name,
  file,
  purpose: purpose(name, file),
  users: usedBy(name),
  markup: renderToStaticMarkup(
    h(
      PrintProvider,
      null,
      h(
        "div",
        { className: "print-slide bg-section-intro" },
        h("div", { className: "p-24" }, h(Fragment, null, PARTS[name]())),
      ),
    ),
  ).replace(/(src|href|poster)="\/slide-catalogue\//g, '$1="slide-catalogue/'),
}));

const stylesheet = join(root, "styles", "slides.css");
const compiler = await compile(readFileSync(stylesheet, "utf8"), {
  base: dirname(stylesheet),
  from: stylesheet,
  onDependency: () => {},
});
const candidates = new Scanner({ sources: compiler.sources }).scan();
for (const { markup } of [...frames, ...markerFrames, ...blockFrames, ...partFrames])
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
.layers { max-width: 60rem; font-size: 1rem; margin: 0 0 1rem; }
table.parts { border-collapse: collapse; margin: 0 0 2rem; max-width: 80rem; font-size: 0.875rem; }
table.parts th, table.parts td { text-align: left; vertical-align: top; padding: 0.375rem 1rem 0.375rem 0; border-bottom: 1px solid var(--color-border); }
</style>
</head>
<body>
<header class="hw-header">
<div class="hw-header-strip"></div>
<div class="hw-header-row hw-container">
<a class="hw-header-brand" href="#" aria-label="hackers&amp;wizards Slides"><img class="hw-header-logo" src="${brandHref}/logos/lockup-screen.svg" alt="" width="8042" height="1489"><img class="hw-header-logo-night" src="${brandHref}/logos/lockup-screen-night.svg" alt="" width="8196" height="1641"><span class="hw-header-product">Slides</span></a>
<nav class="hw-header-nav" aria-label="Catalogues">
<a class="hw-header-link" href="http://brand.localhost/">Brand</a>
<a class="hw-header-link" href="#" aria-current="page">Slides</a>
<a class="hw-header-link" href="http://documents.localhost/">Dokumente</a>
</nav>
</div>
</header>
<div class="hw-container">
<div class="intro">
<h1>Slide specimen</h1>
<p>Every slide type of the h&amp;w slide engine, one example each, then the content blocks a content slide is built from, as they look in a printed deck. All content is made up. Click a name to see its slide at 1440 px.</p>
<p class="setup">Opens from a checkout of the <code>slides</code> repository after <code>bun install</code>, or at <code>http://slides.localhost</code> with <code>bun run dev</code>: fonts and logos load from <code>node_modules/@hackersandwizards/brand</code>. Built by <code>bun run specimen</code> from <code>specimen/slide-catalogue.ts</code>.</p>
</div>
<h2 id="parts">Parts</h2>
<p class="layers">Three layers, as in the document engine. <strong>Tokens</strong>: <code>styles/tokens.css</code> names every value a slide draws (colour, type step, tracking, leading, measure, rule) from <code>@hackersandwizards/brand</code>; <code>test/tokens.test.ts</code> fails on a raw length or colour anywhere else. <strong>Parts</strong> below are built from tokens only, each with its variants. <strong>Slide types</strong> compose parts; a difference between two types is a part's variant.</p>
<table class="parts"><thead><tr><th>Part</th><th>What it is</th><th>Used by</th></tr></thead><tbody>
${partFrames.map((p) => `<tr><td><a href="#part-${p.name.toLowerCase()}"><code>${p.name}</code></a></td><td>${attr(p.purpose)}</td><td>${p.users.map((t) => `<a href="#${t}">${t}</a>`).join(", ") || "&ndash;"}</td></tr>`).join("\n")}
</tbody></table>
<main>
${partFrames.map((p) => tile(p, "part-")).join("\n")}
</main>
<h2>Slide types</h2>
<main>
${[...frames, ...markerFrames].map((f) => tile(f)).join("\n")}
</main>
<h2>Content blocks</h2>
<main>
${blockFrames.map((f) => tile(f, "block-")).join("\n")}
</main>
</div>
<script>
// On GitHub Pages, links to the other two catalogues leave their local addresses for their public pages.
if (location.hostname.endsWith(".github.io")) for (const a of document.querySelectorAll("a[href]")) { const name = a.hostname.slice(0, -".localhost".length); if (a.hostname.endsWith(".localhost") && ["brand", "slides", "documents"].includes(name)) a.href = "https://hackersandwizards.github.io/" + name + a.pathname + a.hash; }
</script>
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
