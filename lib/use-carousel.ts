"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSlideKeyboard } from "./use-slide-keyboard";
import { usePrintMode } from "./print-context";
import { arrivedBackwards as readArrivedBackwards, directionKey, writeStored } from "./slide-utils";

interface UseCarouselOptions {
  /** Number of steps; the index clamps to [min, count - 1]. */
  count: number;
  /** Lowest index. Use -1 for "nothing highlighted yet" carousels. Default 0. */
  min?: number;
  /** Starting index. Defaults to `min`. */
  initial?: number;
  /** When false, arrow keys are ignored (e.g. print mode). Default true. */
  enabled?: boolean;
}

/**
 * Arrow-key stepper shared by the highlight / step-through slides. ArrowRight
 * advances toward `count - 1`, ArrowLeft retreats toward `min`. Each handler
 * returns true only when the index actually moved, so at the ends the key falls
 * through to SlideNavigation and the deck advances to the adjacent slide.
 */
export function useCarousel({
  count,
  min = 0,
  initial,
  enabled = true,
}: UseCarouselOptions): [number, Dispatch<SetStateAction<number>>] {
  const [index, setIndex] = useState(initial ?? min);
  const max = count - 1;
  // A backward arrival opens at the last step, as a reveal slide opens fully revealed, after
  // hydration so the server markup still matches.
  const printMode = usePrintMode();
  const [arrivedBackwards] = useState(() => enabled && !printMode && readArrivedBackwards());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount step above
    if (arrivedBackwards) setIndex(max);
    writeStored("session", directionKey(), null);
  }, [arrivedBackwards, max]);

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
    enabled,
    pending: index < max,
    undoable: index > min,
  });

  return [index, setIndex];
}
