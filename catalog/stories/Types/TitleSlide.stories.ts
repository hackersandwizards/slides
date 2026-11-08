import { TitleSlide } from "../../../components/slides/TitleSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(TitleSlide) };

export const Specimen = state("title", 0, "TitleSlide");
export const Specimen2 = state("title", 1, "TitleSlide");
export const Opening = state("title", 2, "TitleSlide");
export const Opening_German = state("title", 3, "TitleSlide");
