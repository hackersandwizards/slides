export type SectionTheme = "primary" | "secondary" | "accent" | "warning" | "success" | "deepdive";

/** A slide's ground: the brand page, or the page tinted 7% towards a section's hue. */
export type SlideGround = "intro" | "primary" | "secondary" | "accent" | "success";

/** The ground of a slide type that may stand on a section's tint. */
export interface Grounded {
  ground?: SlideGround;
  /** @deprecated `ground`: `bg-section-accent` is `ground: "accent"`. Read until every deck has
   *  moved; any other class draws the plain page. */
  background?: `bg-section-${SlideGround}`;
}

export type StageState = "default" | "active" | "new";

export interface Stage {
  title: string;
  description: string;
  state?: StageState;
}

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
  /** The deck's language (`deckLang`), which joins `speakers` ("A and B", "A und B"), words the QR
   *  code's alt text and marks the page and the .pptx. Without it the speakers are joined with " & ". */
  lang?: "en" | "de";
}

export type ContentBlock =
  | { type: "paragraph"; text: string; centered?: boolean }
  | {
      type: "bullets";
      items: (string | { text: string; children: string[] })[];
      /** Numbers the top-level items, for steps that happen in order. */
      ordered?: boolean;
    }
  | {
      type: "table";
      headers?: string[];
      rows: string[][];
      compact?: boolean;
      /** Relative column widths. A table split across two slides sets the same on both halves,
       *  so its columns start at the same place on each. */
      widths?: number[];
    }
  | {
      type: "two-column";
      variant?:
        "success-error" | "error-success" | "error" | "error-neutral" | "success" | "neutral";
      left: { title?: string; items?: string[]; text?: string };
      right: { title?: string; items?: string[]; text?: string };
    }
  | { type: "code"; language: string; code: string }
  | {
      type: "code-and-text";
      language?: string;
      code: string;
      sections: { title: string; text: string }[];
    }
  | { type: "hooks"; items: { name: string; description: string }[] }
  | {
      /** @deprecated A `flow` block, which draws it: the container is its `frame`, the first new
       *  or active stage its `highlight`. A pipeline with a stage logo or `showLoops` keeps its own
       *  drawing, which flow cannot carry. */
      type: "pipeline";
      stages: { title: string; state?: StageState; logo?: string }[];
      showLoops?: boolean;
      showArrows?: boolean;
      containerLabel?: string;
      containerLogos?: { src: string; alt: string }[];
      containerFooter?: string;
      containerSideNotes?: string[];
    }
  | { type: "image"; src: string; alt?: string }
  | {
      type: "video";
      src: string;
      alt?: string;
      caption?: string;
      /** The frame shown before the video plays and in the PDF and PPTX export. */
      poster?: string;
    }
  | {
      /** @deprecated A `cards` block with `columns: 4` and `items` per card, which draws it:
       *  `subtitle` is a card's `text`. */
      type: "four-column";
      columns: { title: string; subtitle?: string; items: string[] }[];
    }
  | {
      type: "callout";
      text: string;
      variant?: "info" | "warning" | "success";
      /** Spans the content width instead of fitting its text, so stacked callouts match. */
      fullWidth?: boolean;
    }
  | {
      /** @deprecated A `cards` block, which draws it: `subtitle` is a card's `text`, the
       *  `highlighted` item the block's `highlight`. */
      type: "labeled-grid";
      columns?: number;
      reveal?: boolean;
      items: { title: string; subtitle: string; highlighted?: boolean; fragment?: boolean }[];
    }
  | { type: "terminal"; commands: { prefix: string; text: string }[] }
  | { type: "linked-image"; src: string; alt?: string; href?: string }
  | {
      type: "image-and-grid";
      /** `sketch`: a drawing on a transparent or plain ground, such as a marker sketch, which
       *  stands without a frame. A screenshot or photo, which needs an edge, leaves it out. */
      image: { src: string; alt?: string; sketch?: boolean };
      gridTitle?: string;
      items: { title: string; subtitle: string }[];
    }
  | {
      /** @deprecated A `comparison` slide with `variant: "positions"`, which draws it the same
       *  way. */
      type: "positions";
      left: PositionSide;
      right: PositionSide;
      middle?: string;
      resolution: string;
    }
  | VisualBlock;

export interface FlowFrame {
  label?: string;
  logos?: { src: string; alt: string }[];
  notes?: string[];
  footer?: string;
}

/** The diagram vocabulary (`components/slides/Visuals.tsx`): a content block that draws one
 *  relationship instead of listing it. `highlight` is the index of the one element in the brand
 *  colour; every other element stays neutral. */
