"use client";

import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ChevronLeft from "lucide-react/icons/chevron-left";
import ChevronRight from "lucide-react/icons/chevron-right";
import { MotionGlobalConfig } from "motion/react";
import { useMounted } from "../../lib/use-mounted";
import { goToSlide } from "../../lib/navigate";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { arrowEvent, deckSync, ROLE_NAMES, type ArrowKey } from "../../lib/presenter-sync";
import {
  arrivedBackwards as readArrivedBackwards,
  directionKey,
  revealedUrl,
} from "../../lib/slide-arrival";
import { dialogOpen, ignoredKey } from "../../lib/slide-input";
import { writeStored } from "../../lib/browser-storage";
import { ShortcutsDialog } from "./ShortcutsDialog";

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

/** A click with a pointer leaves the button: a Next that only revealed a step stays mounted, and
 *  focused it turned visible at the presenter's next arrow key and held the bar drawn. A press of
 *  Enter or Space (`detail` 0) keeps the keyboard's place. */
const press = (step: () => void) => (event: ReactMouseEvent<HTMLButtonElement>) => {
  if (event.detail > 0) event.currentTarget.blur();
  step();
};

/** How long the controls stay after the pointer last moved. A module's, as each slide mounts its
 *  navigation anew and a click on Next must find them still there. */
const POINTER_IDLE_MS = 3000;
let pointerMovedAt = -Infinity;
const pointerActive = () => performance.now() - pointerMovedAt < POINTER_IDLE_MS;

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

function openSpeakerView(basePath: string) {
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

function dispatchArrow(event: KeyboardEvent, key: ArrowKey) {
  event.preventDefault();
  (event.target ?? window).dispatchEvent(arrowEvent(key));
}

function usePointerAwake() {
  const [awake, setAwake] = useState(pointerActive);
  useEffect(() => {
    let sleep: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(sleep);
      sleep = setTimeout(
        () => setAwake(false),
        Math.max(0, POINTER_IDLE_MS - (performance.now() - pointerMovedAt)),
      );
    };
    function onPointer(event: PointerEvent) {
      // A drag with the mouse is the laser pointer or the highlighter; a mouse wakes the bar only
      // by moving.
      if (event.pointerType === "mouse" && (event.type !== "pointermove" || event.buttons)) return;
      pointerMovedAt = performance.now();
      setAwake(true);
      arm();
    }
    arm();
    window.addEventListener("pointermove", onPointer);
    // A tap wakes on its click, so one that lands on a sleeping bar steps nothing.
    window.addEventListener("click", onPointer);
    return () => {
      clearTimeout(sleep);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("click", onPointer);
    };
  }, []);
  return awake;
}

function useDeckSyncNavigation(currentIndex: number, totalSlides: number, basePath: string) {
  const currentIndexRef = useRef(currentIndex);
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
  }, [basePath, totalSlides, currentIndex, arrivedBackwards]);

  return useCallback(
    (direction: "back" | "forward") => {
      const idx = currentIndexRef.current;
      const targetIndex = direction === "back" ? idx - 1 : idx + 1;
      if (targetIndex < 0 || targetIndex >= totalSlides) return;
      // Counted at once, so a second press before the next slide renders goes one further.
      currentIndexRef.current = targetIndex;
      goToSlide(`${basePath}/${targetIndex}`, direction);
      deckSync.navigated(targetIndex, direction);
    },
    [totalSlides, basePath],
  );
}

function useSlideTouchSwipe() {
  useEffect(() => {
    const follows = deckSync.follows();
    let startX: number | null = null;
    let startY: number | null = null;

    function onTouchStart(event: TouchEvent) {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }
    function onTouchEnd(event: TouchEvent) {
      if (follows || dialogOpen() || startX === null || startY === null) return;
      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) stepBack();
        else stepForward();
      }
      startX = null;
      startY = null;
    }

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}

/** Capture phase, consumes nothing. Once the press has run through every handler, reports
 *  whether the slide took it as a step, which the other windows of the deck replay. */
function useArrowSyncObserver(currentIndex: number) {
  useEffect(() => {
    function observeArrow(event: KeyboardEvent) {
      if ((event.key !== "ArrowRight" && event.key !== "ArrowLeft") || ignoredKey(event)) return;
      // The slide on screen, which is the one that may consume the press: after a navigation
      // from here the deck's state already names the next one while this one is still mounted.
      setTimeout(() => deckSync.pressed(event, currentIndex, event.defaultPrevented));
    }
    window.addEventListener("keydown", observeArrow, true);
    return () => window.removeEventListener("keydown", observeArrow, true);
  }, [currentIndex]);
}

