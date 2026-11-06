import { RegularSlide } from "../../../components/slides/RegularSlide";
import { state } from "../../state";

export default { component: RegularSlide };

export const Specimen = state("regular", 0, "RegularSlide");
export const ReplacedByAgenda = state("regular", 1, "RegularSlide");
export const ReplacedByContent = state("regular", 2, "RegularSlide");