export type VisualBlock =
  | {
      type: "flow";
      steps: {
        title: string;
        text?: string;
        icon?: string;
        /** A step whose own name is a state, such as Red or Green in TDD, takes that colour. */
        tone?: "red" | "green";
        /** A line under the step, such as "You are here". */
        badge?: string;
      }[];
      highlight?: number;
      /** Label of an arrow from the last step back to the first. */
      loop?: string;
      /** A dashed frame round the steps: a label with logos above, notes beside, a footer. */
      frame?: FlowFrame;
      /** Small tiles and titles, at the height of the pipeline it replaces: for two flows on one
       *  slide or a flow with more beside it. */
      dense?: boolean;
    }
  | {
      type: "layers";
      layers: { title: string; text?: string }[];
      highlight?: number;
      /** Numbers the layers, for a stack read in order. */
      ordered?: boolean;
    }
  | {
      type: "timeline";
      events: {
        when?: string;
        title: string;
        text?: string;
        /** A label on the line that leads from the previous event to this one, such as the
         *  duration "2 weeks": `when` names a point in time, this the time between two. The first
         *  event's is not drawn, a continued timeline's run-in included. */
        segment?: string;
        /** A result in the figure face, such as "-90%". */
        figure?: string;
      }[];
      highlight?: number;
      /** Index of the last event that has happened, -1 for none; the line after it is dashed. */
      now?: number;
      /** Row labels, a table's column headers, set left of the stages: "Slot", "What", "Output". */
      labels?: { when?: string; title?: string; text?: string };
      /** A timeline split over slides: "out" on the first, "in" on the next, "both" between. The
       *  line runs in from the slide's edge before the first event or out after the last, and stands
       *  at one height on every such slide under a headline of the same height. */
      continues?: "in" | "out" | "both";
    }
  | {
      /** @deprecated Drawn as a comparison's `before-after` with `strike: false`. */
      type: "transform";
      before: { label: string; items: string[] };
      after: { label: string; items: string[] };
    }
  | {
      type: "bars";
      /** `from` makes a bar a range, drawn from `from` to `value` on the track: a forecast's low
       *  and high end. Its default display is "from–value". */
      bars: {
        label: string;
        value: number;
        from?: number;
        display?: string;
        highlight?: boolean;
      }[];
      /** The scale's full length, such as 100 for percentages: draws the track behind each bar. */
      max?: number;
      /** Bars sort largest first; "given" keeps the order they are listed in. */
      order?: "given";
      source?: string;
    }
  | {
      type: "numbers";
      /** Up to four figures stand in a row, more wrap (five and six in three columns, smaller and
       *  without the rule). `text` is a line under the label, such as what the figure means. */
      items: { value: string; label: string; text?: string }[];
      source?: string;
    }
  | {
      type: "annotated";
      src: string;
      alt?: string;
      /** The image's own width and height in pixels; the marks and the crop are placed by them. */
      size: [number, number];
      /** Shows only this band of the image, as fractions of its height, so its lines read larger. */
      crop?: { top: number; bottom: number; right?: number };
      /** y is the marked line's centre and h its height, as fractions of the image height. */
      notes: { y: number; h?: number; text: string }[];
    }
  | {
      /** Code set as text at the type floor, its lines that matter marked: a screenshot of code
       *  shrinks below legibility in a Meet window. */
      type: "annotated-code";
      code: string;
      /** A Shiki language (lib/code-highlight.tsx); plain text without one. */
      language?: string;
      /** line is 1-based in `code`. */
      notes: { line: number; text: string }[];
    }
  | {
      /** Parallel points as cards, each the item's own text under an icon, or a number where the
       *  items are steps or questions. `items` on a card is a list under its text. */
      type: "cards";
      items: { title?: string; text?: string; icon?: string; items?: string[] }[];
      numbered?: boolean;
      highlight?: number;
      /** The first card's number, where one set of numbered cards runs across two slides. */
      numberFrom?: number;
      /** Columns; by default three, two for four cards. */
      columns?: 1 | 2 | 3 | 4;
      /** Shows the cards one per arrow key instead of all on arrival. */
      reveal?: boolean;
      /** Draws the cards at the sizes of the `four-column` and `labeled-grid` blocks, the
       *  `regular` sections and the `grid` pillars they replace: no mark above a card without icon or number, a smaller
       *  title, the body in the muted card text. For cards carrying more text than a few words. */
      dense?: boolean;
    };

