"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { NARROW, directionKey, ignoredKey, writeStored } from "./slide-utils";
import { usePrintMode } from "./print-context";
import { useHydratedRevealArrival } from "./use-hydrated-reveal-arrival";
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

type RevealSequence = Required<Pick<UseProgressiveRevealOptions, "totalSteps" | "hasFooter">>;
type RevealMove = "step" | "footer" | null;

interface RevealAction {
  direction: keyof Stepper;
  target: NonNullable<RevealMove>;
}

function applyRevealMove(
  progress: UseProgressiveRevealResult,
  { direction, target }: RevealAction,
  totalSteps: number,
): UseProgressiveRevealResult {
  const forward = direction === "forward";
  if (target === "footer") return { ...progress, footerVisible: forward };
  return {
    ...progress,
    revealedCount: forward
      ? Math.min(totalSteps, progress.revealedCount + 1)
      : Math.max(0, progress.revealedCount - 1),
    stepped: true,
  };
}

function useRevealProgress(
  { totalSteps, hasFooter }: RevealSequence,
  full: boolean,
  showArrival: boolean,
) {
  const arrivalCount = showArrival ? totalSteps : null;
  const arrivalFooter = showArrival && hasFooter;
  const [previousArrival, setPreviousArrival] = useState({ arrivalCount, arrivalFooter });
  const [progress, setProgress] = useState({
    revealedCount: full || showArrival ? totalSteps : 0,
    footerVisible: full || arrivalFooter,
    stepped: false,
  });

  if (
    arrivalCount !== previousArrival.arrivalCount ||
    arrivalFooter !== previousArrival.arrivalFooter
  ) {
    setPreviousArrival({ arrivalCount, arrivalFooter });
    if (arrivalCount !== null) {
      setProgress({ ...progress, revealedCount: arrivalCount, footerVisible: arrivalFooter });
    }
  }

  const committed = useRef(progress);
  useEffect(() => {
    committed.current = progress;
  });

  const stepper = useMemo<Stepper>(() => {
    const move = (direction: keyof Stepper) => {
      const target = revealMoves({ totalSteps, hasFooter }, committed.current)[direction];
      if (target === null) return false;
      setProgress((previous) => applyRevealMove(previous, { direction, target }, totalSteps));
      return true;
    };
    return { forward: () => move("forward"), back: () => move("back") };
  }, [totalSteps, hasFooter]);

  return { progress, stepper, moves: revealMoves({ totalSteps, hasFooter }, progress) };
}

// ArrowRight reveals the next step, then the footer; ArrowLeft takes them back in reverse, and
// only a slide with nothing left to take back lets either key change slides. A slide that starts
// full is static: it takes neither key, and its footer stays up.
function revealMoves(
  { totalSteps, hasFooter }: RevealSequence,
  { revealedCount, footerVisible }: UseProgressiveRevealResult,
): Record<keyof Stepper, RevealMove> {
  const forward = revealedCount < totalSteps ? "step" : null;
  const back = revealedCount > 0 ? "step" : null;
  if (!hasFooter) return { forward, back };
  if (footerVisible) return { forward, back: "footer" };
  return { forward: forward ?? "footer", back };
}

function trackRevealStepper(stepper: Stepper) {
  steppers.push(stepper);
  if (steppers.length === 1) window.addEventListener("keydown", stepReveal, true);
  return () => {
    steppers.splice(steppers.indexOf(stepper), 1);
    if (!steppers.length) window.removeEventListener("keydown", stepReveal, true);
  };
}

function useRevealKeys(stepper: Stepper, listening: boolean) {
  useEffect(() => {
    if (listening) return trackRevealStepper(stepper);
  }, [stepper, listening]);
}

export function useProgressiveReveal({
  totalSteps,
  startFull = false,
  hasFooter = false,
}: UseProgressiveRevealOptions): UseProgressiveRevealResult {
  const printMode = usePrintMode();
  const full = printMode || startFull;
  const canStep = !full && totalSteps > 0;
  const { showArrival } = useHydratedRevealArrival(canStep);
  // Followed, so a rotation into a phone reveals too, and a speaker window opening steps again
  // from the state the slide was in.
  const phone = usePhone() && canStep;
  // Consumed after mount, once every hook on the slide has read it in render, so a reload after a
  // backward arrival opens unrevealed. Here as well as in SlideNavigation: a story renders a slide without it.
  useEffect(() => writeStored("session", directionKey(), null), []);

  const { progress, stepper, moves } = useRevealProgress(
    { totalSteps, hasFooter },
    full,
    showArrival,
  );
  const listening = canStep && !phone;
  useRevealKeys(stepper, listening);
  useReportPendingReveal(listening && moves.forward !== null, listening && moves.back !== null);

  return phone
    ? { revealedCount: totalSteps, footerVisible: hasFooter, stepped: false }
    : { ...progress };
}
