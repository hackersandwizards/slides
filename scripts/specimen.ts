// Writes the specimen page, specimen/index.html and specimen/build/slides.css: the three layers
// (tokens, parts, types) with every part its variants and the slide types that compose it, then the
// catalogue: per registered slide type its first slide in the specimen deck and the first of each
// further variant, then every specimen slide labelled "Block: …" or "Visual: …", one per content
// block and variant, each under its communication jobs, with a search over all, rendered by the
// engine's own components in print mode, with slides.css compiled by Tailwind, plus frames.html. It
// fails on a part with no entry below. None of the three is committed: `bun run check`, `bun run dev`
// and the Pages workflow each write them afresh.
// Usage: bun scripts/specimen.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import type { Slide } from "../types/slide";
import * as primitives from "../components/slides/primitives";
import { highlightLines } from "../lib/code-highlight";
import * as chrome from "../components/slides/SlideChrome";
import { PARTS, inRow } from "../design-system/parts";

const root = join(import.meta.dirname, "..");
const out = join(root, "specimen", "index.html");
const brand = join(root, "node_modules", "@hackersandwizards", "brand");
// Paths the page links, relative to specimen/: the brand files stay in node_modules.
const brandHref = relative(join(root, "specimen"), brand).split(sep).join("/");

const deck = slideCatalogue.slides;
const blockLabel = /^(Block|Visual): /;
const isBlockSlide = (s: Slide) =>
  s.type === "content" && !!s.sectionLabel && blockLabel.test(s.sectionLabel);
// A code block's Shiki colours are inline hex, which the brand colour scan allows in
// styles/slides.css only, so the page leaves the slides that carry code to the types above.
const codeBlocks = new Set(["code", "code-and-text", "annotated-code"]);
const hasCode = (s: Slide) =>
  (s.type === "content" && !!s.content?.some((b) => codeBlocks.has(b.type))) ||
  (s.type === "lanes" && !!s.codeSnippet);
// A slide's variant: its `variant`, `layout` or `kind`, or a before-after drawn without strike.
const variantOf = (s: Slide) =>
  ("variant" in s && s.variant) ||
  ("layout" in s && s.layout) ||
  ("kind" in s && s.kind) ||
  ("strike" in s && s.strike === false ? "without strike" : "");

// A type another one replaced (`aliasTypes`) still renders, but the page shows only its successor.
// Each type shows its first slide, then the first slide of each further variant.
const picks = (Object.keys(slideComponents) as (keyof typeof slideComponents)[])
  .filter((type) => !aliasTypes[type])
  .flatMap((type) => {
    const first = deck.findIndex((s) => s.type === type);
    if (first < 0) throw new Error(`specimen deck has no slide of type ${type}`);
    const seen = new Set([variantOf(deck[first])]);
    return [
      first,
      ...deck.flatMap((s, index) => {
        if (s.type !== type || isBlockSlide(s) || hasCode(s) || seen.has(variantOf(s))) return [];
        seen.add(variantOf(s));
        return [index];
      }),
    ];
  });
const blocksOf = (s: Slide) => (s.type === "content" ? s.content.map((b) => b.type) : []);
const labelled = deck.flatMap((s, index) => (isBlockSlide(s) && !hasCode(s) ? [index] : []));
// A block no shown slide carries (a callout sits on the theme slides only) adds its first slide.
const carried = new Set([...picks, ...labelled].flatMap((i) => blocksOf(deck[i])));
const blockPicks = [
  ...labelled,
  ...[...new Set(deck.flatMap(blocksOf))]
    .filter((b) => !carried.has(b) && !codeBlocks.has(b))
    .map((b) => deck.findIndex((s) => blocksOf(s).includes(b))),
];

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
  return { name, markup, index };
};
// A type's first slide is named by its type alone, the anchor the brand kit links; a further
// variant adds its variant.
const frames = picks.map((index) => {
  const { type } = deck[index];
  const first = deck.findIndex((s) => s.type === type) === index;
  return renderFrame(index, first ? type : `${type} · ${variantOf(deck[index])}`);
});
// A type whose first slide draws no list marker adds its first slide that does, since the marker
// check (test/marker-position.test.ts) measures only this page: comparison's split and activity's
// demo drew nothing for a release while it passed.
const marked = (index: number) => renderFrame(index, "").markup.includes("hw-marker");
const markerFrames = [...new Set(picks.map((i) => deck[i].type))].flatMap((type) => {
  if (picks.some((i) => deck[i].type === type && marked(i))) return [];
  const index = deck.findIndex((s, i) => s.type === type && marked(i));
  return index < 0 ? [] : [renderFrame(index, deck[index].type)];
});
const blockFrames = blockPicks.map((index) => {
  const slide = deck[index];
  return renderFrame(
    index,
    slide.type === "content" && isBlockSlide(slide)
      ? slide.sectionLabel!.replace(blockLabel, "")
      : blocksOf(slide).join(", "),
  );
});

