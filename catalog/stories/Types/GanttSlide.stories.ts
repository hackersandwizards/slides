import { GanttSlide } from "../../../components/slides/GanttSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(GanttSlide) };

export const Plan = state("gantt", 0, "GanttSlide");
export const Specimen = state("gantt", 1, "GanttSlide");
