import { TitleSlide } from "./slides/TitleSlide";
import { ContentSlide } from "./slides/ContentSlide";
import { RegularSlide } from "./slides/RegularSlide";
import { StatementSlide } from "./slides/StatementSlide";
import { GridSlide } from "./slides/GridSlide";
import { ComparisonSlide } from "./slides/ComparisonSlide";
import { GuidanceSlide } from "./slides/GuidanceSlide";
import { MediaSlide } from "./slides/MediaSlide";
import { ProfilesSlide } from "./slides/ProfilesSlide";
import { PhasedPillsSlide } from "./slides/PhasedPillsSlide";
import { OverviewSlide } from "./slides/OverviewSlide";
import { ProcessSlide } from "./slides/ProcessSlide";
import { LanesSlide } from "./slides/LanesSlide";
import { ChartSlide } from "./slides/ChartSlide";
import { QuestionSlide } from "./slides/QuestionSlide";
import { TransitionSlide } from "./slides/TransitionSlide";
import { ClosingSlide } from "./slides/ClosingSlide";
import { RoadmapSlide } from "./slides/RoadmapSlide";
import { DeepDiveDivider } from "./slides/DeepDiveDivider";
import { GanttSlide } from "./slides/GanttSlide";
import { TeamTopologySlide } from "./slides/TeamTopologySlide";
import { AgendaSlide } from "./slides/AgendaSlide";
import { WheelSlide } from "./slides/WheelSlide";
import { DecisionSlide } from "./slides/DecisionSlide";
import { ActivitySlide } from "./slides/ActivitySlide";
import { createElement } from "react";
import type { DualPillOverviewSlide, EvolutionSlide, Slide } from "../types/slide";
import { dualPillAsRoadmap, evolutionAsProcess } from "../lib/slide-utils";

type SlideComponent = React.ComponentType<{ slide: Slide }>;

/** Types that another type replaced and that still render, through it, until every deck has moved:
 *  the specimen shows the type that replaced them. */
export const aliasTypes: Partial<Record<Slide["type"], Slide["type"]>> = {
  evolution: "process",
  "dual-pill-overview": "roadmap",
  guidance: "comparison",
  "deep-dive-divider": "transition",
  overview: "phased-pills",
  media: "content",
};

/** What a deck may still write but no longer should, read until the next major: `props` are
 *  deprecated whole, `values` the deprecated literals of a prop whose other values stay (`type`
 *  holds the alias types and the replaced block types, `variant` a grid's). For a consumer's story
 *  coverage, which shows each under the name that replaced it. */
export const deprecated = {
  props: ["background", "dotColor"],
  values: {
    type: [
      ...Object.keys(aliasTypes),
      "pipeline",
      "four-column",
      "labeled-grid",
      "positions",
      "transform",
    ],
    variant: ["pillars", "stats"],
    claim: ["en", "de"],
  },
};

export const slideComponents: Record<Slide["type"], SlideComponent> = {
  title: TitleSlide as SlideComponent,
  content: ContentSlide as SlideComponent,
  regular: RegularSlide as SlideComponent,
  statement: StatementSlide as SlideComponent,
  evolution: (({ slide }: { slide: EvolutionSlide }) =>
    createElement(ProcessSlide, { slide: evolutionAsProcess(slide) })) as SlideComponent,
  grid: GridSlide as SlideComponent,
  comparison: ComparisonSlide as SlideComponent,
  guidance: GuidanceSlide as SlideComponent,
  media: MediaSlide as SlideComponent,
  profiles: ProfilesSlide as SlideComponent,
  "phased-pills": PhasedPillsSlide as SlideComponent,
  overview: OverviewSlide as SlideComponent,
  process: ProcessSlide as SlideComponent,
  lanes: LanesSlide as SlideComponent,
  chart: ChartSlide as SlideComponent,
  question: QuestionSlide as SlideComponent,
  transition: TransitionSlide as SlideComponent,
  closing: ClosingSlide as SlideComponent,
  roadmap: RoadmapSlide as SlideComponent,
  "deep-dive-divider": DeepDiveDivider as SlideComponent,
  "dual-pill-overview": (({ slide }: { slide: DualPillOverviewSlide }) =>
    createElement(RoadmapSlide, { slide: dualPillAsRoadmap(slide) })) as SlideComponent,
  gantt: GanttSlide as SlideComponent,
  "team-topology": TeamTopologySlide as SlideComponent,
  agenda: AgendaSlide as SlideComponent,
  wheel: WheelSlide as SlideComponent,
  decision: DecisionSlide as SlideComponent,
  activity: ActivitySlide as SlideComponent,
};
