"use client";

import type { DualPillOverviewSlide as DualPillOverviewType } from "../../types/slide";
import { RoadmapSlide } from "./RoadmapSlide";

// The roadmap layout with one group per phase (os decision roadmap-dual-pill-slides).
export function DualPillOverview({ slide }: { slide: DualPillOverviewType }) {
  return <RoadmapSlide slide={slide} />;
}
