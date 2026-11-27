import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { aliasTypes, slideComponents } from "@hackersandwizards/slides/lib/slide-components";
import { brandLogos } from "../lib/brand-logos";
import { PrintProvider } from "../lib/print-context";
import { PrintSlide } from "../components/slides/PrintSlide";
import { slideCatalog } from "../specimen/slide-catalog";
import type { Slide } from "../types/slide";
import { variantOf } from "../lib/catalog-classification";
import { replacedBy } from "../lib/slide-utils";
import { brandHref } from "./brand-urls";
import { GUIDANCE } from "./guidance";
import fitPrintUrl from "./fit-print?worker&url";
import { attr, createPrintAnchors } from "./print-markup";

const deck = slideCatalog.slides;
const blockLabel = /^(Block|Visual): /;
const isBlockSlide = (
  s: Slide,
): s is Extract<Slide, { type: "content" }> & { sectionLabel: string } =>
  s.type === "content" && typeof s.sectionLabel === "string" && blockLabel.test(s.sectionLabel);
// A code block's Shiki colours are inline hex, which the brand colour scan allows in
// styles/slides.css only, so the page leaves the slides that carry code to the types above.
const codeBlocks = new Set(["code", "code-and-text", "annotated-code"]);
const hasCode = (s: Slide) =>
  (s.type === "content" && !!s.content?.some((b) => codeBlocks.has(b.type))) ||
  (s.type === "lanes" && !!s.codeSnippet);
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
    h(PrintProvider, null, h(PrintSlide, { presentation: slideCatalog, index })),
  );
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const fitPrint = `<script ${import.meta.env.DEV ? 'type="module"' : "defer"} src="${fitPrintUrl.replace(`${base}/_astro/`, "../../_astro/")}"></script>`;
const bundled = `"${base}/_astro/`;
export const besidePage = (markup: string) => {
  for (const [file, url] of Object.entries(brandLogos))
    markup = markup.replaceAll(`"${url}"`, `"${brandHref}/logos/${file}.svg"`);
  return markup.replaceAll(bundled, '"../../_astro/');
};

const renderFrame = (index: number, name: string) => ({
  name,
  markup: besidePage(slideMarkup(index)),
  index,
});
export const frames = picks.map((index) => {
  const { type } = deck[index];
  const first = deck.findIndex((s) => s.type === type) === index;
  return renderFrame(index, first ? type : `${type} · ${variantOf(deck[index])}`);
});
// A type whose first slide draws no list marker adds its first slide that does, since the marker
// check (test/pages/marker-position.test.ts) measures only this page.
const marked = (index: number) => slideMarkup(index).includes("hw-marker");
export const markerFrames = [...new Set(picks.map((i) => deck[i].type))].flatMap((type) => {
  if (picks.some((i) => deck[i].type === type && marked(i))) return [];
  const index = deck.findIndex((s, i) => s.type === type && offered(s) && marked(i));
  return index < 0 ? [] : [renderFrame(index, deck[index].type)];
});
export const blockFrames = blockPicks.map((index) => {
  const slide = deck[index];
  return renderFrame(
    index,
    isBlockSlide(slide) ? slide.sectionLabel.replace(blockLabel, "") : blocksOf(slide).join(", "),
  );
});

// The 13 jobs of docs/agent-work/2026-11-01-catalog-program.md
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
  "phased-pills": ["orient"],
  roadmap: ["orient", "schedule"],
  statement: ["statement"],
  content: ["explain"],
  regular: ["people", "explain"],
  "grid:quotes": ["statement", "people"],
  "grid:quotes with portraits": ["statement", "people"],
  comparison: ["compare"],
  process: ["process"],
  lanes: ["process"],
  gantt: ["schedule"],
  chart: ["data"],
  "team-topology": ["structure"],
  wheel: ["structure"],
  decision: ["structure"],
  profiles: ["people"],
  question: ["exercise"],
  activity: ["exercise"],
  "activity:demo": ["code", "exercise"],
  paragraph: ["explain"],
  bullets: ["explain"],
  table: ["explain", "compare"],
  callout: ["explain"],
  quote: ["statement", "explain"],
  "two-column": ["compare"],
  hooks: ["explain", "code"],
  terminal: ["code"],
  image: ["image"],
  "image-steps": ["image", "explain"],
  gallery: ["image"],
  video: ["image", "code"],
  "linked-image": ["image"],
  "profile-links": ["people"],
  "image-and-grid": ["image", "explain"],
  annotated: ["image"],
  cards: ["explain"],
  flow: ["process"],
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
  "phased-pills": ["overview"],
  gallery: ["media"],
  image: ["media"],
  video: ["media"],
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

