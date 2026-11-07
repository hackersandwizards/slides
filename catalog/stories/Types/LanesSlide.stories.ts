import { StorySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: StorySlide };

export const Lanes = state("lanes", 0, "LanesSlide");
export const Specimen = state("lanes", 1, "LanesSlide");
export const Specimen2 = state("lanes", 2, "LanesSlide");
