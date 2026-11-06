"use client";

import type { DeepDiveDividerSlide as DeepDiveDividerSlideType } from "../../types/slide";
import { deepDiveAsTransition } from "../../lib/slide-utils";
import { TransitionSlide } from "./TransitionSlide";

/** The deprecated deep-dive divider, drawn as the night transition that replaces it. */
export function DeepDiveDivider({ slide }: { slide: DeepDiveDividerSlideType }) {
  return <TransitionSlide slide={deepDiveAsTransition(slide)} />;
}
