import { LanesSlide } from "../../../components/slides/LanesSlide";
import { state } from "../../state";

export default { component: LanesSlide };

export const Lanes = state("lanes", 0, "LanesSlide");
export const Specimen = state("lanes", 1, "LanesSlide");
export const Specimen2 = state("lanes", 2, "LanesSlide");
