"use client";

import { useEffect, useState } from "react";
import Minus from "lucide-react/icons/minus";
import Pause from "lucide-react/icons/pause";
import Play from "lucide-react/icons/play";
import Plus from "lucide-react/icons/plus";
import RotateCcw from "lucide-react/icons/rotate-ccw";
import type { ActivitySlide as ActivitySlideType } from "../../types/slide";
import { iconMap } from "../../lib/icons";
import { usePrintMode } from "../../lib/print-context";
import { useMounted } from "../../lib/use-mounted";
import { parseStoredJson, readStored, writeStored } from "../../lib/browser-storage";
import { formatDuration } from "../../lib/slide-timing";
import { renderMarkdown } from "../../lib/markdown";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { SlideShell } from "./SlideShell";
import { SlideCard, SlideSubtitle, SlideTitle, TitledContent } from "./primitives";

interface Props {
  slide: ActivitySlideType;
}

const LABELS: Record<ActivitySlideType["kind"], string> = {
  exercise: "Hands-on",
  demo: "Live demo",
  debrief: "Debrief",
};

function ActivitySteps({ items, numbered }: { items: string[]; numbered: boolean }) {
  return (
    <ol className="flex flex-col gap-6">
      {items.map((item, i) => (
        <BlurFade
          key={i}
          delay={0.25 + i * 0.05}
          duration={0.4}
          as="li"
          className="flex items-baseline gap-5 text-2xl text-text md:text-3xl"
        >
          {numbered ? (
            <span className="w-10 shrink-0 font-semibold text-primary tabular-nums">{i + 1}.</span>
          ) : (
            <span className="hw-marker" />
          )}
          <span>{renderMarkdown(item)}</span>
        </BlurFade>
      ))}
    </ol>
  );
}

function ActivityFrame({
  duration,
  mode,
  outcome,
}: Pick<ActivitySlideType, "duration" | "mode" | "outcome">) {
  const frame = [
    { icon: iconMap.timer, text: duration, lead: true },
    { icon: iconMap.users, text: mode },
    { icon: iconMap.target, text: outcome },
  ].filter((line) => line.text);

  if (frame.length === 0) return null;

  return (
    <BlurFade delay={0.3} duration={0.4} className="md:w-(--slide-activity-frame) md:shrink-0">
      <SlideCard className="flex flex-col gap-6 card-pad-8/9">
        {frame.map(({ icon: Icon, text, lead }, i) => (
          <div key={i} className="flex items-baseline gap-4">
            <Icon className="h-7 w-7 shrink-0 translate-y-1 text-primary" aria-hidden />
            <span
              className={
                lead ? "font-mono text-4xl font-bold text-text" : "text-2xl text-text-muted"
              }
            >
              {renderMarkdown(text!)}
            </span>
          </div>
        ))}
      </SlideCard>
    </BlurFade>
  );
}

// The moment the room works instead of the slides: an exercise, a live demo or a debrief. The
// steps, watch points or questions run down the left, numbered except a demo's; the frame of the
// activity (time, who works with whom, what comes out) stands in one card on the right, each line
// under an icon rather than a word, so a German and an English deck read the same.
export function ActivitySlide({ slide }: Props) {
  const label = slide.label ?? (Object.hasOwn(LABELS, slide.kind) ? LABELS[slide.kind] : undefined);
  return (
    <SlideShell>
      <TitledContent>
        <SectionHeader label={label} />
        <SlideTitle delay={0.15}>{renderMarkdown(slide.headline)}</SlideTitle>
        {slide.task && <SlideSubtitle delay={0.22}>{renderMarkdown(slide.task)}</SlideSubtitle>}

        <div className="slide-body">
          {slide.prompt && (
            <BlurFade delay={0.24} duration={0.4}>
              <SlideCard
                tone="primary"
                look="soft"
                className="mb-10 text-3xl font-medium text-text card-pad-6/9"
              >
                {renderMarkdown(slide.prompt)}
              </SlideCard>
            </BlurFade>
          )}
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-16">
            <div className="flex flex-1 flex-col gap-10">
              <ActivitySteps items={slide.items} numbered={slide.kind !== "demo"} />
              <ActivityTimer headline={slide.headline} duration={slide.duration} />
            </div>
            <ActivityFrame duration={slide.duration} mode={slide.mode} outcome={slide.outcome} />
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}

const MINUTE = 60_000;
const MAX_MINUTES = 60;
// A timer left in storage longer than this is a rehearsal's, and the slide opens fresh.
const STALE_MS = 3 * 60 * MINUTE;

/** The countdown's state: `endsAt` while it runs, else the time `left`; `at` is when it was saved. */
type TimerState = { minutes: number; endsAt: number | null; left: number; at: number };

type TimerStatus = "running" | "ended" | "idle";

const TIMER_CONTROL: Record<
  TimerStatus,
  { action: string; icon: typeof Play; variant?: "secondary"; pulse: string }
> = {
  running: { action: "Pause", icon: Pause, variant: "secondary", pulse: "" },
  ended: { action: "Restart", icon: RotateCcw, pulse: "motion-safe:animate-pulse" },
  idle: { action: "Start", icon: Play, variant: "secondary", pulse: "" },
};

/** The minutes of a timebox such as "3 min" or "ca. 15 Min.", its first number, else 2, the room's
 *  usual think time. */
export function timerMinutes(duration = "") {
  const minutes = Number(/\d+/.exec(duration)?.[0]);
  return minutes >= 1 ? Math.min(minutes, MAX_MINUTES) : 2;
}

const fresh = (minutes: number): TimerState => ({
  minutes,
  endsAt: null,
  left: minutes * MINUTE,
  at: 0,
});

function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

function parseTimer(value: string | null, now: number): TimerState | null {
  const state = parseStoredJson(value);
  if (typeof state !== "object" || state === null) return null;
  const { minutes, endsAt, left, at }: Partial<Record<keyof TimerState, unknown>> = state;
  if (!isFiniteNumber(minutes) || !isFiniteNumber(left) || !isFiniteNumber(at)) return null;
  if (endsAt !== null && !isFiniteNumber(endsAt)) return null;
  if (!(now - at < STALE_MS)) return null;
  return { minutes, endsAt, left, at };
}

const clock = () => Date.now();

/** A running timer whose end has passed is one stopped at zero. */
const settle = (timer: TimerState, now: number): TimerState =>
  timer.endsAt !== null && timer.endsAt <= now ? { ...timer, endsAt: null, left: 0 } : timer;

/** A click on the time: a running timer pauses, one at zero starts over, any other runs. */
function toggle(timer: TimerState, now: number) {
  if (timer.endsAt !== null)
    return { ...timer, endsAt: null, left: Math.max(0, timer.endsAt - now) };
  if (timer.left <= 0) return fresh(timer.minutes);
  return { ...timer, endsAt: now + timer.left };
}

/** Minus or plus: a minute fewer or more, taken off or added to the time left, running or not. */
function change(timer: TimerState, by: number) {
  const minutes = Math.min(MAX_MINUTES, Math.max(1, timer.minutes + by));
  const shift = (minutes - timer.minutes) * MINUTE;
  if (timer.endsAt !== null) return { ...timer, minutes, endsAt: timer.endsAt + shift };
  return { ...timer, minutes, left: Math.max(0, timer.left + shift) };
}

function timerStatus(timer: TimerState, left: number): TimerStatus {
  if (left === 0) return "ended";
  return timer.endsAt !== null ? "running" : "idle";
}

// A pointer click leaves no focus on the control, so the clicker's keys reach the deck alone.
function onPointerAction(action: () => void) {
  return (event: React.MouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail) event.currentTarget.blur();
  };
}

