import { MediaSlide } from "../../../components/slides/MediaSlide";
import { state } from "../../state";

export default { component: MediaSlide };

export const Media = state("media", 0, "MediaSlide");
export const Specimen = state("media", 1, "MediaSlide");
export const Specimen2 = state("media", 2, "MediaSlide");
export const Specimen3 = state("media", 3, "MediaSlide");
export const Specimen4 = state("media", 4, "MediaSlide");
