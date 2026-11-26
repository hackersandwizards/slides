import type { ContentSlide, RegularSlide, MediaSlide } from "./content-slide";
import type {
  TitleSlide,
  StatementSlide,
  ProfilesSlide,
  QuestionSlide,
  TransitionSlide,
  ClosingSlide,
  DeepDiveDividerSlide,
  AgendaSlide,
  ActivitySlide,
} from "./editorial-slides";
import type { GridSlide, ComparisonSlide, GuidanceSlide } from "./comparison-slides";
import type {
  EvolutionSlide,
  PhasedPillsSlide,
  OverviewSlide,
  ProcessSlide,
  LanesSlide,
  RoadmapSlide,
  DualPillOverviewSlide,
  GanttSlide,
} from "./planning-slides";
import type { ChartSlide, TeamTopologySlide, WheelSlide, DecisionSlide } from "./diagram-slides";

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
  /** The deck's language (`deckLang`), ahead of its title slide's: for a deck with no title slide. */
  lang?: "en" | "de";
  subtitle?: string;
  date?: string;
  speakers?: string[];
  theme?: "brand-dark";
  confidential?: string;
  logo?: LogoConfig;
  // Per-slide logo override. An explicit `null` forces the default h&w logo on
  // that slide (overriding `logo`); an absent index falls back to `logo`.
  slideLogos?: Record<number, SlideLogo>;
  slides: Slide[];
}

export type LogoConfig = { src: string; alt: string; width?: number; height?: number };
export type SlideLogo = LogoConfig | LogoConfig[] | null;
