"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMounted } from "../../lib/use-mounted";
import { usePendingReveal } from "../../lib/use-progressive-reveal";
import { deckSync, ROLE_NAMES, type DeckState } from "../../lib/presenter-sync";
import { directionKey, writeStored } from "../../lib/slide-utils";
import { MAX_SPLIT, MIN_SPLIT, usePresenterSplit } from "../../lib/use-presenter-split";
import { PresenterHeader } from "./PresenterHeader";
import { SpeakerNotes } from "./SpeakerTextPanel";

interface Props {
  /** Every slide's speaker notes, in deck order. */
  notes: Array<string | undefined>;
  basePath: string;
}

interface FrameSources {
  follow: string;
  preview: string;
  back: boolean;
}

/** The slides keep their headings and a visible frame, the notes their heading and a few lines,
 *  whatever the window's height. */
const MIN_SLIDES_PX = 120;
const MIN_NOTES_PX = 176;
/** 16:9 at the largest size its box allows, so a shorter box narrows the slide. */
const FRAME_SIZE = "aspect-video w-(--slide-presenter-frame)";
const SERVER_STATE: DeckState = { slide: -1, back: false, step: 0, at: 0, from: "" };

/** The speaker window: the slide as the audience sees it, the next slide, the notes, a timer and
 *  the clock. It renders only in the window `S` opened (or a link with `?presenter`), above that
 *  window's own copy of the slide, which keeps taking the keys and the clicker, so every press
 *  here runs exactly as it would in the audience window and is mirrored there.
 *
 *  It sits outside the per-slide tree in DeckView, so its frames load once and then follow the
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
  const slide = Math.max(state.slide, 0);
  const last = slide >= total - 1;
  useInertSlide();
  const region = useRef<HTMLDivElement>(null);
  const [split, dividerHandlers] = usePresenterSplit(region);

  return (
    <div
      data-theme="dark"
      data-hw-scale="dense"
      className="slide-presenter fixed inset-0 z-[55] flex flex-col gap-4 bg-night p-4 font-sans text-night-ink"
    >
      <PresenterHeader slide={slide} total={total} pending={pending} />

      {/* The slides on top, the notes across the full width below: the notes are what this
          window is for, and a wide line of them reads at a glance. The divider between them
          trades the slides' height for the notes'. */}
      <div ref={region} className="flex min-h-0 flex-1 flex-col">
        <SlidePreviewRow frames={frames} last={last} split={split} />
        <SplitDivider split={split} handlers={dividerHandlers} />
        <SpeakerNotes notes={notes} slide={slide} basePath={basePath} />
      </div>
    </div>
  );
}

function SlidePreviewRow({
  frames,
  last,
  split,
}: {
  frames: FrameSources | null;
  last: boolean;
  split: number;
}) {
  return (
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
            <Frame
              name={ROLE_NAMES.follow}
              src={frames.follow}
              back={frames.back}
              title="Current slide"
            />
          )}
        </div>
      </section>

      <section aria-label="Next slide" className="flex min-h-0 flex-col gap-2">
        <h2 className="text-sm font-bold tracking-wide text-night-muted">Next slide</h2>
        <div className="[container-type:size] min-h-0 flex-1">
          <div className={last ? "hidden" : "contents"}>
            {frames && (
              <Frame name={ROLE_NAMES.preview} src={frames.preview} back title="Next slide" />
            )}
          </div>
          {last && (
            <p
              className={`${FRAME_SIZE} flex items-center justify-center rounded-brand border border-night-ink/15 text-night-muted`}
            >
              End of the deck
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SplitDivider({
  split,
  handlers,
}: {
  split: number;
  handlers: ReturnType<typeof usePresenterSplit>[1];
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize slides and notes"
      aria-valuemin={MIN_SPLIT * 100}
      aria-valuemax={MAX_SPLIT * 100}
      aria-valuenow={Math.round(split * 100)}
      tabIndex={0}
      title="Drag to resize, double-click to reset"
      {...handlers}
      className="group flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center outline-none"
    >
      <span className="h-1 w-16 rounded-full bg-night-ink/25 group-hover:bg-night-ink/40 group-focus-visible:bg-amber" />
    </div>
  );
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
  const [frames, setFrames] = useState<FrameSources | null>(null);
  const { slide, back } = state;
  if (frames === null && slide >= 0) {
    setFrames({
      follow: `${basePath}/${slide}`,
      preview: `${basePath}/${Math.min(slide + 1, total - 1)}`,
      back,
    });
  }
  return frames;
}

/** A slide at the 1920x1080 the audience window is laid out for, scaled into its box. It takes no
 *  focus and no pointer, so every key stays with this window. */
function Frame({
  name,
  src,
  back,
  title,
}: {
  name: string;
  src: string;
  back: boolean;
  title: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = frame.current;
    if (!element || element.getAttribute("src") === src) return;
    writeStored("session", directionKey(name), back ? "back" : "forward");
    element.src = src;
  }, [name, src, back]);
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
    <div ref={box} className={`${FRAME_SIZE} relative overflow-hidden rounded-brand bg-black`}>
      <iframe
        ref={frame}
        name={name}
        title={title}
        tabIndex={-1}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
        style={{
          width: "var(--slide-page-width)",
          height: "var(--slide-page-height)",
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}
