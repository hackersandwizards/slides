import { bulletsAsStatement, centeredAsStatement, twoColumnAsSplit } from "./content-redraw";
import { mediaAsContent } from "./gallery-media";
import { regularAsContent } from "./regular-sections";
import type {
  ClosingSlide,
  ContentBlock,
  ContentSlide,
  Presentation,
  Slide,
  TitleSlide,
} from "../types/slide";

const unnamedLang = new WeakSet<Presentation>();

/** The language a deck names, on itself or on the first title slide that sets one. */
export const namedLang = (deck: Presentation) =>
  deck.lang ??
  deck.slides.find((slide): slide is TitleSlide => slide.type === "title" && !!slide.lang)?.lang;

/** The deck's language, for the `lang` of the page and the file that show it: the deck's own
 *  `lang`, else the first title slide's that sets one, else English, with a warning once per deck
 *  outside a browser, so a German deck missing it shows in the build log rather than as English
 *  pages. */
export function deckLang(deck: Presentation): "en" | "de" {
  const lang = namedLang(deck);
  if (lang) return lang;
  if (typeof document === "undefined" && !unnamedLang.has(deck)) {
    unnamedLang.add(deck);
    console.warn(
      `deck "${deck.name}": neither the deck nor a title slide names its lang, so it is set as English`,
    );
  }
  return "en";
}

/** A deck page's document title, the deck's name and the slide's number. */
export const slideTitle = (deck: Presentation, index: number) => `${deck.name} - ${index + 1}`;

/** The language of the claim a contact closing shows, or undefined for none: `claim: false` or a
 *  discussion leaves it out, and a deprecated `claim` language wins over the deck's. */
export const closingClaim = (slide: ClosingSlide, lang: "en" | "de") => {
  if (slide.variant === "discussion" || slide.claim === false) return undefined;
  return slide.claim === "en" || slide.claim === "de" ? slide.claim : lang;
};

type SlideOf<T extends Slide["type"]> = Extract<Slide, { type: T }>;
type Replacement = { to: string; form?: string };

const REPLACED_BLOCK_TO: Partial<Record<ContentBlock["type"], string>> = {
  "four-column": "cards",
  "labeled-grid": "cards",
  positions: "comparison positions",
  transform: "comparison before-after",
};

function contentReplacedBy(slide: ContentSlide): Replacement | undefined {
  if (centeredAsStatement(slide)) return { to: "statement", form: "content, centered" };
  if (bulletsAsStatement(slide)) return { to: "statement", form: "one or two short bullets" };
  if (twoColumnAsSplit(slide))
    return { to: "comparison split", form: "two-column, neutral, alone on a slide" };
  for (const { type } of slide.content) {
    if (typeof type !== "string" || !Object.hasOwn(REPLACED_BLOCK_TO, type)) continue;
    const to = REPLACED_BLOCK_TO[type];
    if (to) return { to, form: type };
  }
  return slide.content.some((b) => b.type === "pipeline")
    ? { to: "flow", form: "pipeline" }
    : undefined;
}

const SLIDE_REPLACEMENTS: {
  [T in Slide["type"]]: string | ((slide: SlideOf<T>) => Replacement | undefined) | undefined;
} = {
  evolution: "process",
  "dual-pill-overview": "roadmap",
  guidance: "comparison guidance",
  "deep-dive-divider": "transition night",
  overview: "phased-pills",
  media: (slide) => {
    const to = mediaAsContent(slide).content[0].type;
    return to === "gallery" ? { to } : { to, form: `media, one ${to}` };
  },
  regular: (slide) => {
    const to = regularAsContent(slide);
    if (!to) return undefined;
    if (to.type === "agenda") return { to: "agenda" };
    return { to: twoColumnAsSplit(to) ? "comparison split" : "content" };
  },
  grid: (slide) =>
    slide.variant === "quotes"
      ? undefined
      : { to: slide.variant === "stats" ? "numbers" : "cards" },
  content: contentReplacedBy,
  activity: undefined,
  agenda: undefined,
  chart: undefined,
  closing: undefined,
  comparison: undefined,
  decision: undefined,
  gantt: undefined,
  lanes: undefined,
  "phased-pills": undefined,
  process: undefined,
  profiles: undefined,
  question: undefined,
  roadmap: undefined,
  statement: undefined,
  "team-topology": undefined,
  title: undefined,
  transition: undefined,
  wheel: undefined,
};

/** The entry that draws a deprecated form, or undefined for a form the catalogue offers: an alias
 *  type, `regular` without a profile, a `grid` other than quotes, a centered content slide a
 *  statement carries, one holding only one or two short bullets, a content slide holding a
 *  replaced block, and one whose one block is a neutral two-column. `form` names a content
 *  slide's replaced form. */
export function replacedBy(slide: Slide): { to: string; form?: string } | undefined {
  const type = slide.type;
  if (typeof type !== "string" || !Object.hasOwn(SLIDE_REPLACEMENTS, type)) return;
  const entry = SLIDE_REPLACEMENTS[type];
  if (typeof entry === "string") return { to: entry };
  return (entry as ((input: Slide) => Replacement | undefined) | undefined)?.(slide);
}
