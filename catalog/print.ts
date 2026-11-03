import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
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
import { PARTS, inRow } from "./parts";
import exceptions from "../brand-elements.json";
import registry from "../lib/slide-components.ts?raw";

// The checkout, which the config hands over: under Astro's bundle import.meta points into dist/.
const root = __SLIDES_ROOT__;
const brand = join(root, "node_modules", "@hackersandwizards", "brand");
// The brand files as dist/brand/ holds them, relative to the print pages in dist/catalog/print/.
export const brandHref = "../../brand";
const sources = import.meta.glob<string>("../components/slides/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});
const sourceOf = (component: string) => sources[`../components/slides/${component}.tsx`] ?? "";

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
const variantOf = (s: Slide) =>
  ("variant" in s && s.variant) ||
  ("layout" in s && s.layout) ||
  ("kind" in s && s.kind) ||
  ("strike" in s && s.strike === false ? "without strike" : "");

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

const { CodePanel, DashedFrame, NumberTile, SlideCard } = primitives;
const { GradientTitlePill } = chrome;

const partSources: Record<string, string> = {
  primitives: sourceOf("primitives"),
  SlideChrome: sourceOf("SlideChrome"),
};
const partNames = Object.entries({ primitives, SlideChrome: chrome }).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([, v]) => typeof v === "function")
    .map(([name]) => ({ name, file })),
);
const unlisted = partNames.filter(({ name }) => !PARTS[name]).map(({ name }) => name);
if (unlisted.length) throw new Error(`parts without a catalogue entry: ${unlisted.join(", ")}`);

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

const typeFiles = [...registry.matchAll(/^\s*"?([\w-]+)"?: (\w+) as SlideComponent/gm)]
  .filter(([, type]) => !aliasTypes[type as keyof typeof aliasTypes])
  .map(([, type, component]) => ({ type, component }));
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

// The page's 16px rem is the stage's at 1440, the size a slide is designed at.
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
export const usesTiles = Object.entries(USES)
  .map(
    ([name, render]) =>
      `<figure class="element"><figcaption><strong>${name}</strong> <span class="from">aus brand v${brandVersion}</span> <code>hw-${name}</code> <a href="https://hackersandwizards.github.io/brand/catalogue.html#hw-${name}">catalogue</a></figcaption><div data-hw-tile="${name}" data-hw-version="${brandVersion}" data-hw-scale="stage">${renderToStaticMarkup(h(Fragment, null, onDay(render()), onNight(render())))}</div></figure>`,
  )
  .join("\n");
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
  "label-hue": ["overview", "phased-pills", "comparison-guidance"],
  "callout-status": ["frames.html"],
  "slide-table": ["block-table"],
  "chart-bars": ["chart", "block-bars"],
  "header-bars": ["roadmap", "gantt"],
  "stage-status": ["frames.html"],
  "stance-quote": ["block-positions"],
};
export const exceptionSections = Object.entries(
  exceptions.exceptions as Record<string, string | { reason: string }>,
)
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
export const css = compiler
  .build(candidates)
  // A require of the checkout, since `import.meta.resolve` threw in the dev server's module runner.
  .replace(
    /url\("(@hackersandwizards\/brand\/[^"]+)"\)/g,
    (_, id: string) =>
      `url("../${brandHref}/${relative(brand, createRequire(join(root, "package.json")).resolve(id))
        .split(sep)
        .join("/")}")`,
  );

// The 13 jobs of docs/agent-work/2026-11-01-catalogue-program.md
// ("Abdeckung je Kommunikationsaufgabe").
export const JOBS = {
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
export type Job = keyof typeof JOBS;
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
  return `<figure id="${id}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe loading="lazy" title="${attr(name)}" srcdoc="${attr(frameDoc(markup))}"></iframe></div></figure>`;
};
const frameDoc = (markup: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="build/slides.css"><style>body{margin:0}</style></head><body>${markup}</body></html>`;

const codeEntry = {
  jobs: ["code"] as Job[],
  html: `<figure id="block-code" data-jobs="code" data-search="${[...codeBlocks].join(" ")} code and demo"><figcaption><a href="#block-code">${[...codeBlocks].join(", ")}</a></figcaption><p class="note">No tile: Shiki sets a code block's colours inline, which the brand colour scan allows only in <code>styles/slides.css</code>.</p></figure>`,
};
export const entries = [
  ...[...frames, ...markerFrames].map((f) => ({ jobs: entryOf(f.index).jobs, html: tile(f) })),
  ...blockFrames.map((f) => ({ jobs: entryOf(f.index).jobs, html: tile(f, "block-") })),
  codeEntry,
];
export const partTiles = partFrames.map(partTile).join("\n");
export const partRows = partFrames
  .map(
    (p) =>
      `<tr><td><a href="#part-${p.name.toLowerCase()}"><code>${p.name}</code></a></td><td>${attr(p.purpose)}</td><td>${p.users.map((t) => `<a href="#${t}">${t}</a>`).join(", ") || "&ndash;"}</td></tr>`,
  )
  .join("\n");

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
export const inlineFrames = [
  ...partFrames,
  ...frames,
  ...markerFrames,
  ...blockFrames,
  ...extraFrames,
]
  .map((f) => f.markup)
  .join("\n");
