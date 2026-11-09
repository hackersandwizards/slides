import { DecisionSlide } from "../../../components/slides/DecisionSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(DecisionSlide) };

export const Specimen = state("decision", 0, "DecisionSlide");
export const Specimen2 = state("decision", 1, "DecisionSlide");
export const Specimen3 = state("decision", 2, "DecisionSlide");
