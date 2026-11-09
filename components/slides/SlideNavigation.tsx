"use client";

import {
  Fragment,
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
import { useGoToSlide } from "../../lib/navigate";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { arrowEvent, deckSync, ROLE_NAMES } from "../../lib/presenter-sync";
import {
  arrivedBackwards as readArrivedBackwards,
  dialogOpen,
  directionKey,
  ignoredKey,
  revealedUrl,
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

/** What a presenter can press, for the "?" overlay. A clicker sends PageDown and PageUp. */
const KEYS: Array<[string[], string]> = [
  [["→", "PageDown", "Space"], "next step or slide"],
  [["←", "PageUp", "Shift+Space"], "previous step or slide"],
  [["F"], "fullscreen on and off"],
  [["S"], "speaker view in a second window"],
  [["H"], "hints on and off"],
  [["?"], "this overlay"],
];
if (process.env.NODE_ENV === "development") KEYS.push([["E"], "edit text, dev only"]);

/** A stable ref, so only the dialog's mount opens it: an inline one runs on every render and
 *  would reopen it between Esc and its queued `close` event. */
const openModal = (dialog: HTMLDialogElement | null) => dialog?.showModal();

/** Whether a press or click lies outside the panel: the backdrop's events reach the dialog element. */
function onBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < left || x > right || y < top || y > bottom;
}

export function SlideNavigation({ currentIndex, totalSlides, basePath }: Props) {
  const goToSlide = useGoToSlide();
  const [help, setHelp] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pressedBackdrop = useRef(false);
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

  // As for the hints: the frames that mirror a slide, an audience window with a speaker window
  // open and a `?revealed` page show the slide alone.
  const mounted = useMounted();
  const speakerOpen = useSyncExternalStore(deckSync.subscribe, deckSync.speakerOpen, () => false);
  const slideAlone = mounted && (speakerOpen || deckSync.follows() || revealedUrl());
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
    function wake() {
      pointerMovedAt = performance.now();
      setAwake(true);
      arm();
    }
    function onPointer(event: PointerEvent) {
      // A drag with the mouse is the laser pointer or the highlighter; a mouse wakes the bar only
      // by moving.
      if (event.pointerType === "mouse" && (event.type !== "pointermove" || event.buttons)) return;
      wake();
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
      if ((event.key !== "ArrowRight" && event.key !== "ArrowLeft") || ignoredKey(event)) return;
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
      const { key, shiftKey } = event;
      if (key === "?" && dialogOpen() && !event.metaKey && !event.ctrlKey && !event.altKey)
        return setHelp(false);
      if (ignoredKey(event)) return;
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
      } else if (key === "?") setHelp(true);
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
      if (follows || dialogOpen()) return;
      if (touchStartX.current === null || touchStartY.current === null) return;

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
        // Closes on a press and release both on the backdrop: a selection that starts in the panel
        // and ends outside it is no click on the backdrop.
        <dialog
          ref={openModal}
          className="hw-dialog"
          data-hw-scale="dense"
          data-size="large"
          aria-label="Keyboard shortcuts"
          onClose={() => setHelp(false)}
          onMouseDown={(event) => {
            pressedBackdrop.current = onBackdrop(event);
          }}
          onClick={(event) => {
            if (pressedBackdrop.current && onBackdrop(event)) setHelp(false);
          }}
        >
          <div className="hw-dialog-body [--hw-field-size:var(--text-sm)]">
            <dl className="grid gap-y-4 [--hw-kbd-size:var(--text-sm)] sm:grid-cols-[auto_auto] sm:items-center sm:gap-x-6 sm:gap-y-2">
              {KEYS.map(([keys, what]) => (
                <div key={what} className="grid gap-y-1 sm:contents">
                  <dt className="flex flex-wrap gap-1">
                    {keys.map((key) => (
                      <span key={key} className="flex items-center gap-1">
                        {key.split("+").map((part, i) => (
                          <Fragment key={part}>
                            {i > 0 && "+"}
                            <kbd className="hw-kbd">{part}</kbd>
                          </Fragment>
                        ))}
                      </span>
                    ))}
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </div>
        </dialog>
      )}
      {!slideAlone && (
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
            className="box-content rounded-full border border-night-ink/15 bg-night-2 p-[calc(var(--hw-control-size)*6/44)_calc(var(--hw-control-size)*12/44)] text-center text-[length:calc(var(--hw-control-size)*21/44)] leading-(--type-label-line-height) whitespace-nowrap text-night-muted tabular-nums"
            // Both numbers at the total's length, and the " / " about as wide as 1.5 digits.
            style={{
              minWidth: `calc(var(--slide-position-digit) * ${2 * String(totalSlides).length + 1.5})`,
            }}
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
      )}
    </>
  );
}
