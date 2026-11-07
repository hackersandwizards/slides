"use client";

import type { OverviewSlide as OverviewSlideType } from "../../types/slide";
import { overviewAsPhases } from "../../lib/slide-utils";
import { PhasedPillsSlide } from "./PhasedPillsSlide";

/** @deprecated Renders as the phased-pills slide that replaces it (`overviewAsPhases`). */
export function OverviewSlide({ slide }: { slide: OverviewSlideType }) {
  return <PhasedPillsSlide slide={overviewAsPhases(slide)} />;
}