// ─── Parts: the components every slide type composes (design-system/parts.ts) ───────────────
const { CodePanel, DashedFrame, NumberTile, SlideCard } = primitives;
const { GradientTitlePill } = chrome;

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
        {
          className: "print-slide bg-section-intro",
          "data-hw-scale": "stage",
          "data-theme": "light",
        },
        h("div", { className: "p-24" }, h(Fragment, null, PARTS[name]())),
      ),
    ),
  ).replace(/(src|href|poster)="\/slide-catalogue\//g, '$1="slide-catalogue/'),
}));

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

// ─── Shared elements: what the slides take from brand, and what stays their own ───────────────
// Rendered on the page itself (not in a frame), so brand-elements measures each tile against the
// brand rule. The page's 16px rem is the stage's at 1440, the size a slide is designed at.
const brandVersion = (
  JSON.parse(readFileSync(join(brand, "package.json"), "utf8")) as { version: string }
).version;
const onNight = (child: ReactNode) =>
  h(
    "div",
    {
      className: "slide-night bg-background p-6 text-text",
      "data-theme": "dark",
      "data-hw-night": "",
    },
    child,
  );
const onDay = (child: ReactNode) => h("div", { className: "bg-background p-6 text-text" }, child);
const USES: Record<string, () => ReactNode> = {
  card: () =>
    inRow(
      h(SlideCard, { className: "card-pad-4/6 text-lg" }, "neutral"),
      h(SlideCard, { tone: "primary", className: "card-pad-4/6 text-lg" }, "primary · tint"),
    ),
  label: () =>
    inRow(
      h("span", { className: "hw-label [--hw-label-size:var(--text-xl)]" }, "Kicker"),
      h("span", { className: "hw-label", "data-tone": "muted" }, "Muted label"),
    ),
  pill: () =>
    inRow(
      h("span", { className: "hw-pill" }, "One loop per team"),
      h(
        "span",
        {
          className:
            "hw-pill [--hw-pill-hue:var(--color-green-dark)] [--hw-pill-hue-night:var(--color-green-dark)]",
        },
        "Success section",
      ),
    ),
  callout: () =>
    h(
      "div",
      { className: "hw-callout w-fit text-text", "data-hue": "purple" },
      h("p", { className: "text-xl leading-snug font-medium" }, "An info callout flags one thing."),
    ),
  link: () =>
    h(
      "p",
      { className: "text-xl text-text" },
      "A paragraph with ",
      h("a", { className: "hw-link", href: "#elements" }, "a link"),
      ".",
    ),
  strip: () => h("div", { className: "hw-strip w-96" }),
  status: () =>
    inRow(
      h(SlideCard, { tone: "accent", look: "soft", className: "card-pad-4/6 text-lg" }, "warning"),
      h(SlideCard, { tone: "success", look: "soft", className: "card-pad-4/6 text-lg" }, "success"),
    ),
  frame: () => h("div", { className: "hw-frame w-96 p-6 text-lg" }, "A group"),
  "icon-button": () =>
    h(
      "button",
      { type: "button", className: "hw-icon-button", "data-on": "picture", "aria-label": "Play" },
      h("svg", { viewBox: "0 0 24 24", fill: "currentColor" }, h("path", { d: "M6 4l14 8-14 8z" })),
    ),
  "focus-ring": () =>
    h(
      "button",
      {
        type: "button",
        className: "hw-focus-ring rounded-brand border border-border bg-white px-6 py-5 text-lg",
      },
      "A vote option",
    ),
};
const usesTiles = Object.entries(USES)
  .map(
    ([name, render]) =>
      `<figure class="element"><figcaption><strong>${name}</strong> <span class="from">aus brand v${brandVersion}</span> <code>hw-${name}</code> <a href="http://brand.localhost/catalogue.html#hw-${name}">catalogue</a></figcaption><div data-hw-tile="${name}" data-hw-version="${brandVersion}" data-hw-scale="stage">${renderToStaticMarkup(h(Fragment, null, onDay(render()), onNight(render())))}</div></figure>`,
  )
  .join("\n");
