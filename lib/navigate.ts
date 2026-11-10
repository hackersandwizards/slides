"use client";

import { useSyncExternalStore } from "react";
import { deckSync } from "./presenter-sync";
import { directionKey, writeStored } from "./slide-utils";

// Moving within the one island loads no document, so a fast run of presses lands where the presses
// say; the direction written before navigating lets `opensRevealed` open a backward arrival revealed.
const listeners = new Set<() => void>();

export function goToSlide(href: string, direction: "back" | "forward"): void {
  writeStored("session", directionKey(), direction);
  // A frame inside the speaker window replaces its entry: frames share that window's history,
  // and Back there should move the deck, not a frame.
  if (deckSync.follows()) history.replaceState(null, "", href);
  else history.pushState(null, "", href);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/** The current path, following `goToSlide` and the browser's back and forward buttons. */
export function usePathname(serverPath: string): string {
  return useSyncExternalStore(
    subscribe,
    () => location.pathname,
    () => serverPath,
  );
}
