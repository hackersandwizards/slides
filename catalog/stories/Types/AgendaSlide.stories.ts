import { AgendaSlide } from "../../../components/slides/AgendaSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(AgendaSlide) };

export const Specimen = state("agenda", 0, "AgendaSlide");
export const Specimen2 = state("agenda", 1, "AgendaSlide");
export const Specimen3 = state("agenda", 2, "AgendaSlide");
export const Specimen4 = state("agenda", 3, "AgendaSlide");
