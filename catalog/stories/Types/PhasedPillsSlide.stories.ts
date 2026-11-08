import { PhasedPillsSlide } from "../../../components/slides/PhasedPillsSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(PhasedPillsSlide) };

export const Specimen = state("phased-pills", 0, "PhasedPillsSlide");
