"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSlideKeyboard } from "./use-slide-keyboard";
import { usePrintMode } from "./print-context";
import { useHydratedRevealArrival } from "./use-hydrated-reveal-arrival";
import { usePhone } from "./use-progressive-reveal";
import { directionKey } from "./slide-arrival";
import { writeStored } from "./browser-storage";

interface UseCarouselOptions {
  /** Number of steps; the index clamps to [min, count - 1]. */
  count: number;
  /** Lowest index. Use -1 for "nothing highlighted yet" carousels. Default 0. */
  min?: number;
  /** Starting index. Defaults to `min`. */
  initial?: number;
  /** When false, arrow keys are ignored. Default true; print and a phone take none either. */
  enabled?: boolean;
}

function useCarouselIndex(lastIndex: number, firstIndex: number, showArrival: boolean) {
  // A slide opening revealed opens at the last step, as a reveal slide does, after
  // hydration so the server markup still matches.
  const revealedIndex = showArrival ? lastIndex : null;
  const [previousRevealedIndex, setPreviousRevealedIndex] = useState(revealedIndex);
  const [index, setIndex] = useState(revealedIndex ?? firstIndex);
  if (revealedIndex !== previousRevealedIndex) {
    setPreviousRevealedIndex(revealedIndex);
    if (revealedIndex !== null) setIndex(revealedIndex);
  }
  return [index, setIndex] as const;
}

/**
 * Arrow-key stepper shared by the highlight / step-through slides. ArrowRight
 * advances toward `count - 1`, ArrowLeft retreats toward `min`. Each handler
 * returns true only when the index actually moved, so at the ends the key falls
 * through to SlideNavigation and the deck advances to the adjacent slide. The third
 * value, `stepped`, is false in print and on a phone, where every step shows and none
 * is the one a press reached: a slide highlights nothing then.
 */
export function useCarousel({
  count,
  min = 0,
  initial,
  enabled = true,
}: UseCarouselOptions): [number, Dispatch<SetStateAction<number>>, boolean] {
  const max = count - 1;
  const printMode = usePrintMode();
  const interactive = enabled && !printMode;
  const { arrivedRevealed, showArrival } = useHydratedRevealArrival(interactive);
  const [index, setIndex] = useCarouselIndex(max, initial ?? min, showArrival);
  // A phone shows the last step and lets Next change slides, as a reveal slide shows every step.
  const phone = usePhone() && interactive;
  const keys = interactive && !phone;
  useEffect(() => writeStored("session", directionKey(), null), [arrivedRevealed, max]);

  useSlideKeyboard({
    onRight: () => {
      if (index < max) {
        setIndex((prev) => Math.min(max, prev + 1));
        return true;
      }
      return false;
    },
    onLeft: () => {
      if (index > min) {
        setIndex((prev) => Math.max(min, prev - 1));
        return true;
      }
      return false;
    },
    enabled: keys,
    pending: index < max,
    undoable: index > min,
  });

  return [phone ? max : index, setIndex, keys];
}
