"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useMounted } from "../../lib/use-mounted";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { deckSync } from "../../lib/presenter-sync";
import { readStored, ignoredKey, revealedUrl, writeStored } from "../../lib/slide-utils";

interface Props {
  slideIndex: number;
}

const HINTS_STORAGE_KEY = "slide-hints-visible";

/** How long the first-slide hints stay after the deck opens: long enough for the presenter at the
 *  keyboard to read them, gone before the title slide sits in front of an audience. */
const INTRO_MS = 5000;
/** When each deck's intro closes, set by its first mount: a slide change remounts the hints, and
 *  coming back to the first slide later shows no intro again. Keyed by the deck's path, the slide
 *  path without its index. */
const introEndsAt = new Map<string, number>();

function deckPath(): string {
  return typeof window === "undefined" ? "" : location.pathname.replace(/\/[^/]*\/?$/, "");
}

export function SlideHints({ slideIndex }: Props) {
  const mounted = useMounted();
  const pending = usePendingReveal();
  const speakerOpen = useSyncExternalStore(deckSync.subscribe, deckSync.speakerOpen, () => false);
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || readStored("local", HINTS_STORAGE_KEY) !== "false",
  );
  const [intro, setIntro] = useState(() => (introEndsAt.get(deckPath()) ?? Infinity) > Date.now());

  useEffect(() => {
    const deck = deckPath();
    const endsAt = introEndsAt.get(deck) ?? Date.now() + INTRO_MS;
    introEndsAt.set(deck, endsAt);
    const timer = setTimeout(() => setIntro(false), endsAt - Date.now());
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (ignoredKey(event)) return;
      if (event.key === "h" || event.key === "H") {
        setVisible((prev) => {
          writeStored("local", HINTS_STORAGE_KEY, String(!prev));
          return !prev;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // The hints are for whoever holds the keyboard: with a speaker window open the audience window
  // is on the projector and shows the slide alone, and so do the frames that mirror it and a
  // `?revealed` page.
  if (!mounted || !visible || speakerOpen || deckSync.role() === "preview" || revealedUrl())
    return null;

  const hints: { key: string; text: string }[] = [];

  if (slideIndex === 0 && intro) {
    hints.push({ key: "→", text: "to go to next slide" });
    hints.push({ key: "⌥", text: "drag to highlight" });
    hints.push({ key: "Esc", text: "to clear" });
  }

  // Only while the next arrow press reveals a step: an attendee watching a screen share sees the
  // hint too, and on a slide with nothing left to reveal it promises something that never comes.
  if (pending) {
    hints.push({ key: "→", text: "to reveal" });
  }

  if (hints.length === 0) return null;

  return (
    // Bottom centre, clear of the kicker and title above and the page counter and logo in the
    // bottom corners; a titled slide's body ends above it. Below `md` a phone has no arrow keys.
    <div
      data-hw-scale="dense"
      className="fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 md:block"
    >
      <div className="flex items-center gap-4 rounded-brand-sm border border-primary-border bg-white/70 px-3 py-1.5 backdrop-blur-sm [--hw-kbd-size:var(--text-xs)]">
        {hints.map((hint) => (
          <div key={hint.text} className="flex items-center gap-1.5 text-xs text-text-muted">
            <kbd className="hw-kbd">{hint.key}</kbd>
            <span>{hint.text}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 border-l border-primary-border pl-3 text-xs text-text-subtle">
          <kbd className="hw-kbd">H</kbd>
          <span>hide</span>
        </div>
      </div>
    </div>
  );
}
