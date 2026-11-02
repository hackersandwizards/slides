import { ROLE_NAMES } from "./presenter-sync";
import type {
  AgendaSlide,
  ContentSection,
  ComparisonGuidanceSlide,
  ContentBlock,
  ContentSlide,
  DualPillOverviewSlide,
  EvolutionSlide,
  GridSlide,
  GuidanceSlide,
  ProcessSlide,
  RegularSlide,
  RoadmapSlide,
  StatementSlide,
  SectionTheme,
} from "../types/slide";

/** The sessionStorage key carrying the direction a navigation arrives from. The frames inside the
 *  speaker window share that window's sessionStorage, so each role keeps a key of its own; the
 *  audience window keeps the plain one. */
export function directionKey(name = typeof window === "undefined" ? "" : window.name): string {
  return (Object.values(ROLE_NAMES) as string[]).includes(name)
    ? `slide-direction:${name}`
    : "slide-direction";
}

/** Whether this slide was reached backwards, which opens it fully revealed. A pure read, safe in a
 *  render-phase state initializer: `SlideNavigation` consumes the key after mount, once every hook
 *  on the slide has read it. */
export function arrivedBackwards(): boolean {
  return typeof window !== "undefined" && readStored("session", directionKey()) === "back";
}

/** A key the deck leaves alone. One held with Cmd, Ctrl or Alt belongs to the browser or the
 *  system: Cmd+Left goes back in history, so the deck stepping on it too would move two places.
 *  One pressed on the page while the dev-only edit mode (`deck-edit-mode.tsx`) is on is ignored,
 *  so typing after a click that opened no field changes nothing; a press the engine dispatches
 *  itself, from a touch button or replayed from another window, still counts there. */
export function ignoredKey(event: KeyboardEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    (event.isTrusted && "deckEdit" in document.documentElement.dataset)
  );
}

/** Storage can be blocked, and then even naming it throws: reads answer null, writes do nothing. */
const store = (kind: "local" | "session") => (kind === "local" ? localStorage : sessionStorage);

