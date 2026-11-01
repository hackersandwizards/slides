"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useMounted } from "../../lib/use-mounted";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import {
  arrowEvent,
  deckSync,
  ROLE_NAMES,
  type ArrowKey,
  type DeckState,
} from "../../lib/presenter-sync";
import { directionKey, readStored, writeStored } from "../../lib/slide-utils";

interface Props {
  /** Every slide's speaker notes, in deck order. */
  notes: Array<string | undefined>;
  basePath: string;
}

const NOTES_SIZE_KEY = "slide-notes-size";
const TIMER_KEY = "slide-speaker-timer";
const SPLIT_KEY = "slide-presenter-split";
/** The share of the height below the header that the slides take; the notes get the rest. */
const DEFAULT_SPLIT = 0.6;
const MIN_SPLIT = 0.1;
const MAX_SPLIT = 0.9;
const SPLIT_STEP = 0.05;
/** The slides keep their headings and a visible frame, the notes their heading and a few lines,
 *  whatever the window's height. */
const MIN_SLIDES_PX = 120;
const MIN_NOTES_PX = 176;
/** 16:9 at the largest size its box allows, so a shorter box narrows the slide. */
const FRAME_SIZE = "aspect-video w-[min(100cqw,calc(100cqh*16/9))]";
/** Editing notes writes the deck file through the edit mode's endpoint, which only the dev server
 *  serves; the condition folds to false in a build, which drops the button with it. */
const EDITABLE = import.meta.env.DEV;
const EDIT_ENDPOINT = "/api/deck-edit";
const SERVER_STATE: DeckState = { slide: -1, back: false, step: 0, at: 0, from: "" };

/** The speaker window: the slide as the audience sees it, the next slide, the notes, a timer and
 *  the clock. It renders only in the window `S` opened (or a link with `?presenter`), above that
 *  window's own copy of the slide, which keeps taking the keys and the clicker, so every press
 *  here runs exactly as it would in the audience window and is mirrored there.
 *
 *  It sits outside the per-slide tree in both hosts, so its frames load once and then follow the
 *  deck rather than reloading on every slide. */
export function PresenterView({ notes, basePath }: Props) {
  const mounted = useMounted();
  if (!mounted || deckSync.role() !== "presenter") return null;
  return <SpeakerWindow notes={notes} basePath={basePath} />;
}

