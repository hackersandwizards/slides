import { TitleSlide } from "../components/slides/TitleSlide";
import { ContentSlide } from "../components/slides/ContentSlide";
import { RegularSlide } from "../components/slides/RegularSlide";
import { StatementSlide } from "../components/slides/StatementSlide";
import { EvolutionSlide } from "../components/slides/EvolutionSlide";
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
import { DualPillOverview } from "../components/slides/DualPillOverview";
import { GanttSlide } from "../components/slides/GanttSlide";
import { TeamTopologySlide } from "../components/slides/TeamTopologySlide";
import { AgendaSlide } from "../components/slides/AgendaSlide";
import { WheelSlide } from "../components/slides/WheelSlide";
import { DecisionSlide } from "../components/slides/DecisionSlide";
import type { Slide } from "../types/slide";

type SlideComponent = React.ComponentType<{ slide: Slide }>;

export const slideComponents: Record<Slide["type"], SlideComponent> = {
  title: TitleSlide as SlideComponent,
  content: ContentSlide as SlideComponent,
  regular: RegularSlide as SlideComponent,
  statement: StatementSlide as SlideComponent,
  evolution: EvolutionSlide as SlideComponent,
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
  "dual-pill-overview": DualPillOverview as SlideComponent,
  gantt: GanttSlide as SlideComponent,
  "team-topology": TeamTopologySlide as SlideComponent,
  agenda: AgendaSlide as SlideComponent,
  wheel: WheelSlide as SlideComponent,
  decision: DecisionSlide as SlideComponent,
};
