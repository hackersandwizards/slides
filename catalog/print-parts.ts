import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { aliasTypes } from "@hackersandwizards/slides/lib/slide-components";
import registry from "@hackersandwizards/slides/lib/slide-components?raw";
import * as primitives from "../components/slides/primitives";
import * as chrome from "../components/slides/SlideChrome";
import { highlightLines } from "../lib/code-highlight";
import { PrintProvider } from "../lib/print-context";
import { CODE_SAMPLE, PARTS, codePanel } from "./parts";
import { besidePage, frameDoc, typeAnchors } from "./print";
import { attr, createPrintAnchors } from "./print-markup";

const sources = import.meta.glob<string>("../components/slides/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});
const sourceOf = (component: string) => sources[`../components/slides/${component}.tsx`] ?? "";
const primitiveSources = Array.from(
  sourceOf("primitives").matchAll(/^export \* from "\.\/([\w-]+)";$/gm),
  ([, component]) => sourceOf(component),
).join("\n");

// A static render never runs CodeLines' lazy highlighter, so this page's tile colours its code here.
const staticPart = (name: string) =>
  name === "CodePanel" ? codePanel(highlightLines(CODE_SAMPLE, "bash")) : PARTS[name]();
const partMarkup = (name: string) =>
  renderToStaticMarkup(
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
        h("div", { className: "p-24" }, h(Fragment, null, staticPart(name))),
      ),
    ),
  );

const partSources: Record<string, string> = {
  primitives: primitiveSources,
  SlideChrome: sourceOf("SlideChrome"),
  ChartPlots: sourceOf("ChartPlots"),
};
// The chart's category label is a part too, the one of ChartPlots.tsx a deck sees alone.
const partNames = [
  ...Object.entries({ primitives, SlideChrome: chrome }).flatMap(([file, mod]) =>
    Object.entries(mod)
      .filter(([, v]) => typeof v === "function")
      .map(([name]) => ({ name, file })),
  ),
  { name: "AxisTick", file: "ChartPlots" },
];
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
  return [
    source,
    ...[...source.matchAll(/(?:from |import\()"\.\/(\w+)"/g)].map(([, c]) => reach(c, seen)),
  ].join("\n");
};
const typeSources = typeFiles.map(({ type, component }) => ({ type, source: reach(component) }));
const usedBy = (name: string) =>
  typeSources
    .filter(({ source }) => new RegExp(`<${name}[\\s/>]`).test(source))
    .map(({ type }) => type);

export const partFrames = partNames.map(({ name, file }) => ({
  name,
  file,
  purpose: purpose(name, file),
  users: usedBy(name),
  markup: besidePage(partMarkup(name)),
}));

const partTile = ({ name, markup }: { name: string; markup: string }, id: string) => {
  return `<figure id="${id}"><figcaption><a href="#${id}">${name}</a></figcaption><div class="frame"><iframe loading="lazy" title="${attr(name)}" srcdoc="${attr(frameDoc(markup))}"></iframe></div></figure>`;
};

export const partTiles = (() => {
  const anchor = createPrintAnchors();
  return partFrames.map((part) => partTile(part, anchor(part.name, "part-"))).join("\n");
})();

export const partRows = partFrames
  .map(
    (p) =>
      `<tr><td><a href="#part-${p.name.toLowerCase()}"><code>${p.name}</code></a></td><td>${attr(p.purpose)}</td><td>${p.users.map((t) => `<a href="#${typeAnchors.get(t) ?? t}">${t}</a>`).join(", ") || "&ndash;"}</td></tr>`,
  )
  .join("\n");
