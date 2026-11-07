import { StorySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: StorySlide };

export const Plan = state("gantt", 0, "GanttSlide");
export const Specimen = state("gantt", 1, "GanttSlide");
