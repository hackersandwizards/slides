export type SectionTheme = "primary" | "secondary" | "accent" | "warning" | "success" | "deepdive";

export type StageState = "default" | "active" | "new";

export interface Stage {
  title: string;
  description: string;
  state?: StageState;
}

export interface TitleSlide {
  type: "title";
  title: string;
  subtitle?: string;
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
  | { type: "video"; src: string; alt?: string; caption?: string }
  | {
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
      type: "positions";
      left: {
        name: string;
        stance: string;
        quote: string;
      };
      right: {
        name: string;
        stance: string;
        quote: string;
      };
      middle?: string;
      resolution: string;
    }
  | VisualBlock;

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
      }[];
      highlight?: number;
      /** Label of an arrow from the last step back to the first. */
      loop?: string;
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
      events: { when?: string; title: string; text?: string }[];
      highlight?: number;
      /** Index of the last event that has happened; the line after it is dashed. */
      now?: number;
      /** Row labels, a table's column headers, set left of the stages: "Slot", "What", "Output". */
      labels?: { when?: string; title?: string; text?: string };
    }
  | {
      type: "transform";
      before: { label: string; items: string[] };
      after: { label: string; items: string[] };
    }
  | {
      type: "bars";
      bars: { label: string; value: number; display?: string; highlight?: boolean }[];
      /** The scale's full length, such as 100 for percentages: draws the track behind each bar. */
      max?: number;
      /** Bars sort largest first; "given" keeps the order they are listed in. */
      order?: "given";
      source?: string;
    }
  | {
      type: "numbers";
      items: { value: string; label: string }[];
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
       *  items are steps or questions. */
      type: "cards";
      items: { text: string; title?: string; icon?: string }[];
      numbered?: boolean;
    };

export interface ContentSlide {
  type: "content";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline: string;
  subtitle?: string;
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

export interface RegularSlide {
  type: "regular";
  headline: string;
  sections: ContentSection[];
  profile?: ProfileInfo;
  layout?: "default" | "cards";
  activeSection?: number;
  align?: "left" | "center";
}

export interface StatementSlide {
  type: "statement";
  background?: string;
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
  attribution?: string;
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

export interface EvolutionSlide {
  type: "evolution";
  background?: string;
  headline: string;
  stages: EvolutionStage[];
  static?: boolean;
  footer?: string;
}

export interface GridCard {
  title: string;
  description?: string;
  icon?: string;
  value?: string;
  label?: string;
  highlight?: boolean;
  accentColor?: "neutral" | "primary" | "secondary" | "accent" | "success";
  imageSrc?: string;
  author?: string;
}

export interface GridSlide {
  type: "grid";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  background?: string;
  headline: string;
  cards: GridCard[];
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

export interface ComparisonSlide {
  type: "comparison";
  headline?: string;
  variant?: "vs" | "before-after" | "split";
  left: ComparisonSide;
  right: ComparisonSide;
  punchline?: string;
  /** On a `vs` slide, the punchline waits for one more arrow key instead of showing on arrival. */
  revealPunchline?: boolean;
  footnotes?: string[];
}

export interface GuidanceExample {
  title: string;
  bad: string;
  good: string;
  language?: string;
}

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
}

export interface ProcessSlide {
  type: "process";
  background?: string;
  headline: string;
  nodes: ProcessNode[];
  highlightPhase?: string;
  footer?: string;
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

export interface TransitionSlide {
  type: "transition";
  preText?: string;
  background?: string;
  headline: string;
  subtitle?: string;
  speakerName?: string;
  speakerCompany?: string;
}

export interface ClosingSlide {
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
  closingQuote?: string;
  seedQuestions?: string[];
  headline?: string;
  background?: string;
}

export interface RoadmapItem {
  title: string;
  description?: string;
  dotColor?: string;
}

export interface RoadmapColumn {
  label: string;
  title: string;
  subtitle?: string;
  accent: "ingredients" | "deepdive";
  items: RoadmapItem[];
}

export interface RoadmapSlide {
  type: "roadmap";
  preText?: string;
  headline: string;
  subtitle?: string;
  columns: [RoadmapColumn, RoadmapColumn];
}

export interface DeepDiveDividerSlide {
  type: "deep-dive-divider";
  partLabel?: string;
  partNumber?: string;
  kicker?: string;
  headline: string;
  subtitle?: string;
}

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

export interface AgendaSlide {
  type: "agenda";
  headline: string;
  items: string[];
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
