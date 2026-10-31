"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
  arrivedBackwards as readArrivedBackwards,
  directionKey,
  ignoredKey,
  writeStored,
} from "./slide-utils";
import { usePrintMode } from "./print-context";

// Which reveal handlers on the page still hold a step ahead, so the presenter hint can say "to
// reveal" only while the next arrow press reveals something rather than changing slides, and which
// hold one behind, so Previous stays live on the first slide while a step can be taken back.
const pending = { ahead: new Set<symbol>(), behind: new Set<symbol>() };
const pendingListeners = new Set<() => void>();
const notifyPending = () => pendingListeners.forEach((listener) => listener());
const subscribePending = (listener: () => void) => {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
};

/** Registers this handler as holding a reveal step ahead while `ahead` is true, and one to take
 *  back while `behind` is true. */
export function useReportPendingReveal(ahead: boolean, behind = false) {
  const [id] = useState(() => Symbol("reveal"));
  useEffect(() => {
    const held = [ahead && pending.ahead, behind && pending.behind].filter((set) => set !== false);
    if (!held.length) return;
    held.forEach((set) => set.add(id));
    notifyPending();
    return () => {
      held.forEach((set) => set.delete(id));
      notifyPending();
    };
  }, [id, ahead, behind]);
}

/** True while any handler on the page still holds a reveal step ahead. */
export const hasPendingReveal = () => pending.ahead.size > 0;

/** The same, as a hook that re-renders when it changes; `"behind"` asks for a step to take back. */
export function usePendingReveal(direction: keyof typeof pending = "ahead"): boolean {
  return useSyncExternalStore(
    subscribePending,
    () => pending[direction].size > 0,
    () => false,
  );
}

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
   *  `startFull`, a backward arrival), which shows every step neutral. */
  stepped: boolean;
}

export function useProgressiveReveal({
  totalSteps,
  startFull = false,
  hasFooter = false,
}: UseProgressiveRevealOptions): UseProgressiveRevealResult {
  const printMode = usePrintMode();
  const full = printMode || startFull;
  const [revealedCount, setRevealedCount] = useState(full ? totalSteps : 0);
  const [footerVisible, setFooterVisible] = useState(full);
  const [stepped, setStepped] = useState(false);
  // Read during render, applied after mount: the server cannot see sessionStorage and renders the
  // slide unrevealed, and React keeps a hydrated tree's mismatched attributes as the server sent
  // them, so revealing in the first client render left a backward arrival blank.
  const [arrivedBackwards] = useState(() => !full && totalSteps > 0 && readArrivedBackwards());
  useEffect(() => {
    if (!arrivedBackwards) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount reveal above
    setRevealedCount(totalSteps);
    setFooterVisible(hasFooter);
  }, [arrivedBackwards, totalSteps, hasFooter]);
  // Consumed after mount, once every hook on the slide has read it in render, so a reload opens
  // unrevealed. Here as well as in SlideNavigation: a story renders a slide without it.
  useEffect(() => writeStored("session", directionKey(), null), []);

  const stateRef = useRef({ revealedCount, footerVisible });
  useEffect(() => {
    stateRef.current = { revealedCount, footerVisible };
  });

  // ArrowRight reveals the next step, then the footer; ArrowLeft takes them back in reverse, and
  // only a slide with nothing left to take back lets either key change slides. A slide that starts
  // full is static: it takes neither key, and its footer stays up.
  const listening = !full && totalSteps > 0;
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

  return { revealedCount, footerVisible, stepped };
}
