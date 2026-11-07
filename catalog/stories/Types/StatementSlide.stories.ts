import { StorySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: StorySlide };

export const Specimen = state("statement", 0, "StatementSlide");
export const Specimen2 = state("statement", 1, "StatementSlide");
export const KickerAndLinkedImage = state("statement", 2, "StatementSlide");
export const QuotationAndFooter = state("statement", 3, "StatementSlide");
export const SquareLinkedImage = state("statement", 4, "StatementSlide");
