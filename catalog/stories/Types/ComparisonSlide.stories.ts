import { ComparisonSlide } from "../../../components/slides/ComparisonSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(ComparisonSlide) };

export const Vs = state("comparison", 0, "ComparisonSlide");
export const BeforeAfter = state("comparison", 1, "ComparisonSlide");
export const Split = state("comparison", 2, "ComparisonSlide");
export const BeforeAfterWithoutStrike = state("comparison", 3, "ComparisonSlide");
export const BeforeAfterThatAdds = state("comparison", 4, "ComparisonSlide");
export const Guidance = state("comparison", 5, "ComparisonSlide");
export const Positions = state("comparison", 6, "ComparisonSlide");
