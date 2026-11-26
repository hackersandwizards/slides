import type { IconName } from "../lib/icons";
import type { SectionTheme, Grounded } from "./slide-theme";

export type StageState = "default" | "active" | "new";

export interface Stage {
  title: string;
  description: string;
  state?: StageState;
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
 *  engine still renders it, through `evolutionAsProcess` in `lib/slide-aliases.ts`. */
export interface EvolutionSlide extends Grounded {
  type: "evolution";
  sectionLabel?: string;
  headline: string;
  stages: EvolutionStage[];
  static?: boolean;
  footer?: string;
}
export interface PillItem {
  /** Drawn as "#3" before the title; left out, the pill shows its title only. */
  number?: number;
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

/** @deprecated A `phased-pills` slide, which draws it (`overviewAsPhases` in
 *  `lib/slide-aliases.ts`): foundations and pipeline as two phases, a `new` stage as the active
 *  pill, and `active` stages and the frames' `foundationsActive` and `pipelineActive` draw plain.
 *  The stage descriptions, the lanes and the external ideate stage go. */
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
  icon?: IconName;
  /** Text in the step's tile instead of its icon or number, such as "10x"; where one label is
   *  longer than four characters, every label stands above its title. */
  label?: string;
  /** A line between title and description, in the accent. */
  subtitle?: string;
  /** A line under the description, such as "You are here". */
  badge?: string;
  /** Greys the step out, for a stage left behind. */
  dimmed?: boolean;
  /** `false` leaves the step's tile empty and out of the count, so the steps around it number on:
   *  a party outside the process, or a slide whose steps the next slides number otherwise. */
  numbered?: false;
}

/** Steps on one line. A cycle by default, drawn with the loop back from the last step to the
 *  first; `loop: false` for stages that run once, such as a progression from 1x to 10x. */
export interface ProcessSlide extends Grounded {
  type: "process";
  sectionLabel?: string;
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
/** @deprecated A `roadmap` slide whose columns carry `phases`, which draws it the same way:
 *  `left` and `right` are its two `columns`. The engine still renders it, through
 *  `dualPillAsRoadmap` in `lib/slide-aliases.ts`. */
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
  /** The label of the milestone row. Without one the engine's word for it in the deck's
   *  language (`WORDS`). */
  milestonesLabel?: string;
  footer?: string;
}

// Team Topologies' visual grammar: stream-aligned teams as horizontal bars, platform teams
// underneath them, enabling teams as vertical bars beside them, complicated-subsystem teams as
// their own blocks the stream teams consume.
