"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MotionGlobalConfig } from "motion/react";
import { useGoToSlide } from "../../lib/navigate";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { arrowEvent, deckSync, ROLE_NAMES } from "../../lib/presenter-sync";
import {
  arrivedBackwards as readArrivedBackwards,
  directionKey,
  ignoredKey,
  writeStored,
} from "../../lib/slide-utils";

// The preview of the next slide in the speaker window shows where the slide ends up, not how it
// gets there.
if (typeof window !== "undefined" && deckSync.role() === "preview") {
  MotionGlobalConfig.skipAnimations = true;
}

interface Props {
  currentIndex: number;
  totalSlides: number;
  basePath: string;
}

/** A tap on Next or Previous, or a swipe, presses the arrow key, so it steps as the key does. */
const stepForward = () => document.body.dispatchEvent(arrowEvent("ArrowRight"));
const stepBack = () => document.body.dispatchEvent(arrowEvent("ArrowLeft"));

/** What a presenter can press, for the "?" overlay. A clicker sends PageDown and PageUp. */
const KEYS: Array<[string, string]> = [
  ["→  PageDown  Space", "next step or slide"],
  ["←  PageUp  Shift+Space", "previous step or slide"],
  ["F", "fullscreen on and off"],
  ["S", "speaker view in a second window"],
  ["H", "hints on and off"],
  ["?", "this overlay"],
];
// Edit mode exists only on the dev server.
if (process.env.NODE_ENV === "development") KEYS.push(["E", "edit text, dev only"]);

export function SlideNavigation({ currentIndex, totalSlides, basePath }: Props) {
  const goToSlide = useGoToSlide();
  const [help, setHelp] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentIndexRef = useRef(currentIndex);
  // The last slide still takes Next while it holds a reveal step.
  const pending = usePendingReveal();
  const atEnd = currentIndex === totalSlides - 1 && !pending;
  // The first slide still takes Previous while it holds a step to take back.
  const undoable = usePendingReveal("behind");
  const atStart = currentIndex === 0 && !undoable;
  // Read during render, as every reveal hook on the slide reads it; consumed once they all have,
  // so a reload or a browser Forward onto the next slide does not open it revealed.
  const [arrivedBackwards] = useState(readArrivedBackwards);
  useEffect(() => writeStored("session", directionKey(), null), []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Joins the other windows of this deck. The arrival waits a task, until the slide's own key
  // handlers are registered, since catching up replays presses on them.
  useEffect(() => {
    const leave = deckSync.connect(`hw-slides:${basePath}`, totalSlides, (slide, direction) =>
      goToSlide(`${basePath}/${slide}`, direction),
    );
    const arrival = setTimeout(() => deckSync.arrive(currentIndex, arrivedBackwards));
    return () => {
      clearTimeout(arrival);
      leave();
    };
  }, [basePath, totalSlides, goToSlide, currentIndex, arrivedBackwards]);

  const navigate = useCallback(
    (direction: "back" | "forward") => {
      const idx = currentIndexRef.current;
      const targetIndex = direction === "back" ? idx - 1 : idx + 1;
      if (targetIndex < 0 || targetIndex >= totalSlides) return;
      // Counted at once, so a second press before the next slide renders goes one further.
      currentIndexRef.current = targetIndex;
      goToSlide(`${basePath}/${targetIndex}`, direction);
      deckSync.navigated(targetIndex, direction);
    },
    [totalSlides, basePath, goToSlide],
  );

  useEffect(() => {
    // The frames inside the speaker window only follow.
    const follows = deckSync.follows();

    /** Capture phase, consumes nothing. Once the press has run through every handler, reports
     *  whether the slide took it as a step, which the other windows of the deck replay. */
    function observeArrow(event: KeyboardEvent) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      // The slide on screen, which is the one that may consume the press: after a navigation
      // from here the deck's state already names the next one while this one is still mounted.
      setTimeout(() => deckSync.pressed(event, currentIndex, event.defaultPrevented));
    }

    function openSpeakerView() {
      const { slide, back } = deckSync.getState();
      // A new window starts with a copy of this one's sessionStorage: it opens the slide as
      // revealed as it is here.
      writeStored("session", directionKey(ROLE_NAMES.presenter), back ? "back" : "forward");
      window.open(
        `${basePath}/${Math.max(slide, 0)}`,
        ROLE_NAMES.presenter,
        "popup,width=1280,height=800",
      );
    }

    /** Bubble phase, consumes what it handles. A clicker key is re-sent as the arrow it stands
     *  for, from the same target, so the capture-phase reveal and slide handlers see an arrow and
     *  a clicker reveals step by step exactly as the arrow does. */
    function handleKeyDown(event: KeyboardEvent) {
      // A press replayed from another window steps the slide and never changes it. A press the
      // slide consumed is checked here too: Chrome runs this listener after a consuming capture
      // listener's stopPropagation when the press was dispatched on window itself.
      if (follows || deckSync.isReplayed(event) || event.defaultPrevented) return;
      if (ignoredKey(event)) return;
      const { key, shiftKey } = event;
      const asArrow =
        key === "PageDown" || (key === " " && !shiftKey)
          ? "ArrowRight"
          : key === "PageUp" || (key === " " && shiftKey)
            ? "ArrowLeft"
            : null;
      if (key === "ArrowLeft") navigate("back");
      else if (key === "ArrowRight") navigate("forward");
      else if (asArrow) {
        event.preventDefault();
        (event.target ?? window).dispatchEvent(arrowEvent(asArrow));
      } else if (key === "?") setHelp((v) => !v);
      else if (key === "Escape") setHelp(false);
      else if (key === "f" || key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      } else if ((key === "s" || key === "S") && deckSync.role() === "audience") {
        openSpeakerView();
      }
    }

    function handleTouchStart(event: TouchEvent) {
      touchStartX.current = event.touches[0].clientX;
      touchStartY.current = event.touches[0].clientY;
    }

    function handleTouchEnd(event: TouchEvent) {
      if (follows || touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = event.changedTouches[0].clientX - touchStartX.current;
      const deltaY = event.changedTouches[0].clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) stepBack();
        else stepForward();
      }

      touchStartX.current = null;
      touchStartY.current = null;
    }

    window.addEventListener("keydown", observeArrow, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", observeArrow, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate, basePath, currentIndex]);

  return (
    <>
      {help && (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setHelp(false)}
        >
          <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-2 rounded-sm bg-night px-6 py-5 text-sm text-night-ink">
            {KEYS.map(([keys, what]) => (
              <div key={keys} className="contents">
                <dt className="font-mono text-night-muted">{keys}</dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-max -translate-x-1/2 items-center gap-3 sm:hidden">
        <button
          onClick={stepBack}
          disabled={atStart}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-night-ink/15 bg-night-2 backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
            atStart ? "cursor-not-allowed opacity-25" : "opacity-100 active:scale-95"
          }`}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        <div className="rounded-full border border-night-ink/15 bg-night-2 px-3 py-1.5 text-xs whitespace-nowrap text-night-muted backdrop-blur-sm">
          {currentIndex + 1} / {totalSlides}
        </div>

        <button
          onClick={stepForward}
          disabled={atEnd}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-night-ink/15 bg-night-2 backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
            atEnd ? "cursor-not-allowed opacity-25" : "opacity-100 active:scale-95"
          }`}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </>
  );
}
