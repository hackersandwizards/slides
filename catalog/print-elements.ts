import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { version as brandVersion } from "@hackersandwizards/brand/package.json";
import exceptions from "../brand-elements.json";
import { DeckTile } from "../components/deck/DeckTile";
import { DashedFrame, NumberTile, Portrait, SlideCard } from "../components/slides/primitives";
import { highlightLines } from "../lib/code-highlight";
import { renderMarkdown } from "../lib/markdown";
import { CODE_SAMPLE, codePanel, inRow } from "./parts";
import { attr } from "./print-markup";

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
  "arrow-link": () =>
    h(DeckTile, {
      href: "#elements",
      printHref: "#elements",
      title: "A deck",
      blurb: "What it is for.",
      slideCount: 12,
      family: { label: "Talk", hue: ["var(--color-teal)", "var(--color-teal-night)"] },
    }),
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
  search: () =>
    h(
      "div",
      { className: "hw-search w-96" },
      h("input", {
        type: "search",
        className: "hw-field",
        placeholder: "Search a type",
        "aria-label": "Search a type",
      }),
    ),
  nav: () =>
    h(
      "nav",
      { className: "hw-nav w-96", "aria-label": "Jobs" },
      h(
        "ul",
        null,
        h("li", null, h("a", { href: "#elements", "aria-current": "true" }, "All")),
        h("li", null, h("a", { href: "#elements" }, "Compare")),
      ),
    ),
  table: () =>
    h(
      "table",
      { className: "hw-table" },
      h("thead", null, h("tr", null, h("th", null, "Part"), h("th", null, "Used by"))),
      h("tbody", null, h("tr", null, h("td", null, "Card"), h("td", null, "Grid slide"))),
    ),
  kbd: () =>
    inRow(
      h("kbd", { className: "hw-kbd" }, "Shift"),
      "+",
      h("kbd", { className: "hw-kbd" }, "Space"),
    ),
  empty: () => h("p", { className: "hw-empty w-96", "data-variant": "plain" }, "No entry matches."),
  dialog: () =>
    h("dialog", { open: true, className: "hw-dialog", "data-size": "small" }, "A dialog panel."),
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
        "data-hw-focus": "",
      },
      "A vote option",
    ),
  avatar: () => h(Portrait, { alt: "", tone: "primary" }, "ML"),
};
export const usesTiles = Object.entries(USES)
  .map(
    ([name, render]) =>
      `<figure class="element"><figcaption><strong>${name}</strong> <span class="from">from brand v${brandVersion}</span> <code>hw-${name}</code> <a href="https://hackersandwizards.github.io/brand/#elements/hw-${name}">catalogue</a></figcaption><div data-hw-tile="${name}" data-hw-version="${brandVersion}" data-hw-scale="stage">${renderToStaticMarkup(h(Fragment, null, onDay(render()), onNight(render())))}</div></figure>`,
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
  "code-panel": () => codePanel(highlightLines(CODE_SAMPLE, "bash")),
  "frame-tone": () =>
    inRow(
      h(DashedFrame, { className: "w-64 p-6 text-lg" }, "neutral"),
      h(DashedFrame, { tone: "primary", className: "w-64 p-6 text-lg" }, "primary"),
      h(DashedFrame, { tone: "secondary", active: true, className: "w-64 p-6 text-lg" }, "active"),
    ),
  // PresenterView's notes textarea, its classes copied: the presenter view has no story to link.
  "notes-field": () =>
    onNight(
      h("textarea", {
        "aria-label": "Speaker notes text",
        readOnly: true,
        rows: 3,
        defaultValue: "A fictional note to the speaker.",
        className:
          "w-full resize-none rounded-brand bg-night-2 px-5 py-4 text-lg leading-relaxed text-night-ink outline-2 outline-amber",
      }),
    ),
};
const exceptionLinks: Record<string, string[]> = {
  "callout-status": ["frames.html"],
  "slide-table": ["block-table"],
  "chart-bars": ["chart", "block-bars"],
  "stage-status": ["frames.html"],
  "phased-pills-slide": ["phased-pills"],
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
