import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Scanner } from "@tailwindcss/oxide";
import { aliasTypes, slideComponents } from "../lib/slide-components";
import { brandLogos } from "../lib/brand-logos";
import { PrintProvider } from "../lib/print-context";
import { PrintSlide } from "../components/slides/PrintSlide";
import { slideCatalogue } from "../specimen/slide-catalogue";
import type { Slide } from "../types/slide";
import * as primitives from "../components/slides/primitives";
import { highlightLines } from "../lib/code-highlight";
import { renderMarkdown } from "../lib/markdown";
import { isOpening, replacedBy } from "../lib/slide-utils";
import * as chrome from "../components/slides/SlideChrome";
import { brandHref, placeBrandUrls } from "./brand-urls";
import { classesIn, compileSlides } from "./print-css";
import { PARTS, inRow } from "./parts";
import exceptions from "../brand-elements.json";
import { version as brandVersion } from "@hackersandwizards/brand/package.json";
import registry from "../lib/slide-components.ts?raw";

// The checkout, which the config hands over: under Astro's bundle import.meta points into dist/.
const root = __SLIDES_ROOT__;
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
  ("strike" in s && s.strike === false ? "without strike" : "") ||
  (s.type === "statement" && (s.attribution ? "quotation" : s.qr ? "qr" : "")) ||
  (s.type === "title" && isOpening(s) ? "opening" : "");

// A deprecated form stays in the specimen deck, which the consumers test, but leaves the catalogue
// for the one list of replaced forms: a new slide picks the entry that draws it.
const offered = (s: Slide) => !replacedBy(s);
const picks = (Object.keys(slideComponents) as (keyof typeof slideComponents)[])
  .filter((type) => !aliasTypes[type])
  .flatMap((type) => {
    const first = deck.findIndex((s) => s.type === type && offered(s));
    if (first < 0) throw new Error(`specimen deck has no offered slide of type ${type}`);
    const seen = new Set([variantOf(deck[first])]);
    return [
      first,
      ...deck.flatMap((s, index) => {
        if (
          s.type !== type ||
          !offered(s) ||
          isBlockSlide(s) ||
          hasCode(s) ||
          seen.has(variantOf(s))
        )
          return [];
        seen.add(variantOf(s));
        return [index];
      }),
    ];
  });
const blocksOf = (s: Slide) => (s.type === "content" ? s.content.map((b) => b.type) : []);
const labelled = deck.flatMap((s, index) =>
  isBlockSlide(s) && !hasCode(s) && offered(s) ? [index] : [],
);
const carried = new Set([...picks, ...labelled].flatMap((i) => blocksOf(deck[i])));
const blockPicks = [
  ...labelled,
  ...[...new Set(deck.filter(offered).flatMap(blocksOf))]
    .filter((b) => !carried.has(b) && !codeBlocks.has(b))
    .map((b) => deck.findIndex((s) => offered(s) && blocksOf(s).includes(b))),
];

// Each slide renders in its own 1920x1080 frame, as scripts/render-pdf.ts sets its viewport: a
// slide's lengths in `vh` (`.slide-content`, image heights) read the window that holds them.
const slideMarkup = (index: number) =>
  renderToStaticMarkup(
    h(PrintProvider, null, h(PrintSlide, { presentation: slideCatalogue, index })),
  );
const renderFrame = (index: number, name: string) => {
  let markup = slideMarkup(index);
  for (const [file, url] of Object.entries(brandLogos))
    markup = markup.replaceAll(`"${url}"`, `"${brandHref}/logos/${file}.svg"`);
  markup = markup.replace(
    /(src|href|poster)="(?:\/slides)?\/slide-catalogue\//g,
    '$1="slide-catalogue/',
  );
  return { name, markup, index };
};
const frames = picks.map((index) => {
  const { type } = deck[index];
  const first = deck.findIndex((s) => s.type === type) === index;
  return renderFrame(index, first ? type : `${type} · ${variantOf(deck[index])}`);
});
// A type whose first slide draws no list marker adds its first slide that does, since the marker
// check (test/marker-position.test.ts) measures only this page.
const marked = (index: number) => slideMarkup(index).includes("hw-marker");
const markerFrames = [...new Set(picks.map((i) => deck[i].type))].flatMap((type) => {
  if (picks.some((i) => deck[i].type === type && marked(i))) return [];
  const index = deck.findIndex((s, i) => s.type === type && offered(s) && marked(i));
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
  ).replace(/(src|href|poster)="(?:\/slides)?\/slide-catalogue\//g, '$1="slide-catalogue/'),
}));

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

