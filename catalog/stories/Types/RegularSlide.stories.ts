import { StorySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: StorySlide };

export const Specimen = state("regular", 0, "RegularSlide");
export const ReplacedByAgenda = state("regular", 1, "RegularSlide");
export const ReplacedByContent = state("regular", 2, "RegularSlide");
