import { ProfilesSlide } from "../../../components/slides/ProfilesSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(ProfilesSlide) };

export const Specimen = state("profiles", 0, "ProfilesSlide");
export const Specimen2 = state("profiles", 1, "ProfilesSlide");
