import { TransitionSlide } from "../../../components/slides/TransitionSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(TransitionSlide) };

export const Specimen = state("transition", 0, "TransitionSlide");
export const Specimen2 = state("transition", 1, "TransitionSlide");
export const Night = state("transition", 2, "TransitionSlide");