function useSlideKeyShortcuts(
  navigate: (direction: "back" | "forward") => void,
  onOpenHelp: () => void,
  basePath: string,
) {
  useEffect(() => {
    const follows = deckSync.follows();
    const openHelp = () => {
      if (!dialogOpen()) onOpenHelp();
    };
    const openSpeaker = () => {
      if (deckSync.role() === "audience") openSpeakerView(basePath);
    };
    const arrowRight = (event: KeyboardEvent) => dispatchArrow(event, "ArrowRight");
    const arrowLeft = (event: KeyboardEvent) => dispatchArrow(event, "ArrowLeft");
    const actions = new Map<string, (event: KeyboardEvent) => void>([
      ["ArrowLeft", () => navigate("back")],
      ["ArrowRight", () => navigate("forward")],
      ["PageDown", arrowRight],
      ["PageUp", arrowLeft],
      [" ", (event) => dispatchArrow(event, event.shiftKey ? "ArrowLeft" : "ArrowRight")],
      ["?", openHelp],
      ["f", toggleFullscreen],
      ["F", toggleFullscreen],
      ["s", openSpeaker],
      ["S", openSpeaker],
    ]);

    /** Bubble phase, consumes what it handles. A clicker key is re-sent as the arrow it stands
     *  for, from the same target, so the capture-phase reveal and slide handlers see an arrow and
     *  a clicker reveals step by step exactly as the arrow does. */
    function handleKeyDown(event: KeyboardEvent) {
      // A press replayed from another window steps the slide and never changes it. A press the
      // slide consumed is checked here too: Chrome runs this listener after a consuming capture
      // listener's stopPropagation when the press was dispatched on window itself.
      if (follows || deckSync.isReplayed(event) || event.defaultPrevented || ignoredKey(event))
        return;
      actions.get(event.key)?.(event);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, onOpenHelp, basePath]);
}

function SlideControlsBar({
  currentIndex,
  totalSlides,
  awake,
}: {
  currentIndex: number;
  totalSlides: number;
  awake: boolean;
}) {
  // The last slide still takes Next while it holds a reveal step.
  const pending = usePendingReveal();
  const atEnd = currentIndex === totalSlides - 1 && !pending;
  // The first slide still takes Previous while it holds a step to take back.
  const undoable = usePendingReveal("behind");
  const atStart = currentIndex === 0 && !undoable;
  return (
    <div
      data-hw-scale="screen"
      data-awake={awake || undefined}
      className="slide-controls fixed z-50 flex w-max items-center gap-3 transition-opacity print:hidden"
    >
      <button
        onClick={press(stepBack)}
        disabled={atStart}
        className="hw-focus-ring hw-icon-button disabled:cursor-not-allowed disabled:opacity-25"
        data-on="picture"
        aria-label="Previous slide"
      >
        <ChevronLeft />
      </button>

      <div
        className="slide-position box-content min-w-(--slide-position-min) rounded-full border border-night-ink/15 bg-night-2 p-[calc(var(--hw-control-size)*6/44)_calc(var(--hw-control-size)*12/44)] text-center text-[length:calc(var(--hw-control-size)*21/44)] leading-(--type-label-line-height) whitespace-nowrap text-night-muted tabular-nums"
        // Both numbers at the total's length, and the " / " about as wide as 1.5 digits.
        style={
          {
            "--slide-position-min": `calc(var(--slide-position-digit) * ${2 * String(totalSlides).length + 1.5})`,
          } as CSSProperties
        }
      >
        {currentIndex + 1} / {totalSlides}
      </div>

      <button
        onClick={press(stepForward)}
        disabled={atEnd}
        className="hw-focus-ring hw-icon-button disabled:cursor-not-allowed disabled:opacity-25"
        data-on="picture"
        aria-label="Next slide"
      >
        <ChevronRight />
      </button>
    </div>
  );
}

export function SlideNavigation({ currentIndex, totalSlides, basePath }: Props) {
  const [help, setHelp] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  const closeHelp = useCallback(() => setHelp(false), []);
  // As for the hints: the frames that mirror a slide, an audience window with a speaker window
  // open and a `?revealed` page show the slide alone.
  const mounted = useMounted();
  const speakerOpen = useSyncExternalStore(deckSync.subscribe, deckSync.speakerOpen, () => false);
  const slideAlone = mounted && (speakerOpen || deckSync.follows() || revealedUrl());
  const awake = usePointerAwake();
  const navigate = useDeckSyncNavigation(currentIndex, totalSlides, basePath);

  useSlideTouchSwipe();
  useArrowSyncObserver(currentIndex);
  useSlideKeyShortcuts(navigate, openHelp, basePath);

  return (
    <>
      {help && <ShortcutsDialog onClose={closeHelp} />}
      {!slideAlone && (
        <SlideControlsBar currentIndex={currentIndex} totalSlides={totalSlides} awake={awake} />
      )}
    </>
  );
}
