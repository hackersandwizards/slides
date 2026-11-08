import { ClosingSlide } from "../../../components/slides/ClosingSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(ClosingSlide) };

export const Contact = state("closing", 0, "ClosingSlide");
export const Contact2 = state("closing", 1, "ClosingSlide");
export const Discussion = state("closing", 2, "ClosingSlide");
