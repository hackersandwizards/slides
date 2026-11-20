"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { NARROW, opensRevealed, directionKey, ignoredKey, writeStored } from "./slide-utils";
import { usePrintMode } from "./print-context";
import { useMounted } from "./use-mounted";
import { deckSync } from "./presenter-sync";
import { useReportPendingReveal } from "./reveal-state";

export { hasPendingReveal, usePendingReveal, useReportPendingReveal } from "./reveal-state";

/** A reveal hook's two moves, each true where it took the press. */
interface Stepper {
  forward: () => boolean;
  back: () => boolean;
}

// Every listening reveal hook on the page, in mount order, which is the order of its blocks on the
// slide. One listener serves them all: ArrowRight goes to the first that can still reveal, and
// ArrowLeft to the last that can still take back, so two reveal blocks on one slide step one after
// the other instead of together.
const steppers: Stepper[] = [];

function stepReveal(event: KeyboardEvent) {
  if (ignoredKey(event)) return;
  const right = event.key === "ArrowRight";
  if (!right && event.key !== "ArrowLeft") return;
  const order = right ? steppers : [...steppers].reverse();
  if (order.some((stepper) => (right ? stepper.forward() : stepper.back()))) {
    event.preventDefault();
    event.stopPropagation();
  }
}

const narrowQuery = () => window.matchMedia?.(NARROW);
// A window of a presented talk is no phone, whatever its width: the windows replay each other's
// presses on their own copies of a slide, so a copy that did not step would send the others back.
const isPhone = () =>
  !!narrowQuery()?.matches && deckSync.role() === "audience" && !deckSync.speakerOpen();
const subscribePhone = (listener: () => void) => {
  const query = narrowQuery();
  query?.addEventListener("change", listener);
  const leave = deckSync.subscribe(listener);
  return () => {
    query?.removeEventListener("change", listener);
    leave();
  };
};

/** True on a phone, where the reader scrolls a one-column slide and Next moves to the next slide:
 *  every step shows at once and the arrows never step. */
export const usePhone = () => useSyncExternalStore(subscribePhone, isPhone, () => false);

interface UseProgressiveRevealOptions {
  totalSteps: number;
  startFull?: boolean;
  hasFooter?: boolean;
}

interface UseProgressiveRevealResult {
  revealedCount: number;
  footerVisible: boolean;
  /** True once the presenter's arrow press revealed the newest step, so a slide may light the
   *  step just revealed, the last one included. False when the slide opens fully revealed (print,
   *  `startFull`, a backward arrival, `?revealed`), which shows every step neutral. */
  stepped: boolean;
}

export function useProgressiveReveal({
  totalSteps,
  startFull = false,
  hasFooter = false,
}: UseProgressiveRevealOptions): UseProgressiveRevealResult {
  const printMode = usePrintMode();
  const full = printMode || startFull;
  // Read during render, applied after mount: the server cannot see sessionStorage and renders the
  // slide unrevealed, and React keeps a hydrated tree's mismatched attributes as the server sent
  // them, so revealing in the first client render left a backward arrival blank.
  const [arrivedRevealed] = useState(() => !full && totalSteps > 0 && opensRevealed());
  const showArrival = useMounted() && arrivedRevealed;
  const arrivalCount = showArrival ? totalSteps : null;
  const arrivalFooter = showArrival && hasFooter;
  const [previousArrival, setPreviousArrival] = useState({ arrivalCount, arrivalFooter });
  const [revealedCount, setRevealedCount] = useState(full || showArrival ? totalSteps : 0);
  const [footerVisible, setFooterVisible] = useState(full || arrivalFooter);
  const [stepped, setStepped] = useState(false);
  if (
    arrivalCount !== previousArrival.arrivalCount ||
    arrivalFooter !== previousArrival.arrivalFooter
  ) {
    setPreviousArrival({ arrivalCount, arrivalFooter });
    if (arrivalCount !== null) {
      setRevealedCount(arrivalCount);
      setFooterVisible(arrivalFooter);
    }
  }
  // Followed, so a rotation into a phone reveals too, and a speaker window opening steps again
  // from the state the slide was in.
  const phone = usePhone() && !full && totalSteps > 0;
  // Consumed after mount, once every hook on the slide has read it in render, so a reload after a
  // backward arrival opens unrevealed. Here as well as in SlideNavigation: a story renders a slide without it.
  useEffect(() => writeStored("session", directionKey(), null), []);

  const stateRef = useRef({ revealedCount, footerVisible });
  useEffect(() => {
    stateRef.current = { revealedCount, footerVisible };
  });

  // ArrowRight reveals the next step, then the footer; ArrowLeft takes them back in reverse, and
  // only a slide with nothing left to take back lets either key change slides. A slide that starts
  // full is static: it takes neither key, and its footer stays up.
  const listening = !full && !phone && totalSteps > 0;
  useEffect(() => {
    if (!listening) return;
    const stepper: Stepper = {
      forward() {
        const { revealedCount: count, footerVisible: footer } = stateRef.current;
        if (count < totalSteps) {
          setRevealedCount((prev) => Math.min(totalSteps, prev + 1));
          setStepped(true);
        } else if (hasFooter && !footer) setFooterVisible(true);
        else return false;
        return true;
      },
      back() {
        const { revealedCount: count, footerVisible: footer } = stateRef.current;
        if (hasFooter && footer) setFooterVisible(false);
        else if (count > 0) {
          setRevealedCount((prev) => Math.max(0, prev - 1));
          setStepped(true);
        } else return false;
        return true;
      },
    };
    steppers.push(stepper);
    if (steppers.length === 1) window.addEventListener("keydown", stepReveal, true);
    return () => {
      steppers.splice(steppers.indexOf(stepper), 1);
      if (!steppers.length) window.removeEventListener("keydown", stepReveal, true);
    };
  }, [listening, totalSteps, hasFooter]);

  useReportPendingReveal(
    listening && (revealedCount < totalSteps || (hasFooter && !footerVisible)),
    listening && (revealedCount > 0 || (hasFooter && footerVisible)),
  );

  return phone
    ? { revealedCount: totalSteps, footerVisible: hasFooter, stepped: false }
    : { revealedCount, footerVisible, stepped };
}
