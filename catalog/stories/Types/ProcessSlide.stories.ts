import { ProcessSlide } from "../../../components/slides/ProcessSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(ProcessSlide) };

export const Specimen = state("process", 0, "ProcessSlide");
export const Specimen2 = state("process", 1, "ProcessSlide");
export const Specimen3 = state("process", 2, "ProcessSlide");
export const Specimen4 = state("process", 3, "ProcessSlide");
export const Specimen5 = state("process", 4, "ProcessSlide");
export const Specimen6 = state("process", 5, "ProcessSlide");