export function readStored(kind: "local" | "session", key: string): string | null {
  try {
    return store(kind).getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(kind: "local" | "session", key: string, value: string | null) {
  try {
    if (value === null) store(kind).removeItem(key);
    else store(kind).setItem(key, value);
  } catch {}
}

/** The corner counter, "05 / 24", on every slide but a title slide, which carries none. */
export function pageLabel(slides: ReadonlyArray<{ type: string }>, index: number) {
  if (slides[index]?.type === "title") return undefined;
  const width = Math.max(2, String(slides.length).length);
  const pad = (n: number) => String(n).padStart(width, "0");
  return `${pad(index + 1)} / ${pad(slides.length)}`;
}

/** The accent of the nth person on a slide, by position and never by who it is: teal first, then
 *  purple, alternating, in the order of the logo ("hackers" teal, "wizards" purple). */
export function personAccent(index: number): "primary" | "secondary" {
  return index % 2 === 0 ? "primary" : "secondary";
}

/** A slide of a deep-dive part stands on night, the brand's ground for a whole section (os design
 *  guide), so the part reads as one from the back row: the deep-dive divider, a slide whose
 *  `sectionTheme` is `deepdive` and a pill map whose phases are. Blind-scored against the part
 *  marked by its label alone and against the old rose and amber backdrop (os
 *  docs/tracking/2026-11-01-deep-dive-brand.md). */
export function isDeepDive(slide: {
  type: string;
  sectionTheme?: SectionTheme;
  phases?: { theme?: SectionTheme }[];
}): boolean {
  return (
    slide.type === "deep-dive-divider" ||
    slide.sectionTheme === "deepdive" ||
    (slide.phases?.some((p) => p.theme === "deepdive") ?? false)
  );
}

/** A link as a slide spells it out under a linked image, where a projected or printed slide hides
 *  the link itself: without its scheme, `www.` and a closing slash. */
export function linkLabel(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** Joins a hyphenated word with a non-breaking hyphen, outside code spans and link targets, so a
 *  table cell or a divider headline breaks only at a space. */
export function keepHyphenatedWords(text: string): string {
  return text
    .split(/(`[^`]*`|\]\([^)]*\))/)
    .map((part, i) =>
      i % 2 ? part : part.replace(/([\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, "$1\u2011"),
    )
    .join("");
}

/** An `evolution` slide as the `process` slide with `loop: false` that replaces it. */
export function evolutionAsProcess({ stages, ...slide }: EvolutionSlide): ProcessSlide {
  return {
    type: "process",
    ground: slide.ground,
    background: slide.background,
    headline: slide.headline,
    footer: slide.footer,
    static: slide.static,
    loop: false,
    highlightPhase: stages.find((s) => s.isHighlighted)?.title,
    nodes: stages.map((s) => ({
      title: s.title,
      description: s.description,
      label: s.multiplier,
      subtitle: s.subtitle || undefined,
      badge: s.badge,
      dimmed: s.isDimmed,
    })),
  };
}

/** A `dual-pill-overview` slide as the `roadmap` slide with phased columns that replaces it. */
export function dualPillAsRoadmap({ left, right, ...slide }: DualPillOverviewSlide): RoadmapSlide {
  return {
    type: "roadmap",
    preText: slide.preText,
    headline: slide.headline,
    subtitle: slide.subtitle,
    columns: [left, right],
  };
}

type Block<T extends ContentBlock["type"]> = Extract<ContentBlock, { type: T }>;

const indexOf = (i: number) => (i < 0 ? undefined : i);

/** A `labeled-grid` block as the `cards` block that replaces it (decision merge-cards). */
export function labeledGridAsCards(block: Block<"labeled-grid">): Block<"cards"> {
  return {
    type: "cards",
    items: block.items.map((item) => ({ title: item.title, text: item.subtitle })),
    highlight: indexOf(block.items.findIndex((item) => item.highlighted)),
    columns: (block.columns ?? (block.items.length % 3 === 0 ? 3 : 2)) as 1 | 2 | 3 | 4,
    reveal: block.reveal,
    dense: true,
  };
}

/** A `four-column` block as the `cards` block that replaces it, a list per card. */
export function fourColumnAsCards(block: Block<"four-column">): Block<"cards"> {
  return {
    type: "cards",
    items: block.columns.map((c) => ({ title: c.title, text: c.subtitle, items: c.items })),
    columns: Math.min(Math.max(block.columns.length, 1), 4) as 1 | 2 | 3 | 4,
    dense: true,
  };
}

/** A `grid` slide with pillars or stats as the content slide that replaces it: pillars as a
 *  `cards` block, numbered where no card names an icon, stats as a `numbers` block. A card's
 *  colour (`tone`) goes: colour comes from the role. Quotes keep the grid. */
export function gridAsContent({ cards, ...slide }: GridSlide): ContentSlide {
  const block: ContentBlock =
    slide.variant === "stats"
      ? {
          type: "numbers",
          items: cards.map((c) => ({
            value: c.value ?? "",
            label: c.label ?? c.title,
            text: c.description,
          })),
        }
      : {
          type: "cards",
          items: cards.map((c) => ({ title: c.title, text: c.description, icon: c.icon })),
          numbered: !cards.some((c) => c.icon),
          numberFrom: slide.numberFrom,
          highlight: indexOf(cards.findIndex((c) => c.highlight)),
          columns: cards.length === 4 ? 4 : undefined,
          reveal: !slide.allActive,
        };
  return {
    type: "content",
    ground: slide.ground,
    background: slide.background,
    sectionLabel: slide.sectionLabel,
    sectionTheme: slide.sectionTheme,
    headline: slide.headline,
    content: [block],
  };
}

/** A `guidance` slide as the comparison slide's `guidance` variant that replaces it. */
export function guidanceAsComparison({
  type: _,
  ...slide
}: GuidanceSlide): ComparisonGuidanceSlide {
  return { ...slide, type: "comparison", variant: "guidance" };
}

/** A `pipeline` block as the `flow` block that replaces it, or undefined for one flow cannot
 *  draw: a stage logo or the inner loops (`showLoops`) stay on the pipeline. */
export function pipelineAsFlow(block: Block<"pipeline">): Block<"flow"> | undefined {
  if (block.showLoops || block.stages.some((s) => s.logo)) return undefined;
  const lit = block.stages.findIndex((s) => s.state === "new" || s.state === "active");
  const framed =
    block.containerLabel ||
    block.containerLogos?.length ||
    block.containerSideNotes?.length ||
    block.containerFooter;
  return {
    type: "flow",
    steps: block.stages.map((s) => ({ title: s.title })),
    highlight: indexOf(lit),
    frame: framed
      ? {
          label: block.containerLabel,
          logos: block.containerLogos,
          notes: block.containerSideNotes,
          footer: block.containerFooter,
        }
      : undefined,
  };
}

/** A centered content slide as the statement slide that replaces it, or undefined where its
 *  blocks do not fit one: more than a subtitle and a closing of text, a block other than a
 *  paragraph, callout or linked image, a footer, markdown in the headline, or a deep-dive part. */
export function centeredAsStatement(slide: ContentSlide): StatementSlide | undefined {
  if (slide.footer || slide.sectionTheme === "deepdive" || /[`*[]/.test(slide.headline)) return;
  const texts: string[] = [];
  let closing: string | undefined;
  let linkedImage: StatementSlide["linkedImage"];
  for (const block of slide.content) {
    if (block.type === "paragraph") texts.push(block.text);
    else if (block.type === "callout" && closing === undefined) closing = block.text;
    else if (block.type === "linked-image" && !linkedImage)
      linkedImage = { src: block.src, alt: block.alt, href: block.href };
    else return;
  }
  const subtitle = slide.subtitle ?? texts.shift();
  if (closing === undefined) closing = texts.pop();
  if (texts.length) return;
  return {
    type: "statement",
    ground: slide.ground,
    background: slide.background,
    kicker: slide.sectionLabel,
    lines: [slide.headline],
    subtitle,
    closing,
    linkedImage,
  };
}

/** A section's text with its link set as a markdown link after it. */
const sectionText = (s: ContentSection) =>
  [s.text, s.link && `[${s.link.label}](${s.link.url})`].filter(Boolean).join(" ") || undefined;

/** A `regular` slide as the slide that replaces it (decision merge-content), or undefined for one
 *  with a profile, which keeps its own drawing (the sidebar was not panelled). The cards layout is an agenda; otherwise two
 *  titled sections become a two-column block, one a lead line over its list, three and more a
 *  cards block with a list per card; an untitled section is a list, a paragraph, or the closing
 *  callout where it comes last. */
export function regularAsContent(slide: RegularSlide): ContentSlide | AgendaSlide | undefined {
  if (slide.layout === "cards")
    return {
      type: "agenda",
      headline: slide.headline,
      items: slide.sections.map((s) => ({
        title: s.title ?? sectionText(s) ?? "",
        text: s.title ? (sectionText(s) ?? s.items?.join(", ")) : undefined,
      })),
    };
  if (slide.profile) return;
  const titled = slide.sections.filter((s) => s.title);
  const grouped: ContentBlock[] =
    titled.length >= 3
      ? [
          {
            type: "cards",
            items: titled.map((s) => ({
              title: s.title,
              text: sectionText(s),
              icon: s.icon,
              items: s.items,
            })),
            // Five and six sections stand in three columns, so a column never narrows to a quarter.
            columns: titled.length === 4 || titled.length > 6 ? 4 : 3,
            dense: true,
          },
        ]
      : titled.length === 2
        ? [
            {
              type: "two-column",
              variant: "neutral",
              left: {
                title: titled[0].title,
                items: titled[0].items,
                text: sectionText(titled[0]),
              },
              right: {
                title: titled[1].title,
                items: titled[1].items,
                text: sectionText(titled[1]),
              },
            },
          ]
        : titled.flatMap((s): ContentBlock[] => [
            { type: "paragraph", text: `**${s.title}**${s.text ? ` ${sectionText(s)}` : ""}` },
            ...(s.items ? [{ type: "bullets" as const, items: s.items }] : []),
          ]);
  const content: ContentBlock[] = [];
  slide.sections.forEach((s, i) => {
    if (s.title) {
      if (s === titled[0]) content.push(...grouped);
      return;
    }
    const text = sectionText(s);
    if (text)
      content.push(
        i === slide.sections.length - 1 && i > 0
          ? { type: "callout", text }
          : { type: "paragraph", text },
      );
    if (s.items) content.push({ type: "bullets", items: s.items });
  });
  return { type: "content", headline: slide.headline, content };
}
