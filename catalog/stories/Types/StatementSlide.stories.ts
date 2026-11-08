import { StatementSlide } from "../../../components/slides/StatementSlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(StatementSlide) };

export const Specimen = state("statement", 0, "StatementSlide");
export const Specimen2 = state("statement", 1, "StatementSlide");
export const KickerAndLinkedImage = state("statement", 2, "StatementSlide");
export const QuotationAndFooter = state("statement", 3, "StatementSlide");
export const QrCode = state("statement", 4, "StatementSlide");
export const QuotationWithoutPortrait = state("statement", 5, "StatementSlide");