// Recharts draws in the browser only, so a static tile of a trend or bar chart has an empty plot:
// these two tiles frame the variant's story page, which hydrates. Its state is named as the variant.
const plotStory = (index: number) => {
  const slide = deck[index];
  return slide.type === "chart" && (slide.variant === "trend" || slide.variant === "bar")
    ? `src="${base}/stories/Types/chart-slide/${slide.variant}/"`
    : undefined;
};
const guidanceOf = (id: string) => {
  const entry = GUIDANCE[id];
  if (!entry) throw new Error(`no guidance for the catalogue entry ${id}`);
  return {
    search: entry.when.toLowerCase(),
    html: `<p class="when">${attr(entry.when)}</p><dl class="dos"><dt>Do</dt><dd>${attr(entry.do)}</dd><dt>Don't</dt><dd>${attr(entry.dont)}</dd></dl>`,
  };
};
const tile = (
  { name, markup, index }: { name: string; markup: string; index: number },
  id: string,
) => {
  const { jobs, search } = entryOf(index);
  const content = plotStory(index) ?? `srcdoc="${attr(frameDoc(markup))}"`;
  const guide = guidanceOf(id);
  const html = `<figure id="${id}" data-jobs="${jobs.join(" ")}" data-search="${attr(`${name.toLowerCase()} ${search} ${guide.search}`)}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe loading="lazy" title="${attr(name)}" ${content}></iframe></div><p class="meta">${jobs.map((j) => JOBS[j]).join(" · ")}</p>${guide.html}</figure>`;
  return { id, jobs, html };
};

export const frameDoc = (markup: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="build/slides.css">${fitPrint}<style>body{margin:0}</style></head><body>${markup}</body></html>`;

const codeGuide = guidanceOf("block-code");
const codeEntry = {
  id: "block-code",
  jobs: ["code"] as Job[],
  html: `<figure id="block-code" data-jobs="code" data-search="${[...codeBlocks].join(" ")} code and demo ${codeGuide.search}"><figcaption><a href="#block-code">${[...codeBlocks].join(", ")}</a></figcaption><p class="note">No tile: Shiki sets a code block's colours inline, which the brand colour scan allows only in <code>styles/slides.css</code>.</p>${codeGuide.html}</figure>`,
};
const specimenPrintTiles = (() => {
  const anchor = createPrintAnchors();
  const slides = [...frames, ...markerFrames].map((frame) => ({
    type: deck[frame.index].type,
    entry: tile(frame, anchor(frame.name)),
  }));
  const blocks = blockFrames.map((frame) => tile(frame, anchor(frame.name, "block-")));
  return { slides, blocks };
})();

// Each type's first tile, which a part's "used by" links: a type whose first slide is a replaced
// form, such as `grid`, has its first tile under a variant's name.
export const typeAnchors: ReadonlyMap<string, string> = new Map(
  specimenPrintTiles.slides.toReversed().map(({ type, entry }) => [type, entry.id]),
);
export const entries = [
  ...specimenPrintTiles.slides.map(({ entry }) => entry),
  ...specimenPrintTiles.blocks,
  codeEntry,
];

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

// The slides carrying a status callout or a stage strip, which no frame above shows: the frames
// page adds them, so brand-elements measures the callout and the strip's exceptions show.
const shown = new Set([...picks, ...blockPicks]);
export const extraFrames = deck.flatMap((s, index) =>
  !shown.has(index) &&
  s.type === "content" &&
  !hasCode(s) &&
  (s.stageMarker || s.content?.some((b) => b.type === "callout"))
    ? [renderFrame(index, "")]
    : [],
);
