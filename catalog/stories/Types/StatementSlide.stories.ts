import { StatementSlide } from "../../../components/slides/StatementSlide";
import { state } from "../../state";

export default { component: StatementSlide };

export const Specimen = state("statement", 0, "StatementSlide");
export const Specimen2 = state("statement", 1, "StatementSlide");
export const KickerAndLinkedImage = state("statement", 2, "StatementSlide");