const exceptions = JSON.parse(readFileSync(join(root, "brand-elements.json"), "utf8")) as {
  exceptions: Record<string, string | { reason: string }>;
};
// Where each exception shows: a part rendered here, or the specimen slides that carry it.
const EXCEPTION_SHOWN: Record<string, () => ReactNode> = {
  "card-tone": () =>
    inRow(
      h(SlideCard, { tone: "secondary", className: "card-pad-4/6 text-lg" }, "secondary"),
      h(SlideCard, { tone: "accent", className: "card-pad-4/6 text-lg" }, "tint"),
      ...(["outline", "line"] as const).map((look) =>
        h(SlideCard, { tone: "accent", look, key: look, className: "card-pad-4/6 text-lg" }, look),
      ),
      h(SlideCard, { tone: "quiet", className: "card-pad-4/6 text-lg" }, "quiet"),
    ),
  "number-tile": () =>
    inRow(h(NumberTile, { children: "3" }), h(NumberTile, { tone: "soft", children: "3" })),
  "code-panel": () =>
    h(
      CodePanel,
      { as: "pre", className: "p-8 font-code text-xl" },
      highlightLines('claude --print "fix the failing test" # one run', "bash"),
    ),
  "header-bars": () => h(GradientTitlePill, null, "The Factory"),
  "frame-tone": () =>
    inRow(
      h(DashedFrame, { className: "w-64 p-6 text-lg" }, "neutral"),
      h(DashedFrame, { tone: "primary", className: "w-64 p-6 text-lg" }, "primary"),
      h(DashedFrame, { tone: "secondary", active: true, className: "w-64 p-6 text-lg" }, "active"),
    ),
};
const exceptionLinks: Record<string, string[]> = {
  "label-caps": ["overview", "phased-pills", "comparison-guidance"],
  "callout-status": ["frames.html"],
  "slide-table": ["block-table"],
  "chart-bars": ["chart", "block-bars"],
  "header-bars": ["roadmap", "gantt"],
  "stage-status": ["frames.html"],
  "stance-quote": ["block-positions"],
};
const exceptionSections = Object.entries(exceptions.exceptions)
  .map(([name, e]) => {
    const reason = typeof e === "string" ? e : e.reason;
    const links = (exceptionLinks[name] ?? [])
      .map((id) => `<a href="${id.endsWith(".html") ? id : `#${id}`}">${id}</a>`)
      .join(", ");
    const shown = EXCEPTION_SHOWN[name];
    return `<section class="exception" data-hw-exception="${name}"><h3><code>${name}</code></h3><p>${attr(reason)}</p>${links ? `<p class="setup">On the slides: ${links}</p>` : ""}${shown ? `<div data-hw-scale="stage">${renderToStaticMarkup(onDay(shown()))}</div>` : ""}</section>`;
  })
  .join("\n");

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

// ─── Catalogue: every entry under its communication jobs (decision catalogue-grouping) ─────────
// The 13 jobs of docs/tracking/2026-11-01-catalogue-program.md ("Abdeckung je
// Kommunikationsaufgabe"). An entry may sit under two.
const JOBS = {
  open: "Open and close",
  orient: "Orient",
  statement: "One statement",
  explain: "Explain",
  compare: "Compare",
  process: "Process",
  schedule: "Schedule and plan",
  data: "Data",
  structure: "Structure",
  image: "Image and sketch",
  code: "Code and demo",
  people: "People",
  exercise: "Interaction and exercise",
} as const;
type Job = keyof typeof JOBS;
// The jobs of a slide type, a "type:variant" or a content block. A name missing here fails the run.
const JOB_OF: Record<string, Job[]> = {
  title: ["open"],
  closing: ["open"],
  agenda: ["orient", "schedule"],
  transition: ["orient"],
  "deep-dive-divider": ["orient"],
  overview: ["orient"],
  "phased-pills": ["orient"],
  roadmap: ["orient", "schedule"],
  statement: ["statement"],
  content: ["explain"],
  "content:centered": ["statement"],
  regular: ["people", "explain"],
  "regular:cards": ["orient"],
  grid: ["explain"],
  "grid:stats": ["data", "statement"],
  "grid:quotes": ["statement", "people"],
  comparison: ["compare"],
  process: ["process"],
  lanes: ["process"],
  gantt: ["schedule"],
  chart: ["data"],
  "team-topology": ["structure"],
  wheel: ["structure"],
  decision: ["structure"],
  media: ["image"],
  profiles: ["people"],
  question: ["exercise"],
  activity: ["exercise"],
  "activity:demo": ["code", "exercise"],
  paragraph: ["explain"],
  bullets: ["explain"],
  table: ["explain", "compare"],
  callout: ["explain"],
  "two-column": ["compare"],
  hooks: ["explain", "code"],
  terminal: ["code"],
  image: ["image"],
  video: ["image", "code"],
  "linked-image": ["image"],
  "image-and-grid": ["image", "explain"],
  annotated: ["image"],
  cards: ["explain"],
  "four-column": ["explain"],
  "labeled-grid": ["explain"],
  flow: ["process"],
  pipeline: ["process"],
  layers: ["process", "structure"],
  timeline: ["schedule", "process"],
  transform: ["compare"],
  positions: ["compare"],
  bars: ["data"],
  numbers: ["data", "statement"],
};
// The deprecated names that now draw through an entry, so a search for an old name finds it.
const REPLACES: Record<string, string[]> = {
  cards: ["pillars", "labeled-grid", "four-column"],
  numbers: ["stats"],
  comparison: ["guidance", "transform", "positions"],
  flow: ["pipeline"],
  process: ["evolution"],
  roadmap: ["dual-pill-overview"],
  statement: ["centered"],
  agenda: ["regular"],
};
const entryOf = (index: number) => {
  const slide = deck[index];
  const blocks = blocksOf(slide);
  const asBlock = blockPicks.includes(index);
  const variant = variantOf(slide);
  const jobs = [
    ...new Set(
      asBlock
        ? blocks.flatMap((b) => JOB_OF[b] ?? [])
        : (JOB_OF[`${slide.type}:${variant}`] ?? JOB_OF[slide.type] ?? []),
    ),
  ];
  const names = asBlock ? blocks : [slide.type];
  if (!jobs.length) throw new Error(`no communication job for ${names.join(", ")}`);
  const words = [slide.type, variant, ...blocks, ...names.flatMap((n) => REPLACES[n] ?? [])];
  return { jobs, search: [...words, ...jobs.map((j) => JOBS[j])].join(" ").toLowerCase() };
};

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
const tile = (
  { name, markup, index }: { name: string; markup: string; index: number },
  prefix = "",
) => {
  const id = anchor(name, prefix);
  const { jobs, search } = entryOf(index);
  return `<figure id="${id}" data-jobs="${jobs.join(" ")}" data-search="${attr(`${name.toLowerCase()} ${search}`)}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe loading="lazy" title="${attr(name)}" srcdoc="${attr(frameDoc(markup))}"></iframe></div><p class="meta">${jobs.map((j) => JOBS[j]).join(" · ")}</p></figure>`;
};
const partTile = ({ name, markup }: { name: string; markup: string }) => {
  const id = anchor(name, "part-");
  return `<figure id="${id}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe title="${attr(name)}" srcdoc="${attr(frameDoc(markup))}"></iframe></div></figure>`;
};
const frameDoc = (markup: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="build/slides.css"><style>body{margin:0}</style></head><body>${markup}</body></html>`;

// The three code blocks have no frame (see codeBlocks), so their entry is text only.
const codeEntry = {
  jobs: ["code"] as Job[],
  html: `<figure id="block-code" data-jobs="code" data-search="${[...codeBlocks].join(" ")} code and demo"><figcaption><a href="#block-code">${[...codeBlocks].join(", ")}</a></figcaption><p class="note">No tile: Shiki sets a code block's colours inline, which the brand colour scan allows only in <code>styles/slides.css</code>.</p></figure>`,
};
const entries = [
  ...[...frames, ...markerFrames].map((f) => ({ jobs: entryOf(f.index).jobs, html: tile(f) })),
  ...blockFrames.map((f) => ({ jobs: entryOf(f.index).jobs, html: tile(f, "block-") })),
  codeEntry,
];
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
.elements { grid-template-columns: repeat(auto-fill, 640px); }
.element figcaption { display: flex; gap: 0.75rem; align-items: baseline; }
.element .from, .exception .setup { font-weight: 400; color: var(--color-muted); }
.exception { max-width: 60rem; margin: 0 0 2rem; }
.exception h3 { font: 600 1rem/1.4 var(--font-mono); margin: 0 0 0.25rem; }
.exception p { margin: 0 0 0.5rem; }
.catalogue { display: grid; grid-template-columns: 15rem minmax(0, 1fr); gap: 2rem; align-items: start; }
.jobs { position: sticky; top: 5.5rem; display: flex; flex-direction: column; gap: 0.125rem; }
.jobs button { display: flex; justify-content: space-between; gap: 1rem; font: 500 0.9375rem/1.4 var(--font-sans); color: var(--color-ink); background: none; border: 0; border-radius: var(--radius-sm); padding: 0.375rem 0.75rem; text-align: left; cursor: pointer; }
.jobs button span { color: var(--color-muted); font-variant-numeric: tabular-nums; }
.jobs button[aria-pressed="true"] { background: var(--color-ink); color: var(--color-tint); }
.jobs button[aria-pressed="true"] span { color: inherit; }
.find { box-sizing: border-box; width: 100%; max-width: 30rem; font: 1rem/1.4 var(--font-sans); padding: 0.5rem 0.75rem; margin: 0 0 1.5rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: none; color: var(--color-ink); }
.meta { display: none; font-size: 0.875rem; color: var(--color-muted); margin: 0.5rem 0 0; }
figure:target .meta { display: block; }
.note { max-width: 480px; font-size: 0.875rem; color: var(--color-muted); margin: 0; }
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
<p>Every slide type of the h&amp;w slide engine with each of its variants, and the content blocks a content slide is built from, as they look in a printed deck. All content is made up. Click a name to see its slide at 1440 px.</p>
<p class="setup">Opens from a checkout of the <code>slides</code> repository after <code>bun install</code>, or at <code>http://slides.localhost</code> with <code>bun run dev</code>: fonts and logos load from <code>node_modules/@hackersandwizards/brand</code>. Built by <code>bun run specimen</code> from <code>specimen/slide-catalogue.ts</code>.</p>
</div>
<h2 id="parts">Parts</h2>
<p class="layers">Three layers, as in the document engine. <strong>Tokens</strong>: <code>styles/tokens.css</code> names every value a slide draws (colour, type step, tracking, leading, measure, rule) from <code>@hackersandwizards/brand</code>; <code>test/tokens.test.ts</code> fails on a raw length or colour anywhere else. <strong>Parts</strong> below are built from tokens only, each with its variants. <strong>Slide types</strong> compose parts; a difference between two types is a part's variant.</p>
<table class="parts"><thead><tr><th>Part</th><th>What it is</th><th>Used by</th></tr></thead><tbody>
${partFrames.map((p) => `<tr><td><a href="#part-${p.name.toLowerCase()}"><code>${p.name}</code></a></td><td>${attr(p.purpose)}</td><td>${p.users.map((t) => `<a href="#${t}">${t}</a>`).join(", ") || "&ndash;"}</td></tr>`).join("\n")}
</tbody></table>
<main>
${partFrames.map(partTile).join("\n")}
</main>
<h2 id="elements">Shared elements</h2>
<p class="layers">The elements the slides take from <code>@hackersandwizards/brand</code>, each at the stage scale (<code>data-hw-scale="stage"</code>, which every slide sets), on day and on night, then the elements the slides keep as their own, each with its reason. <code>brand-elements</code> measures both, last in <code>bun run check</code>, here and on <a href="frames.html">every specimen slide</a>.</p>
<main class="elements">
${usesTiles}
</main>
${exceptionSections}
<h2 id="catalogue">Catalogue</h2>
<p class="layers">Every slide type, variant and content block, by the job a slide does. An entry may sit under two jobs. The search finds every type, block and variant name, and the old names of types that now draw through another. Click a name to see its slide at 1440 px with its jobs.</p>
<div class="catalogue">
<nav class="jobs" aria-label="Communication jobs">
<button type="button" data-job="" aria-pressed="true">All <span>${entries.length}</span></button>
${(Object.keys(JOBS) as Job[]).map((j) => `<button type="button" data-job="${j}" aria-pressed="false">${JOBS[j]} <span>${entries.filter((e) => e.jobs.includes(j)).length}</span></button>`).join("\n")}
</nav>
<div>
<input type="search" id="find" class="find" placeholder="Search a type, block, variant or job" aria-label="Search the catalogue">
<main class="tiles">
${entries.map((e) => e.html).join("\n")}
</main>
<p id="none" hidden>No entry matches.</p>
</div>
</div>
</div>
<script>
// The catalogue's filter: a job in the left column and the search narrow the tiles together.
const tiles = [...document.querySelectorAll(".tiles figure")];
const find = document.getElementById("find");
let job = "";
const apply = () => {
  const q = find.value.trim().toLowerCase();
  let shown = 0;
  for (const t of tiles) {
    const on = (!job || t.dataset.jobs.split(" ").includes(job)) && (!q || t.dataset.search.includes(q));
    t.hidden = !on;
    shown += on;
  }
  document.getElementById("none").hidden = shown > 0;
};
for (const b of document.querySelectorAll(".jobs button"))
  b.addEventListener("click", () => {
    job = b.dataset.job;
    for (const o of document.querySelectorAll(".jobs button")) o.setAttribute("aria-pressed", String(o === b));
    apply();
  });
find.addEventListener("input", apply);
// On GitHub Pages, links to the other two catalogues leave their local addresses for their public pages.
if (location.hostname.endsWith(".github.io")) for (const a of document.querySelectorAll("a[href]")) { const name = a.hostname.slice(0, -".localhost".length); if (a.hostname.endsWith(".localhost") && ["brand", "slides", "documents"].includes(name)) a.href = "https://hackersandwizards.github.io/" + name + a.pathname + a.hash; }
</script>
</body>
</html>
`;

// The slides carrying a status callout or a stage strip, which no frame above shows: the frames
// page adds them, so brand-elements measures the callout and the strip's exceptions show.
const shown = new Set([...picks, ...blockPicks]);
const extraFrames = deck.flatMap((s, index) =>
  !shown.has(index) &&
  s.type === "content" &&
  !hasCode(s) &&
  (s.stageMarker || s.content?.some((b) => b.type === "callout"))
    ? [renderFrame(index, "")]
    : [],
);
// Every frame of the page inline, one 1920x1080 slide after another: brand-elements reads only a
// page's own document, never a frame's.
const framesHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Specimen slides inline, @hackersandwizards/slides</title>
<!-- Generated by scripts/specimen.ts. Do not edit. -->
<link rel="stylesheet" href="build/slides.css">
<style>body{margin:0}</style>
</head>
<body>
${[...partFrames, ...frames, ...markerFrames, ...blockFrames, ...extraFrames].map((f) => f.markup).join("\n")}
</body>
</html>
`;

const outputs: [string, string][] = [
  [out, html],
  [join(root, "specimen", "frames.html"), framesHtml],
  [join(root, "specimen", "build", "slides.css"), css],
];

mkdirSync(join(root, "specimen", "build"), { recursive: true });
for (const [path, text] of outputs) writeFileSync(path, text);
