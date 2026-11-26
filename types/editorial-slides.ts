import type { Grounded } from "./slide-theme";

/** A title, or a talk's opening where any of `kicker`, `name`, `speakers`, `event` or `qr` is
 *  set: left-aligned, the title the largest line, speakers and event along the bottom. */
export interface TitleSlide {
  type: "title";
  /** The largest line: the talk's title or its claim. */
  title: string;
  subtitle?: string;
  /** Above the title in the heading face: what the talk is about by name, such as a product. */
  name?: string;
  /** The caps label above the name, or above the title where there is no name. */
  kicker?: string;
  /** Who speaks, under the title. */
  speakers?: string[];
  /** Where and when, one quiet line under the speakers. */
  event?: string;
  /** A QR code and the link it encodes, small in the lower right, the link spelled out under it. */
  qr?: { src: string; href: string };
  /** The slide's language, else the deck's: it joins `speakers` ("A and B", "A und B") and words
   *  the QR code's alt text. The first title slide's is the deck's (`deckLang`) where the deck names
   *  none: it marks the page and the .pptx. Where neither names one the deck is English and the
   *  build warns. */
  lang?: "en" | "de";
}
export interface StatementSlide extends Grounded {
  type: "statement";
  lines: string[];
  subtitle?: string;
  crossedOut?: string;
  highlighted?: string;
  points?: string[];
  closing?: string;
  /** `quote` sets the closing as an italic quotation in quote marks, for a line someone said;
   *  the default `plain` is the slide's own closing statement. */
  closingStyle?: "plain" | "quote";
  imageSrc?: string;
  imageAlt?: string;
  /** Who said it, such as "Name, Company": the slide becomes a quotation at the left edge, with
   *  `imageSrc` as the portrait beside it, or behind brand's quote rule without one. The words
   *  said are the `lines` and a `closing` with `closingStyle: "quote"`, and the name follows them;
   *  `subtitle`, `points` and a plain `closing` are the slide's own words, set after the name and
   *  outside the rule. */
  attribution?: string;
  /** The label above the lines, such as "Live demo". */
  kicker?: string;
  /** A screenshot under the lines, at most about half the slide wide, its link spelled out under
   *  it. */
  linkedImage?: { src: string; alt?: string; href?: string };
  /** A QR code and the link it encodes, on a white card beside the lines. A quotation
   *  (`attribution`) leaves it out. */
  qr?: { src: string; href: string };
  /** The one line under the slide, such as a source, as a content slide's footer. */
  footer?: string;
}
export interface Profile {
  name: string;
  title: string;
  company: string;
  imageSrc?: string;
  linkedIn?: string;
  bullets: string[];
}

export interface ProfilesSlide {
  type: "profiles";
  sectionLabel?: string;
  headline: string;
  profiles: Profile[];
  /** One line under the portraits, such as who else belongs to the group shown. */
  footer?: string;
}
export interface QuestionOption {
  label: string;
  text: string;
}

export interface QuestionSlide {
  type: "question";
  headline: string;
  storageKey: string;
  options: QuestionOption[];
}

export interface TransitionSlide extends Grounded {
  type: "transition";
  /** Stands on night, for the divider that opens a deep-dive part (the former
   *  `deep-dive-divider`); the label above the headline is `preText`. */
  night?: boolean;
  preText?: string;
  headline: string;
  subtitle?: string;
  speakerName?: string;
  speakerCompany?: string;
}

export interface ClosingSlide extends Grounded {
  type: "closing";
  variant?: "contact" | "discussion";
  line1?: string;
  speakers?: {
    name: string;
    contact?: string;
    company: string;
    imageSrc?: string;
    linkedIn?: string;
  }[];
  /** Partners' logos before the lockup of a contact closing without portraits, each followed by
   *  a ×, at the lockup's height; `width` and `height` are the file's. A speaker whose `company`
   *  names a partner prints no company line, since the logo shows it. */
  partners?: { company: string; src: string; alt?: string; width: number; height: number }[];
  /** A line someone said, in quote marks under the speakers. */
  closingQuote?: string;
  /** Brand's claim under the speakers of a contact closing (`verbal.json`), in the deck's language
   *  (`deckLang`) by default; `false` leaves it out. A language (`"en"`, `"de"`) is deprecated: it
   *  still sets the claim's language until the next major. */
  claim?: false | "en" | "de";
  seedQuestions?: string[];
  headline?: string;
}
/** @deprecated A `transition` slide with `night: true`, which draws it (`deepDiveAsTransition` in
 *  `lib/slide-aliases.ts`): `partLabel` and `kicker`, joined by " · ", are its `preText`. */
export interface DeepDiveDividerSlide {
  type: "deep-dive-divider";
  partLabel?: string;
  kicker?: string;
  headline: string;
  subtitle?: string;
}
/** One row of an agenda: a time, day or due date in the left column instead of the number, a
 *  title and an optional line under it, such as who owns a next step. Rows that share a `when`
 *  print it once. */
export interface AgendaItem {
  when?: string;
  title: string;
  text?: string;
}

/** The route through a talk as numbered items; with `when` on its items a schedule ("09:00",
 *  "Tag 2") or the next steps that close a pitch ("bis 15.11.", the owner as `text`). */
export interface AgendaSlide {
  type: "agenda";
  headline: string;
  items: (string | AgendaItem)[];
  /** The one line under the list, such as the decision the next steps need. */
  footer?: string;
}

/** The room works instead of the slides: an exercise, a live demo or a debrief. */
export interface ActivitySlide {
  type: "activity";
  kind: "exercise" | "demo" | "debrief";
  /** The label above the headline; by kind "Hands-on", "Live demo" or "Debrief". */
  label?: string;
  headline: string;
  /** The setup in one or two sentences, under the headline. */
  task?: string;
  /** The exact instruction the room or the agent gets, set apart above the items. */
  prompt?: string;
  /** An exercise's steps, a demo's watch points, a debrief's questions. */
  items: string[];
  /** The timebox, such as "20 min". */
  duration?: string;
  /** Who works with whom, such as "In pairs". */
  mode?: string;
  /** What comes out, such as "A SKILL.md the agent picks up". */
  outcome?: string;
}
