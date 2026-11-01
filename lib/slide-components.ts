import { TitleSlide } from "../components/slides/TitleSlide";
import { ContentSlide } from "../components/slides/ContentSlide";
import { RegularSlide } from "../components/slides/RegularSlide";
import { StatementSlide } from "../components/slides/StatementSlide";
import { GridSlide } from "../components/slides/GridSlide";
import { ComparisonSlide } from "../components/slides/ComparisonSlide";
import { GuidanceSlide } from "../components/slides/GuidanceSlide";
import { MediaSlide } from "../components/slides/MediaSlide";
import { ProfilesSlide } from "../components/slides/ProfilesSlide";
import { PhasedPillsSlide } from "../components/slides/PhasedPillsSlide";
import { OverviewSlide } from "../components/slides/OverviewSlide";
import { ProcessSlide } from "../components/slides/ProcessSlide";
import { LanesSlide } from "../components/slides/LanesSlide";
import { ChartSlide } from "../components/slides/ChartSlide";
import { QuestionSlide } from "../components/slides/QuestionSlide";
import { TransitionSlide } from "../components/slides/TransitionSlide";
import { ClosingSlide } from "../components/slides/ClosingSlide";
import { RoadmapSlide } from "../components/slides/RoadmapSlide";
import { DeepDiveDivider } from "../components/slides/DeepDiveDivider";
import { GanttSlide } from "../components/slides/GanttSlide";
import { TeamTopologySlide } from "../components/slides/TeamTopologySlide";
import { AgendaSlide } from "../components/slides/AgendaSlide";
import { WheelSlide } from "../components/slides/WheelSlide";
import { DecisionSlide } from "../components/slides/DecisionSlide";
import { ActivitySlide } from "../components/slides/ActivitySlide";
import { createElement } from "react";
import type { DualPillOverviewSlide, EvolutionSlide, Slide } from "../types/slide";
import { dualPillAsRoadmap, evolutionAsProcess } from "./slide-utils";

type SlideComponent = React.ComponentType<{ slide: Slide }>;

/** Types that another type replaced and that still render, through it, until every deck has moved:
 *  the specimen shows the type that replaced them. */
export const aliasTypes: Partial<Record<Slide["type"], Slide["type"]>> = {
  evolution: "process",
  "dual-pill-overview": "roadmap",
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
