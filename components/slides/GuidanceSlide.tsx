"use client";

import type { GuidanceSlide as GuidanceSlideType } from "../../types/slide";
import { guidanceAsComparison } from "../../lib/slide-utils";
import { ComparisonSlide } from "./ComparisonSlide";

/** @deprecated The comparison slide's `guidance` variant, which this renders through. */
export function GuidanceSlide({ slide }: { slide: GuidanceSlideType }) {
  return <ComparisonSlide slide={guidanceAsComparison(slide)} />;
}
