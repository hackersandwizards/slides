import { ChartSlide } from "../../../components/slides/ChartSlide";
import { state } from "../../state";

export default { component: ChartSlide };

export const Cycle = state("chart", 0, "ChartSlide");
export const Graph = state("chart", 1, "ChartSlide");
export const Trend = state("chart", 2, "ChartSlide");
export const Bar = state("chart", 3, "ChartSlide");