// The shared-element tiles render on the page itself, whose 16px rem is the stage's at 1440, the
// size a slide is designed at.
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
      h("span", { className: "hw-label", "data-hue": "purple" }, "Second part"),
    ),
  "label-box": () =>
    inRow(
      h("span", { className: "hw-label hw-label-box", "data-tone": "ink" }, "The Factory"),
      h("span", { className: "hw-label hw-label-box", "data-hue": "teal" }, "Part one"),
      h("span", { className: "hw-label hw-label-box", "data-hue": "purple" }, "Part two"),
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
  "inline-code": () =>
    h("p", { className: "text-xl text-text" }, renderMarkdown("Run `bun run check` first.")),
  strip: () => h("div", { className: "hw-strip w-96" }),
  rule: () =>
    h(
      "div",
      { className: "flex w-96 flex-col gap-6" },
      h("div", { className: "hw-rule", "aria-hidden": "true" }),
      h("div", { className: "hw-rule", "data-hue": "purple", "aria-hidden": "true" }),
    ),
  button: () =>
    h("a", { className: "hw-button", "data-variant": "secondary", href: "#elements" }, "Read more"),
  status: () =>
    inRow(
      h(SlideCard, { tone: "accent", look: "soft", className: "card-pad-4/6 text-lg" }, "warning"),
      h(SlideCard, { tone: "success", look: "soft", className: "card-pad-4/6 text-lg" }, "success"),
    ),
  frame: () => h("div", { className: "hw-frame w-96 p-6 text-lg" }, "A group"),
  field: () =>
    h("input", {
      type: "search",
      className: "hw-field w-96",
      placeholder: "Search a type",
      "aria-label": "Search",
    }),
  "icon-button": () =>
    h(
      "button",
      { type: "button", className: "hw-icon-button", "data-on": "picture", "aria-label": "Play" },
      h("svg", { viewBox: "0 0 24 24", fill: "currentColor" }, h("path", { d: "M6 4l14 8-14 8z" })),
    ),
  quote: () =>
    h(
      "blockquote",
      { className: "hw-quote w-fit text-xl text-text" },
      h("p", null, "The build set the pace."),
      h("p", { className: "text-text-muted" }, "Mara Lindqvist (fictional)"),
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
      `<figure class="element"><figcaption><strong>${name}</strong> <span class="from">from brand v${brandVersion}</span> <code>hw-${name}</code> <a href="https://hackersandwizards.github.io/brand/catalogue.html#hw-${name}">catalogue</a></figcaption><div data-hw-tile="${name}" data-hw-version="${brandVersion}" data-hw-scale="stage">${renderToStaticMarkup(h(Fragment, null, onDay(render()), onNight(render())))}</div></figure>`,
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
  "frame-tone": () =>
    inRow(
      h(DashedFrame, { className: "w-64 p-6 text-lg" }, "neutral"),
      h(DashedFrame, { tone: "primary", className: "w-64 p-6 text-lg" }, "primary"),
      h(DashedFrame, { tone: "secondary", active: true, className: "w-64 p-6 text-lg" }, "active"),
    ),
};
const exceptionLinks: Record<string, string[]> = {
  "callout-status": ["frames.html"],
  "slide-table": ["block-table"],
  "chart-bars": ["chart", "block-bars"],
  "stage-status": ["frames.html"],
  "qr-card": ["statement-qr"],
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
  overview: ["orient"],
  "phased-pills": ["orient"],
  roadmap: ["orient", "schedule"],
  statement: ["statement"],
  content: ["explain"],
  "content:centered": ["statement"],
  regular: ["people", "explain"],
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
  flow: ["process"],
  pipeline: ["process"],
  layers: ["process", "structure"],
  timeline: ["schedule", "process"],
  bars: ["data"],
  numbers: ["data", "statement"],
};
// The deprecated names that now draw through an entry, so a search for an old name finds it.
const REPLACES: Record<string, string[]> = {
  cards: ["pillars", "labeled-grid", "four-column", "grid"],
  numbers: ["stats", "grid"],
  comparison: ["guidance", "transform", "positions"],
  flow: ["pipeline"],
  process: ["evolution"],
  roadmap: ["dual-pill-overview"],
  statement: ["centered"],
  agenda: ["regular"],
  content: ["regular"],
  transition: ["deep-dive-divider"],
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

export const replacedRows = [
  ...new Map(
    deck.flatMap((s) => {
      const r = replacedBy(s);
      if (!r) return [];
      const form = r.form ?? [s.type, variantOf(s)].filter(Boolean).join(", ");
      return [[form, r.to] as const];
    }),
  ),
]
  .map(
    ([from, to]) => `<tr><td><code>${attr(from)}</code></td><td><code>${attr(to)}</code></td></tr>`,
  )
  .join("\n");
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

// The markup print.ts draws; a class written elsewhere on the pages, as in index.astro, needs its
// own entry here (test/pages/print-classes.test.ts).
const compiler = await compileSlides(root);
export const css = placeBrandUrls(
  compiler.build([
    ...new Scanner({ sources: compiler.sources }).scan(),
    ...[inlineFrames, usesTiles, exceptionSections].flatMap(classesIn),
  ]),
  `../${brandHref}`,
);
