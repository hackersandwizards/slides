"use client";

import { useEffect, useState, type ReactNode } from "react";
import ChevronLeft from "lucide-react/icons/chevron-left";
import ChevronRight from "lucide-react/icons/chevron-right";
import Pause from "lucide-react/icons/pause";
import Play from "lucide-react/icons/play";
import RotateCcw from "lucide-react/icons/rotate-ccw";
import { arrowEvent, type ArrowKey } from "../../lib/presenter-sync";
import { formatDuration, parseStoredJson, readStored, writeStored } from "../../lib/slide-utils";
import { PresenterIconButton } from "./PresenterIconButton";

const TIMER_KEY = "slide-speaker-timer";

/** Elapsed time since the speaker window opened, as reveal.js counts it. Kept in sessionStorage,
 *  so a reload of the speaker window keeps the count. */
type SpeakerTimerState = { start: number; pausedAt: number | null };

function readSpeakerTimer(): SpeakerTimerState {
  const stored = parseStoredJson(readStored("session", TIMER_KEY)) as SpeakerTimerState | null;
  if (stored && typeof stored.start === "number") return stored;
  const fresh = { start: Date.now(), pausedAt: null };
  writeStored("session", TIMER_KEY, JSON.stringify(fresh));
  return fresh;
}

function useSpeakerClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function StepButton({
  label,
  keyName,
  icon,
}: {
  label: string;
  keyName: ArrowKey;
  icon: ReactNode;
}) {
  return (
    <PresenterIconButton
      label={label}
      onClick={() => document.body.dispatchEvent(arrowEvent(keyName))}
    >
      {icon}
    </PresenterIconButton>
  );
}

function PresenterTimer() {
  const [timer, setTimer] = useState(readSpeakerTimer);
  const now = useSpeakerClock();
  const save = (next: SpeakerTimerState) => {
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
      <PresenterIconButton
        label={paused ? "Resume timer" : "Pause timer"}
        onClick={() =>
          save(
            paused
              ? { start: timer.start + Date.now() - (timer.pausedAt ?? Date.now()), pausedAt: null }
              : { ...timer, pausedAt: Date.now() },
          )
        }
      >
        {paused ? <Play /> : <Pause />}
      </PresenterIconButton>
      <PresenterIconButton
        label="Reset timer"
        onClick={() => save({ start: Date.now(), pausedAt: paused ? Date.now() : null })}
      >
        <RotateCcw />
      </PresenterIconButton>
    </span>
  );
}

function PresenterClock() {
  const now = useSpeakerClock();
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

function speakerStatusLabel(pending: boolean, last: boolean): string {
  if (pending) return "More on this slide";
  return last ? "Last slide" : "Next press: next slide";
}

export function PresenterHeader({
  slide,
  total,
  pending,
}: {
  slide: number;
  total: number;
  pending: boolean;
}) {
  const last = slide >= total - 1;
  return (
    <header className="flex items-center gap-6 text-lg">
      <span className="font-mono text-2xl font-bold tabular-nums">
        {slide + 1} / {total}
      </span>
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${pending ? "bg-amber text-night" : "bg-night-ink/15 text-night-muted"}`}
      >
        {speakerStatusLabel(pending, last)}
      </span>
      <span className="flex-1" />
      <StepButton label="Previous" keyName="ArrowLeft" icon={<ChevronLeft />} />
      <StepButton label="Next" keyName="ArrowRight" icon={<ChevronRight />} />
      <PresenterTimer />
      <PresenterClock />
    </header>
  );
}