export interface ContentSlide extends Grounded {
  type: "content";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline: string;
  subtitle?: string;
  /** `centered` renders as a statement slide where its blocks fit one (`centeredAsStatement` in
   *  `lib/slide-utils.ts`): the section label as its kicker, up to two paragraphs or a paragraph
   *  and a callout as subtitle and closing, one linked image. */
  layout?: "default" | "centered";
  content: ContentBlock[];
  footer?: string;
  badge?: string;
  stageMarker?: string[];
  stagePrefix?: string;
}

export interface ContentSection {
  title?: string;
  items?: string[];
  text?: string;
  link?: { url: string; label: string };
  icon?: string;
}

export interface ProfileInfo {
  name: string;
  title: string;
  imageSrc?: string;
  linkedIn?: string;
}

/** Renders through the content blocks (`regularAsContent` in `lib/slide-utils.ts`): two titled
 *  sections as a two-column block, three and more as cards, an untitled last section as the
 *  callout, the cards layout as an agenda. With a `profile` it keeps its own drawing. */
export interface RegularSlide {
  type: "regular";
  headline: string;
  sections: ContentSection[];
  profile?: ProfileInfo;
  layout?: "default" | "cards";
  activeSection?: number;
  align?: "left" | "center";
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

export interface EvolutionStage {
  multiplier: string;
  title: string;
  subtitle: string;
  description: string;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  badge?: string;
}

/** @deprecated A `process` slide with `loop: false`, which draws it the same way: `multiplier`
 *  is a node's `label`, `isDimmed` its `dimmed`, `isHighlighted` names `highlightPhase`. The
 *  engine still renders it, through `evolutionAsProcess` in `lib/slide-utils.ts`. */
export interface EvolutionSlide extends Grounded {
  type: "evolution";
  headline: string;
  stages: EvolutionStage[];
  static?: boolean;
  footer?: string;
}

export type GridTone = "neutral" | "primary" | "secondary" | "accent" | "success";

export interface GridCard {
  title: string;
  description?: string;
  icon?: string;
  value?: string;
  label?: string;
  highlight?: boolean;
  /** The card's tone. The web drops it (merge-cards: colour comes from the role); only the
   *  PowerPoint export still draws it. */
  tone?: GridTone;
  /** @deprecated `tone`, under its old name; read until every deck has moved. */
  accentColor?: GridTone;
  imageSrc?: string;
  author?: string;
}

export interface GridSlide extends Grounded {
  type: "grid";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  headline: string;
  cards: GridCard[];
  /** `pillars` (the default) and `stats` are deprecated: the engine draws them as a content slide
   *  with a `cards` or `numbers` block, through `gridAsContent` in `lib/slide-utils.ts`; `quotes`
   *  stays. */
  variant?: "pillars" | "stats" | "quotes";
  columns?: 2 | 3 | 4;
  allActive?: boolean;
  /** The first pillar's number, where one set of pillars runs across two slides. */
  numberFrom?: number;
}

export interface ComparisonSide {
  label: string;
  items: string[];
  logo?: string;
  highlight?: string;
}

interface ComparisonBase {
  type: "comparison";
  headline?: string;
  punchline?: string;
  /** On a `vs` slide, the punchline waits for one more arrow key instead of showing on arrival. */
  revealPunchline?: boolean;
  footnotes?: string[];
}

/** Two sides: `vs` pros against cons, `before-after` the old against the new, `split` two lists. */
export interface ComparisonSidesSlide extends ComparisonBase {
  variant?: "vs" | "before-after" | "split";
  left: ComparisonSide;
  right: ComparisonSide;
  /** `before-after` only: `false` keeps the before side unstruck and without its cross, for a
   *  before that stays rather than goes ("Stays from stage 3"). */
  strike?: boolean;
}

/** Examples, each a bad and a good version, with an optional intro and points above them. */
export interface ComparisonGuidanceSlide extends ComparisonBase {
  variant: "guidance";
  intro?: string;
  points?: string[];
  examples: GuidanceExample[];
}

export interface PositionSide {
  name: string;
  stance: string;
  quote: string;
}

/** Two named stances with a quote each, and the resolution under them. */
export interface ComparisonPositionsSlide extends ComparisonBase {
  variant: "positions";
  left: PositionSide;
  right: PositionSide;
  middle?: string;
  resolution: string;
}

export type ComparisonSlide =
  ComparisonSidesSlide | ComparisonGuidanceSlide | ComparisonPositionsSlide;

export interface GuidanceExample {
  title: string;
  bad: string;
  good: string;
  language?: string;
}

/** @deprecated A `comparison` slide with `variant: "guidance"`, which draws it. The engine still
 *  renders it, through `guidanceAsComparison` in `lib/slide-utils.ts`. */
export interface GuidanceSlide {
  type: "guidance";
  headline?: string;
  intro?: string;
  points?: string[];
  examples: GuidanceExample[];
}

export interface MediaSlide {
  type: "media";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline?: string;
  layout?: "grid" | "row";
  tags?: string[];
  sources: {
    src: string;
    alt?: string;
    kind?: "image" | "video";
    caption?: string;
    height?: number;
  }[];
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
  headline: string;
  profiles: Profile[];
  /** One line under the portraits, such as who else belongs to the group shown. */
  footer?: string;
}

export interface PillItem {
  number: number;
  title: string;
  state?: StageState;
}

export interface PillPhase {
  label: string;
  theme?: SectionTheme;
  items: PillItem[];
}

export interface PhasedPillsSlide {
  type: "phased-pills";
  title?: string;
  phases: PillPhase[];
}

export interface OverviewSlide {
  type: "overview";
  foundationsActive?: boolean;
  pipelineActive?: boolean;
  foundations: Stage[];
  pipeline: Stage[];
  ideateExternal?: boolean;
  parallelLanes?: number;
}

export interface ProcessNode {
  title: string;
  description: string;
  icon?: string;
  /** Text in the step's tile instead of its icon or number, such as "10x"; where one label is
   *  longer than four characters, every label stands above its title. */
  label?: string;
  /** A line between title and description, in the accent. */
  subtitle?: string;
  /** A line under the description, such as "You are here". */
  badge?: string;
  /** Greys the step out, for a stage left behind. */
  dimmed?: boolean;
}

/** Steps on one line. A cycle by default, drawn with the loop back from the last step to the
 *  first; `loop: false` for stages that run once, such as a progression from 1x to 10x. */
export interface ProcessSlide extends Grounded {
  type: "process";
  headline: string;
  nodes: ProcessNode[];
  /** The title of the step that stays lit. */
  highlightPhase?: string;
  footer?: string;
  loop?: boolean;
  /** Opens with every step showing instead of revealing them one by one. */
  static?: boolean;
}

export interface PipelineLane {
  label: string;
  stages: string[];
}

export interface LanesSlide {
  type: "lanes";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline: string;
  codeSnippet?: { language: string; code: string };
  lanes: PipelineLane[];
  footer?: string;
}

export interface ChartSegment {
  label: string;
  percentage: number;
}

export interface ChartDataPoint {
  name: string;
  // The trend variant draws `value` as the primary line and, where the point
  // carries one, `value2` as a second line beside it.
  value: number;
  value2?: number;
}

export interface ChartSlide {
  type: "chart";
  headline?: string;
  variant: "cycle" | "graph" | "trend" | "bar";
  segments?: ChartSegment[];
  currentSegmentIndex?: number;
  data?: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
  currentMarker?: string;
  futureNote?: string;
  annotation?: string;
  // Legend labels for the trend variant's two series.
  seriesLabel?: string;
  series2Label?: string;
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
  /** A line someone said, in quote marks under the speakers. */
  closingQuote?: string;
  /** Brand's claim under the speakers of a contact closing (`verbal.json`), in the deck's language
   *  (`deckLang`) by default; `false` leaves it out. A language (`"en"`, `"de"`) is deprecated: it
   *  still sets the claim's language until the next major. */
  claim?: false | "en" | "de";
  seedQuestions?: string[];
  headline?: string;
}

export type MarkerTone = "primary" | "secondary" | "accent" | "success";

export interface RoadmapItem {
  title: string;
  description?: string;
  /** The marker's colour, where one row stands apart from its group's. */
  tone?: MarkerTone;
  /** @deprecated `tone`: `bg-accent` is `tone: "accent"`. Read until every deck has moved; any
   *  other class draws the group's colour. */
  dotColor?: `bg-${MarkerTone}`;
}

/** One of a roadmap's two parts: a list of `items`, or `phases`, groups of numbered rows under a
 *  caps label (the former dual-pill-overview). */
export interface RoadmapColumn {
  label: string;
  title: string;
  subtitle?: string;
  accent: "ingredients" | "deepdive";
  items?: RoadmapItem[];
  phases?: PillPhase[];
}

export interface RoadmapSlide {
  type: "roadmap";
  preText?: string;
  headline: string;
  subtitle?: string;
  columns: [RoadmapColumn, RoadmapColumn];
}

/** @deprecated A `transition` slide with `night: true`, which draws it (`deepDiveAsTransition` in
 *  `lib/slide-utils.ts`): `partLabel` and `kicker`, joined by " · ", are its `preText`. */
export interface DeepDiveDividerSlide {
  type: "deep-dive-divider";
  partLabel?: string;
  kicker?: string;
  headline: string;
  subtitle?: string;
}

/** @deprecated A `roadmap` slide whose columns carry `phases`, which draws it the same way:
 *  `left` and `right` are its two `columns`. The engine still renders it, through
 *  `dualPillAsRoadmap` in `lib/slide-utils.ts`. */
export interface DualPillOverviewSlide {
  type: "dual-pill-overview";
  preText?: string;
  headline: string;
  subtitle?: string;
  left: {
    label: string;
    title: string;
    subtitle?: string;
    accent: "ingredients" | "deepdive";
    phases: PillPhase[];
  };
  right: {
    label: string;
    title: string;
    subtitle?: string;
    accent: "ingredients" | "deepdive";
    phases: PillPhase[];
  };
}

export interface GanttBar {
  label: string;
  // 1-indexed column the bar starts in, and how many columns it spans.
  start: number;
  span: number;
  /** No longer colours the bar: every bar takes the one data hue. Kept so existing decks type-check. */
  theme?: SectionTheme;
  // Continuous work (a cadence, a standing team) renders lighter than a block
  // of work that starts and finishes.
  continuous?: boolean;
}

export interface GanttRow {
  label: string;
  sublabel?: string;
  bars: GanttBar[];
}

export interface GanttSlide {
  type: "gantt";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline: string;
  // Column headers, one per time unit. Bar `start` and `span` index into these.
  columns: string[];
  rows: GanttRow[];
  milestones?: { label: string; column: number }[];
  /** The label of the milestone row, in the deck's language. Without one the web says
   *  "Meilensteine" and slides-pptx "MILESTONES", as before the field existed. */
  milestonesLabel?: string;
  footer?: string;
}

// Team Topologies' visual grammar: stream-aligned teams as horizontal bars, platform teams
// underneath them, enabling teams as vertical bars beside them, complicated-subsystem teams as
// their own blocks the stream teams consume.
export interface TeamTopologySlide {
  type: "team-topology";
  headline: string;
  subtitle?: string;
  streamAligned: { name: string; roles: string[] }[];
  // `roles` are chips, e.g. "Factory Engineers, ca. 1 je Stream-Team"
  platform: { name: string; description?: string; roles?: string[] }[];
  // one enabling team per topic
  enabling: { name: string; experts: string[] }[];
  complicatedSubsystem?: { name: string; description?: string }[];
  caption?: string;
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

// Areas around a central disc: six in practice, four or five still lay out.
export interface WheelSlide {
  type: "wheel";
  headline: string;
  subtitle?: string;
  center: string;
  segments: { title: string; text: string }[];
  caption?: string;
}

export type DecisionTeam = "platform" | "enabling" | "complicated-subsystem";

export interface DecisionBranch {
  label: string;
  title: string;
  text: string;
  team: DecisionTeam;
}

// Where a stream team's need goes: need, question, a yes branch up and a no branch down, both
// joining on the outcome.
export interface DecisionSlide {
  type: "decision";
  headline: string;
  subtitle?: string;
  need: string;
  question: string;
  yes: DecisionBranch;
  no: DecisionBranch;
  outcome: string;
  caption?: string;
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

export type SlideBase = {
  notes?: string;
};

export type Slide = SlideBase &
  (
    | TitleSlide
    | ContentSlide
    | RegularSlide
    | StatementSlide
    | EvolutionSlide
    | GridSlide
    | ComparisonSlide
    | GuidanceSlide
    | MediaSlide
    | ProfilesSlide
    | PhasedPillsSlide
    | OverviewSlide
    | ProcessSlide
    | LanesSlide
    | ChartSlide
    | QuestionSlide
    | TransitionSlide
    | ClosingSlide
    | RoadmapSlide
    | DeepDiveDividerSlide
    | DualPillOverviewSlide
    | GanttSlide
    | TeamTopologySlide
    | AgendaSlide
    | WheelSlide
    | DecisionSlide
    | ActivitySlide
  );

export interface Presentation {
  name: string;
  subtitle?: string;
  date?: string;
  speakers?: string[];
  theme?: "brand-dark";
  logo?: LogoConfig;
  // Per-slide logo override. An explicit `null` forces the default h&w logo on
  // that slide (overriding `logo`); an absent index falls back to `logo`.
  slideLogos?: Record<number, SlideLogo>;
  slides: Slide[];
}

export type LogoConfig = { src: string; alt: string; width?: number; height?: number };
export type SlideLogo = LogoConfig | LogoConfig[] | null;
