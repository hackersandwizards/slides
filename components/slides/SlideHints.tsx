"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import ArrowRight from "lucide-react/icons/arrow-right";
import Highlighter from "lucide-react/icons/highlighter";
import { useMounted } from "../../lib/use-mounted";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { deckSync } from "../../lib/presenter-sync";
import { readStored, ignoredKey, writeStored } from "../../lib/slide-utils";

interface Props {
  slideIndex: number;
}

const HINTS_STORAGE_KEY = "slide-hints-visible";

/** How long the first-slide hints stay after the deck opens: long enough for the presenter at the
 *  keyboard to read them, gone before the title slide sits in front of an audience. */
const INTRO_MS = 5000;
/** When each deck's intro closes, set by its first mount: a slide change remounts the hints, and
 *  coming back to the first slide later shows no intro again. Keyed by the deck's path, the slide
 *  path without its index, since a client-side move to another deck keeps this module loaded. */
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

  // The deck is read again here: Next's router moves the URL in an insertion effect after the new
  // page renders, so coming from the deck list the render above still saw the list's path.
  useEffect(() => {
    const deck = deckPath();
    const endsAt = introEndsAt.get(deck) ?? Date.now() + INTRO_MS;
    introEndsAt.set(deck, endsAt);
    let live = true;
    queueMicrotask(() => live && setIntro(endsAt > Date.now()));
    const timer = setTimeout(() => setIntro(false), endsAt - Date.now());
    return () => {
      live = false;
      clearTimeout(timer);
    };
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
  // is on the projector and shows the slide alone, and so do the frames that mirror it.
  if (!mounted || !visible || speakerOpen || deckSync.role() === "preview") return null;

  const hints: { icon: React.ReactNode; text: string }[] = [];

  if (slideIndex === 0 && intro) {
    hints.push({
      icon: <ArrowRight className="h-4 w-4" />,
      text: "to go to next slide",
    });
    hints.push({
      icon: <Highlighter className="h-4 w-4" />,
      text: "⌥ drag to highlight, Esc to clear",
    });
  }

  // Only while the next arrow press reveals a step: an attendee watching a screen share sees the
  // hint too, and on a slide with nothing left to reveal it promises something that never comes.
  if (pending) {
    hints.push({
      icon: <ArrowRight className="h-4 w-4" />,
      text: "to reveal",
    });
  }

  if (hints.length === 0) return null;

  return (
    // Bottom centre, clear of the kicker and title above and the page counter and logo in the
    // bottom corners; a titled slide's body ends above it. Below `md` a phone has no arrow keys.
    <div className="fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 md:block">
      <div className="flex items-center gap-4 rounded-brand-sm border border-primary-border bg-white/70 px-3 py-1.5 backdrop-blur-sm">
        {hints.map((hint, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="flex h-6 w-6 items-center justify-center bg-primary/7 text-primary">
              {hint.icon}
            </span>
            <span>{hint.text}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 border-l border-primary-border pl-3 text-xs text-text-subtle">
          <span className="flex h-5 w-5 items-center justify-center bg-primary/7 text-xs text-primary">
            H
          </span>
          <span>hide</span>
        </div>
      </div>
    </div>
  );
}
