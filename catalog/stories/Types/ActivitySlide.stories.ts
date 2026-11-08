import { ActivitySlide } from "../../../components/slides/ActivitySlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(ActivitySlide) };

export const Specimen = state("activity", 0, "ActivitySlide");
export const Specimen2 = state("activity", 1, "ActivitySlide");
export const Specimen3 = state("activity", 2, "ActivitySlide");
