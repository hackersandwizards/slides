import { GridSlide } from "../../../components/slides/GridSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(GridSlide) };

export const ReplacedByCards = state("grid", 0, "GridSlide");
export const ReplacedByCards2 = state("grid", 1, "GridSlide");
export const ReplacedByNumbers = state("grid", 2, "GridSlide");
export const Quotes = state("grid", 3, "GridSlide");
export const QuotesWithPortraits = state("grid", 4, "GridSlide");
export const ReplacedByCards3 = state("grid", 5, "GridSlide");
