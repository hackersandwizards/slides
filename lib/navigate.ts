"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useSlidesAdapter } from "./adapter";
import { deckSync } from "./presenter-sync";
import { directionKey, writeStored } from "./slide-utils";

// Moving within the one island loads no document, so a fast run of presses lands where the presses
// say; the direction written before navigating lets `opensRevealed` open a backward arrival revealed.
const listeners = new Set<() => void>();

function historyNavigate(href: string, replace: boolean): void {
  if (replace) history.replaceState(null, "", href);
  else history.pushState(null, "", href);
  listeners.forEach((listener) => listener());
}

export function goToSlide(
  href: string,
  direction: "back" | "forward",
  navigate: (href: string, replace: boolean) => void = historyNavigate,
): void {
  writeStored("session", directionKey(), direction);
  // A frame inside the speaker window replaces its entry: frames share that window's history,
  // and Back there should move the deck, not a frame.
  navigate(href, deckSync.follows());
}

/** The engine navigates through this hook, with the adapter's `navigate` where one is given. */
export function useGoToSlide(): (href: string, direction: "back" | "forward") => void {
  const { navigate } = useSlidesAdapter();
  return useCallback(
    (href: string, direction: "back" | "forward") => goToSlide(href, direction, navigate),
    [navigate],
  );
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
