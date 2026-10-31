"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { ArrowRight, Highlighter } from "lucide-react";
import { useMounted } from "../../lib/use-mounted";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { deckSync } from "../../lib/presenter-sync";
import { readStored, ignoredKey, writeStored } from "../../lib/slide-utils";

interface Props {
  slideIndex: number;
}

const HINTS_STORAGE_KEY = "slide-hints-visible";

export function SlideHints({ slideIndex }: Props) {
  const mounted = useMounted();
  const pending = usePendingReveal();
  const speakerOpen = useSyncExternalStore(deckSync.subscribe, deckSync.speakerOpen, () => false);
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || readStored("local", HINTS_STORAGE_KEY) !== "false",
  );

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

  if (slideIndex === 0) {
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
