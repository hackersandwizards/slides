"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { readStored, writeStored } from "./browser-storage";

const SPLIT_KEY = "slide-presenter-split";
/** The share of the height below the header that the slides take; the notes get the rest. */
const DEFAULT_SPLIT = 0.6;
export const MIN_SPLIT = 0.1;
export const MAX_SPLIT = 0.9;
const SPLIT_STEP = 0.05;

export function clampPresenterSplit(value: number): number {
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
}

export function presenterSplitKeyTarget(split: number, key: string): number | null {
  const targets: Record<string, number> = {
    ArrowUp: split - SPLIT_STEP,
    ArrowDown: split + SPLIT_STEP,
    Home: MIN_SPLIT,
    End: MAX_SPLIT,
  };
  return Object.hasOwn(targets, key) ? targets[key] : null;
}

/** The divider between slides and notes: Up, Down, Home and End stop here, so they neither scroll
 *  the notes nor reach the deck; Left, Right and the clicker keep stepping the deck. */
export function usePresenterSplit(region: RefObject<HTMLDivElement | null>) {
  const [split, setSplit] = useState(() => {
    const stored = Number(readStored("local", SPLIT_KEY));
    return stored >= MIN_SPLIT && stored <= MAX_SPLIT ? stored : DEFAULT_SPLIT;
  });
  const save = (value: number | null) => {
    const next = value === null ? DEFAULT_SPLIT : clampPresenterSplit(value);
    live.current = next;
    setSplit(next);
    writeStored("local", SPLIT_KEY, value === null ? null : String(next));
  };
  // Where on the divider the pointer grabbed it: the divider scales with the slide scale's rem.
  const grab = useRef(0);
  // The last dragged value: the release can arrive before React renders the last move.
  const live = useRef(split);
  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return;
      // No mousedown follows, so the laser pointer neither draws nor cancels the focus.
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      grab.current = event.clientY - event.currentTarget.getBoundingClientRect().top;
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const box = region.current?.getBoundingClientRect();
      if (event.currentTarget.hasPointerCapture(event.pointerId) && box && box.height > 0)
        setSplit(
          (live.current = clampPresenterSplit(
            (event.clientY - grab.current - box.top) / box.height,
          )),
        );
    },
    // Fires on release and on a cancelled drag alike, so no drag ends unsaved.
    onLostPointerCapture: () => save(live.current),
    onDoubleClick: () => save(null),
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      const next = presenterSplitKeyTarget(split, event.key);
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      save(next);
    },
  };
  return [split, handlers] as const;
}
