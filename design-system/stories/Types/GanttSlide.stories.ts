import { GanttSlide } from "../../../components/slides/GanttSlide";
import { state } from "../../state";

export default { component: GanttSlide };

export const Plan = state("gantt", 0, "GanttSlide");
export const Specimen = state("gantt", 1, "GanttSlide");