function useActivityTimer(headline: string, duration: string | undefined, enabled: boolean) {
  const key = `hw-activity-timer:${headline}`;
  const [timer, setTimer] = useState(() => fresh(timerMinutes(duration)));
  const [now, setNow] = useState(clock);

  const storageKey = useMounted() && enabled ? key : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (storageKey !== loadedKey) {
    setLoadedKey(storageKey);
    if (storageKey !== null) {
      const saved = parseTimer(readStored("local", storageKey), clock());
      if (saved) setTimer(saved);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const adopt = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = parseTimer(event.newValue, clock());
      if (next) setTimer(next);
    };
    window.addEventListener("storage", adopt);
    return () => window.removeEventListener("storage", adopt);
  }, [key, enabled]);

  const left = Math.max(0, timer.endsAt === null ? timer.left : timer.endsAt - now);
  const status = timerStatus(timer, left);
  const running = status === "running";
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(tick);
  }, [running]);

  const save = (next: (state: TimerState, now: number) => Omit<TimerState, "at">) => {
    const at = clock();
    const state = { ...next(settle(timer, at), at), at };
    writeStored("local", key, JSON.stringify(state));
    setNow(at);
    setTimer(state);
  };

  return {
    left,
    status,
    toggleTimer: () => save(toggle),
    adjustMinutes: (by: number) => save((state) => change(state, by)),
  };
}

/** The countdown the presenter starts while the room thinks: a click on the time starts and
 *  pauses it, and at zero restarts it; minus and plus change it by a minute, running or not. It
 *  is kept in localStorage, so the speaker window's frame of the slide counts along, as a vote on
 *  a question slide does. Nothing on paper: the print page, the PDF and the PPTX draw no timer. */
function ActivityTimer({ headline, duration }: { headline: string; duration?: string }) {
  const printMode = usePrintMode();
  const { left, status, toggleTimer, adjustMinutes } = useActivityTimer(
    headline,
    duration,
    !printMode,
  );
  if (printMode) return null;

  // Counted up to the whole second, so a started 3:00 shows 3:00 and 0:00 only once it is over.
  const shown = formatDuration(Math.ceil(left / 1000) * 1000);
  const { action, icon: Icon, variant, pulse } = TIMER_CONTROL[status];

  return (
    <div className="flex items-center gap-4" data-activity-timer>
      <button
        type="button"
        className="hw-icon-button"
        aria-label="One minute less"
        onClick={onPointerAction(() => adjustMinutes(-1))}
      >
        <Minus aria-hidden />
      </button>
      <button
        type="button"
        className="hw-button gap-3"
        data-variant={variant}
        aria-label={`${action} timer, ${shown} left`}
        onClick={onPointerAction(toggleTimer)}
      >
        <Icon aria-hidden />
        <span className={`font-mono text-4xl font-bold tabular-nums ${pulse}`}>{shown}</span>
      </button>
      <button
        type="button"
        className="hw-icon-button"
        aria-label="One minute more"
        onClick={onPointerAction(() => adjustMinutes(1))}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
