import type { Presentation } from "../types/slide";
import { cardAndFigureSlides, largeFigureSlides } from "./slides/cards-and-figures";
import { chartSlides } from "./slides/chart-slides";
import { comparisonAndGuidanceSlides, decisionSlides } from "./slides/comparison-slides";
import {
  diagramBlockSlides,
  timelineExamples,
  connectionsBarSlide,
  continuedTimelineSlide,
} from "./slides/content-diagrams";
import {
  contentLayoutSlides,
  kickerLayoutSlides,
  proseLayoutSlides,
} from "./slides/content-layouts";
import {
  mediaBlockSlides,
  galleryAndImageSlides,
  imageStepsSlide,
  profileLinksSlide,
  mediaSlides,
} from "./slides/content-media";
import {
  profileAndStatementSlides,
  gridSlides,
  profileSlides,
  releaseQuoteSlide,
  quotationAndTitleSlides,
} from "./slides/editorial-slides";
import { stepSlides, workflowSlides, programmeGantt } from "./slides/process-slides";
import {
  structuredContentSlides,
  centredTerminalSlide,
  revealedTableSlide,
} from "./slides/tables-and-code";
import { openingSlides, activitiesAndDividers, closingSlides } from "./slides/talk-structure";
import { teamStructureSlides } from "./slides/team-slides";

export { specimenImages } from "./images";

export const slideCatalog: Presentation = {
  name: "Slide Catalog",
  confidential: "Specimen deck, fictional content",
  subtitle: "Every slide type and its variants",
  speakers: ["hackers&wizards"],
  slides: [
    ...openingSlides,
    ...contentLayoutSlides,
    ...structuredContentSlides,
    ...mediaBlockSlides,
    ...diagramBlockSlides,
    ...cardAndFigureSlides,
    ...profileAndStatementSlides,
    ...stepSlides,
    ...gridSlides,
    ...comparisonAndGuidanceSlides,
    ...mediaSlides,
    ...profileSlides,
    ...workflowSlides,
    ...chartSlides,
    ...activitiesAndDividers,
    programmeGantt,
    ...teamStructureSlides,
    ...decisionSlides,
    ...closingSlides,
    ...kickerLayoutSlides,
    ...proseLayoutSlides,
    ...timelineExamples,
    ...galleryAndImageSlides,
    connectionsBarSlide,
    releaseQuoteSlide,
    centredTerminalSlide,
    continuedTimelineSlide,
    ...quotationAndTitleSlides,
    ...largeFigureSlides,
    revealedTableSlide,
    imageStepsSlide,
    profileLinksSlide,
  ],
};

/** A proposal: the same slides in the engine's brand dark theme, on the website's night tokens.
 *  On no live deck. */
export const slideCatalogBrandDark: Presentation = {
  ...slideCatalog,
  name: "Slide Catalog, brand dark (proposal)",
  theme: "brand-dark",
};
