import { DecisionSlide } from "../../../components/slides/DecisionSlide";
import { state } from "../../state";

export default { component: DecisionSlide };

export const Specimen = state("decision", 0, "DecisionSlide");
export const Specimen2 = state("decision", 1, "DecisionSlide");
