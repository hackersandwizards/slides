import { QuestionSlide } from "../../../components/slides/QuestionSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(QuestionSlide) };

export const Specimen = state("question", 0, "QuestionSlide");
