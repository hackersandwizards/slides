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
import { formatDuration, readStored, writeStored } from "../../lib/slide-utils";
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

// The moment the room works instead of the slides: an exercise, a live demo or a debrief. The
// steps, watch points or questions run down the left, numbered except a demo's; the frame of the
// activity (time, who works with whom, what comes out) stands in one card on the right, each line
// under an icon rather than a word, so a German and an English deck read the same.
export function ActivitySlide({ slide }: Props) {
  const numbered = slide.kind !== "demo";
  const frame = [
    { icon: iconMap.timer, text: slide.duration, lead: true },
    { icon: iconMap.users, text: slide.mode },
    { icon: iconMap.target, text: slide.outcome },
  ].filter((line) => line.text);

  return (
    <SlideShell>
      <TitledContent>
        <SectionHeader label={slide.label ?? LABELS[slide.kind]} />
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
              <ol className="flex flex-col gap-6">
                {slide.items.map((item, i) => (
                  <BlurFade
                    key={i}
                    delay={0.25 + i * 0.05}
                    duration={0.4}
                    as="li"
                    className="flex items-baseline gap-5 text-2xl text-text md:text-3xl"
                  >
                    {numbered ? (
                      <span className="w-10 shrink-0 font-semibold text-primary tabular-nums">
                        {i + 1}.
                      </span>
                    ) : (
                      <span className="hw-marker" />
                    )}
                    <span>{renderMarkdown(item)}</span>
                  </BlurFade>
                ))}
              </ol>
              <ActivityTimer headline={slide.headline} duration={slide.duration} />
            </div>
            {frame.length > 0 && (
              <BlurFade
                delay={0.3}
                duration={0.4}
                className="md:w-(--slide-activity-frame) md:shrink-0"
              >
                <SlideCard className="flex flex-col gap-6 card-pad-8/9">
                  {frame.map(({ icon: Icon, text, lead }, i) => (
                    <div key={i} className="flex items-baseline gap-4">
                      <Icon className="h-7 w-7 shrink-0 translate-y-1 text-primary" aria-hidden />
                      <span
                        className={
                          lead
                            ? "font-mono text-4xl font-bold text-text"
                            : "text-2xl text-text-muted"
                        }
                      >
                        {renderMarkdown(text!)}
                      </span>
                    </div>
                  ))}
                </SlideCard>
              </BlurFade>
            )}
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

/** The minutes of a timebox such as "3 min", else 2, the room's usual think time. */
export function timerMinutes(duration?: string) {
  const minutes = Number.parseInt(duration ?? "", 10);
  return minutes >= 1 ? Math.min(minutes, MAX_MINUTES) : 2;
}

const fresh = (minutes: number): TimerState => ({
  minutes,
  endsAt: null,
  left: minutes * MINUTE,
  at: 0,
});

function parseTimer(value: string | null): TimerState | null {
  try {
    const state = JSON.parse(value ?? "null") as TimerState | null;
    if (state && typeof state.minutes === "number" && Date.now() - state.at < STALE_MS)
      return state;
  } catch {}
  return null;
}

// Read only in event handlers and effects, never while rendering.
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
const change = (by: number) => (timer: TimerState) => {
  const minutes = Math.min(MAX_MINUTES, Math.max(1, timer.minutes + by));
  const shift = (minutes - timer.minutes) * MINUTE;
  if (timer.endsAt !== null) return { ...timer, minutes, endsAt: timer.endsAt + shift };
  return { ...timer, minutes, left: Math.max(0, timer.left + shift) };
};

/** The countdown the presenter starts while the room thinks: a click on the time starts and
 *  pauses it, and at zero restarts it; minus and plus change it by a minute, running or not. It
 *  is kept in localStorage, so the speaker window's frame of the slide counts along, as a vote on
 *  a question slide does. Nothing on paper: the print page, the PDF and the PPTX draw no timer. */
function ActivityTimer({ headline, duration }: { headline: string; duration?: string }) {
  const printMode = usePrintMode();
  const key = `hw-activity-timer:${headline}`;
  const [timer, setTimer] = useState(() => fresh(timerMinutes(duration)));
  const [now, setNow] = useState(clock);

  // The saved timer loads after mount, as the server renders none.
  useEffect(() => {
    if (printMode) return;
    const saved = parseTimer(readStored("local", key));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount load above
    if (saved) setTimer(saved);
    const adopt = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = parseTimer(event.newValue);
      if (next) setTimer(next);
    };
    window.addEventListener("storage", adopt);
    return () => window.removeEventListener("storage", adopt);
  }, [key, printMode]);

  const left = Math.max(0, timer.endsAt === null ? timer.left : timer.endsAt - now);
  const ended = left === 0;
  const running = timer.endsAt !== null && !ended;
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(tick);
  }, [running]);

  if (printMode) return null;

  // Counted up to the whole second, so a started 3:00 shows 3:00 and 0:00 only once it is over.
  const shown = formatDuration(Math.ceil(left / 1000) * 1000);
  const save = (next: (state: TimerState, now: number) => Omit<TimerState, "at">) => {
    const at = clock();
    const state = { ...next(settle(timer, at), at), at };
    writeStored("local", key, JSON.stringify(state));
    setNow(at);
    setTimer(state);
  };
  // A pointer click leaves no focus on the control, so the clicker's keys reach the deck alone.
  const press = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail) event.currentTarget.blur();
  };

  return (
    <div className="flex items-center gap-4" data-activity-timer>
      <button
        type="button"
        className="hw-icon-button"
        aria-label="One minute less"
        onClick={press(() => save(change(-1)))}
      >
        <Minus aria-hidden />
      </button>
      <button
        type="button"
        className="hw-button gap-3"
        data-variant={ended ? undefined : "secondary"}
        aria-label={`${running ? "Pause" : ended ? "Restart" : "Start"} timer, ${shown} left`}
        onClick={press(() => save(toggle))}
      >
        {running ? <Pause aria-hidden /> : ended ? <RotateCcw aria-hidden /> : <Play aria-hidden />}
        <span
          className={`font-mono text-4xl font-bold tabular-nums ${ended ? "motion-safe:animate-pulse" : ""}`}
        >
          {shown}
        </span>
      </button>
      <button
        type="button"
        className="hw-icon-button"
        aria-label="One minute more"
        onClick={press(() => save(change(1)))}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