function SpeakerWindow({ notes, basePath }: Props) {
  const state = useSyncExternalStore(deckSync.subscribe, deckSync.getState, () => SERVER_STATE);
  const pending = usePendingReveal();
  const total = notes.length;
  const frames = useFrameSources(state, basePath, total);
  const [size, setSize] = useNotesSize();
  const slide = Math.max(state.slide, 0);
  const edit = useNotesEdit(notes, basePath);
  const note = edit.current(slide)?.trim();
  const last = slide >= total - 1;
  useInertSlide();
  const notesBox = useNotesKeys(slide);
  const region = useRef<HTMLDivElement>(null);
  const [split, dividerHandlers] = useSplit(region);

  return (
    <div className="fixed inset-0 z-[55] flex flex-col gap-4 bg-night p-4 font-sans text-night-ink">
      <header className="flex items-center gap-6 text-lg">
        <span className="font-mono text-2xl font-bold tabular-nums">
          {slide + 1} / {total}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${pending ? "bg-insight text-night" : "bg-night-ink/15 text-night-muted"}`}
        >
          {pending ? "More on this slide" : last ? "Last slide" : "Next press: next slide"}
        </span>
        <span className="flex-1" />
        <StepButton
          label="Previous"
          keyName="ArrowLeft"
          icon={<ChevronLeft className="h-5 w-5" />}
        />
        <StepButton label="Next" keyName="ArrowRight" icon={<ChevronRight className="h-5 w-5" />} />
        <Timer />
        <Clock />
      </header>

      {/* The slides on top, the notes across the full width below: the notes are what this
          window is for, and a wide line of them reads at a glance. The divider between them
          trades the slides' height for the notes'. */}
      <div ref={region} className="flex min-h-0 flex-1 flex-col">
        <div
          className="grid min-h-0 grid-cols-[3fr_2fr] gap-4"
          style={{
            height: `clamp(${MIN_SLIDES_PX}px, ${split * 100}%, calc(100% - ${MIN_NOTES_PX}px))`,
          }}
        >
          <section aria-label="Current slide" className="flex min-h-0 flex-col gap-2">
            <h2 className="text-sm font-bold tracking-wide text-night-muted">Now</h2>
            <div className="[container-type:size] min-h-0 flex-1">
              {frames && (
                <Frame name={ROLE_NAMES.follow} src={frames.follow} title="Current slide" />
              )}
            </div>
          </section>

          <section aria-label="Next slide" className="flex min-h-0 flex-col gap-2">
            <h2 className="text-sm font-bold tracking-wide text-night-muted">Next slide</h2>
            <div className="[container-type:size] min-h-0 flex-1">
              <div className={last ? "hidden" : "contents"}>
                {frames && (
                  <Frame name={ROLE_NAMES.preview} src={frames.preview} title="Next slide" />
                )}
              </div>
              {last && (
                <p
                  className={`${FRAME_SIZE} flex items-center justify-center rounded-sm border border-night-ink/15 text-night-muted`}
                >
                  End of the deck
                </p>
              )}
            </div>
          </section>
        </div>

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize slides and notes"
          aria-valuemin={MIN_SPLIT * 100}
          aria-valuemax={MAX_SPLIT * 100}
          aria-valuenow={Math.round(split * 100)}
          tabIndex={0}
          title="Drag to resize, double-click to reset"
          {...dividerHandlers}
          className="group flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center outline-none"
        >
          <span className="h-1 w-16 rounded-full bg-night-ink/25 group-hover:bg-night-ink/40 group-focus-visible:bg-insight" />
        </div>

        <section aria-label="Speaker notes" className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-sm font-bold tracking-wide text-night-muted">
              {edit.open && edit.open.slide !== slide
                ? `Notes of slide ${edit.open.slide + 1}, being edited`
                : "Notes"}
            </h2>
            <span role="alert" className="text-sm text-red-night">
              {edit.error}
            </span>
            {EDITABLE &&
              (edit.open ? (
                <>
                  <IconButton label="Cancel editing" onClick={edit.cancel}>
                    <X className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Save notes" onClick={() => void edit.save()}>
                    <Check className="h-4 w-4" />
                    <span className="text-sm">{edit.saving ? "Saving" : "Save"}</span>
                  </IconButton>
                </>
              ) : (
                <IconButton label="Edit notes" onClick={() => edit.start(slide)}>
                  <Pencil className="h-4 w-4" />
                  <span className="text-sm">Edit</span>
                </IconButton>
              ))}
            <IconButton label="Smaller notes" onClick={() => setSize(size - 2)}>
              <Minus className="h-4 w-4" />
            </IconButton>
            <IconButton label="Larger notes" onClick={() => setSize(size + 2)}>
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
          {edit.open ? (
            <textarea
              aria-label="Speaker notes text"
              autoFocus
              spellCheck={false}
              value={edit.open.draft}
              onChange={(event) => edit.change(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") edit.cancel();
                else if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                  void edit.save();
              }}
              className="min-h-0 flex-1 resize-none rounded-sm bg-night-2 px-5 py-4 leading-relaxed text-night-ink outline-2 outline-insight"
              style={{ fontSize: size }}
            />
          ) : (
            <div
              ref={notesBox}
              className="min-h-0 flex-1 overflow-y-auto rounded-sm bg-night-2 px-5 py-4 leading-relaxed whitespace-pre-line"
              style={{ fontSize: size }}
            >
              {note || <span className="text-night-muted">No notes on this slide.</span>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Up and Down scroll the notes by most of a screen; a new slide opens its notes at the top. The
 *  deck takes neither key. */
function useNotesKeys(slide: number) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: 0 });
  }, [slide]);
  useEffect(() => {
    function scroll(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const element = box.current;
      if (!element) return;
      event.preventDefault();
      const by = element.clientHeight * 0.8;
      element.scrollBy({ top: event.key === "ArrowDown" ? by : -by, behavior: "smooth" });
    }
    window.addEventListener("keydown", scroll);
    return () => window.removeEventListener("keydown", scroll);
  }, []);
  return box;
}

/** This window's own copy of the slide, under the speaker view, takes no focus and no clicks: Tab
 *  stays in the speaker view, and nothing there can step the slide out of sync. Its key handlers
 *  listen on the window and keep working. Each slide mounts a new copy, so it watches for them. */
function useInertSlide() {
  useEffect(() => {
    const mark = () =>
      document.querySelectorAll<HTMLElement>(".slide-viewport:not([inert])").forEach((element) => {
        element.inert = true;
      });
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}

/** Where the two frames start. Set once, when the slide is first known, so a frame loads once and
 *  then follows the deck over the channel. Each frame reads its arrival direction under its own
 *  role's key, written here before it loads: the live frame opens as revealed as this window, the
 *  preview fully revealed. */
function useFrameSources(state: DeckState, basePath: string, total: number) {
  const [frames, setFrames] = useState<{ follow: string; preview: string } | null>(null);
  const known = state.slide >= 0;
  useEffect(() => {
    if (!known || frames) return;
    const { slide, back } = deckSync.getState();
    writeStored("session", directionKey(ROLE_NAMES.follow), back ? "back" : "forward");
    writeStored("session", directionKey(ROLE_NAMES.preview), "back");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set once, after the keys above
    setFrames({
      follow: `${basePath}/${slide}`,
      preview: `${basePath}/${Math.min(slide + 1, total - 1)}`,
    });
  }, [known, frames, basePath, total]);
  return frames;
}

/** A slide at the 1920x1080 the audience window is laid out for, scaled into its box. It takes no
 *  focus and no pointer, so every key stays with this window. */
function Frame({ name, src, title }: { name: string; src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.min(element.clientWidth / 1920, element.clientHeight / 1080)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className={`${FRAME_SIZE} relative overflow-hidden rounded-sm bg-black`}>
      <iframe
        name={name}
        src={src}
        title={title}
        tabIndex={-1}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
        style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/** Presses an arrow in this window, exactly as the keyboard does. */
function StepButton({
  label,
  keyName,
  icon,
}: {
  label: string;
  keyName: ArrowKey;
  icon: React.ReactNode;
}) {
  return (
    <IconButton label={label} onClick={() => document.body.dispatchEvent(arrowEvent(keyName))}>
      {icon}
    </IconButton>
  );
}

/** Round, as every control that holds only an icon (brand tokens, radius-pill). Space keeps
 *  stepping the deck while a button has focus, rather than pressing the button too; Enter presses
 *  it. */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onKeyUp={(event) => {
        if (event.key === " ") event.preventDefault();
      }}
      className="flex h-9 min-w-9 items-center justify-center gap-2 rounded-full bg-night-ink/15 px-2 text-night-ink hover:bg-night-ink/25"
    >
      {children}
    </button>
  );
}

function useNotesSize(): [number, (size: number) => void] {
  const [size, setSize] = useState(() => {
    const stored = Number(readStored("local", NOTES_SIZE_KEY));
    return stored >= 14 && stored <= 48 ? stored : 24;
  });
  return [
    size,
    (next) => {
      const clamped = Math.min(48, Math.max(14, next));
      setSize(clamped);
      writeStored("local", NOTES_SIZE_KEY, String(clamped));
    },
  ];
}

/** Edit and save a slide's notes, dev server only. Save replaces the note's string in the deck
 *  file, the one literal holding exactly the text the deck loaded; the endpoint refuses rather than
 *  guess when that literal is gone or appears twice. A saved note shows at once, before the dev
 *  server reloads the deck. While the field is open the page carries the edit mode's flag, so the
 *  deck's shortcuts ignore what is typed and the clicker waits until the field closes. */
function useNotesEdit(notes: Array<string | undefined>, basePath: string) {
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<{ slide: number; draft: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const current = (slide: number) => saved[slide] ?? notes[slide];
  const editing = open !== null;

  useEffect(() => {
    const root = document.documentElement;
    if (!editing || "deckEdit" in root.dataset) return;
    root.dataset.deckEdit = "";
    return () => {
      delete root.dataset.deckEdit;
    };
  }, [editing]);

  return {
    open,
    error,
    saving,
    current,
    start(slide: number) {
      setError(null);
      setOpen({ slide, draft: current(slide) ?? "" });
    },
    change: (draft: string) => setOpen((was) => was && { ...was, draft }),
    cancel() {
      setError(null);
      setOpen(null);
    },
    async save() {
      if (!open || saving) return;
      const from = current(open.slide);
      if (from === undefined) {
        setError("This slide has no notes field. Add one in the deck file.");
        return;
      }
      if (open.draft === from) {
        setOpen(null);
        return;
      }
      setSaving(true);
      try {
        const response = await fetch(EDIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deck: basePath, from, to: open.draft }),
        });
        const answer = (await response.json()) as { ok?: boolean; error?: string };
        if (!answer.ok) throw new Error(answer.error ?? "The deck file was not changed.");
        setSaved((was) => ({ ...was, [open.slide]: open.draft }));
        setError(null);
        setOpen(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The dev server did not answer.");
      } finally {
        setSaving(false);
      }
    },
  };
}

/** The divider between slides and notes: drag it, or focus it and press Up, Down, Home or End.
 *  Those keys stop here, so they neither scroll the notes nor reach the deck; Left, Right and the
 *  clicker keep stepping the deck while the divider has focus. Double-click resets it. The split
 *  is kept in localStorage, for the next talk too. */
function useSplit(region: React.RefObject<HTMLDivElement | null>) {
  const [split, setSplit] = useState(() => {
    const stored = Number(readStored("local", SPLIT_KEY));
    return stored >= MIN_SPLIT && stored <= MAX_SPLIT ? stored : DEFAULT_SPLIT;
  });
  const clamp = (value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
  const save = (value: number | null) => {
    const next = value === null ? DEFAULT_SPLIT : clamp(value);
    live.current = next;
    setSplit(next);
    writeStored("local", SPLIT_KEY, value === null ? null : String(next));
  };
  // Where on the divider the pointer grabbed it: the divider scales with the slide scale's rem.
  const grab = useRef(0);
  // The last dragged value: the release can arrive before React renders the last move.
  const live = useRef(split);
  const handlers = {
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (event.button !== 0) return;
      // No mousedown follows, so the laser pointer neither draws nor cancels the focus.
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      grab.current = event.clientY - event.currentTarget.getBoundingClientRect().top;
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      const box = region.current?.getBoundingClientRect();
      if (event.currentTarget.hasPointerCapture(event.pointerId) && box && box.height > 0)
        setSplit((live.current = clamp((event.clientY - grab.current - box.top) / box.height)));
    },
    // Fires on release and on a cancelled drag alike, so no drag ends unsaved.
    onLostPointerCapture: () => save(live.current),
    onDoubleClick: () => save(null),
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const next =
        event.key === "ArrowUp"
          ? split - SPLIT_STEP
          : event.key === "ArrowDown"
            ? split + SPLIT_STEP
            : event.key === "Home"
              ? MIN_SPLIT
              : event.key === "End"
                ? MAX_SPLIT
                : null;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      save(next);
    },
  };
  return [split, handlers] as const;
}

/** Elapsed time since the speaker window opened, as reveal.js counts it. Kept in sessionStorage,
 *  so a reload of the speaker window keeps the count. */
type TimerState = { start: number; pausedAt: number | null };

function readTimer(): TimerState {
  try {
    const stored = JSON.parse(readStored("session", TIMER_KEY) ?? "null") as TimerState | null;
    if (stored && typeof stored.start === "number") return stored;
  } catch {}
  const fresh = { start: Date.now(), pausedAt: null };
  writeStored("session", TIMER_KEY, JSON.stringify(fresh));
  return fresh;
}

function Timer() {
  const [timer, setTimer] = useState(readTimer);
  const now = useNow();
  const save = (next: TimerState) => {
    writeStored("session", TIMER_KEY, JSON.stringify(next));
    setTimer(next);
  };
  const elapsed = (timer.pausedAt ?? now) - timer.start;
  const paused = timer.pausedAt !== null;
  return (
    <span className="flex items-center gap-2">
      <span
        className={`font-mono text-2xl tabular-nums ${paused ? "text-night-muted" : ""}`}
        aria-label="Elapsed time"
      >
        {formatDuration(elapsed)}
      </span>
      <IconButton
        label={paused ? "Resume timer" : "Pause timer"}
        onClick={() =>
          save(
            paused
              ? { start: timer.start + Date.now() - (timer.pausedAt ?? Date.now()), pausedAt: null }
              : { ...timer, pausedAt: Date.now() },
          )
        }
      >
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </IconButton>
      <IconButton
        label="Reset timer"
        onClick={() => save({ start: Date.now(), pausedAt: paused ? Date.now() : null })}
      >
        <RotateCcw className="h-4 w-4" />
      </IconButton>
    </span>
  );
}

function Clock() {
  const now = useNow();
  return (
    <span className="font-mono text-2xl text-night-muted tabular-nums" aria-label="Clock">
      {new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })}
    </span>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

/** 0:07, 12:34, 1:02:03. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
