import { WheelSlide } from "../../../components/slides/WheelSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(WheelSlide) };

export const Specimen = state("wheel", 0, "WheelSlide");
export const Specimen2 = state("wheel", 1, "WheelSlide");
