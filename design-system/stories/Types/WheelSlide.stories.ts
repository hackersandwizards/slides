import { WheelSlide } from "../../../components/slides/WheelSlide";
import { state } from "../../state";

export default { component: WheelSlide };

export const Specimen = state("wheel", 0, "WheelSlide");
export const Specimen2 = state("wheel", 1, "WheelSlide");
