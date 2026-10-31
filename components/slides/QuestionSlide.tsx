"use client";

import { useState, useEffect } from "react";
import type { QuestionSlide as QuestionSlideType } from "../../types/slide";
import { usePrintMode } from "../../lib/print-context";
import { useSlideKeyboard } from "../../lib/use-slide-keyboard";
import { BlurFade } from "../ui/blur-fade";
import { NumberTicker } from "../ui/number-ticker";
import { SlideShell } from "./SlideShell";
import {
  arrivedBackwards as readArrivedBackwards,
  directionKey,
  readStored,
  writeStored,
} from "../../lib/slide-utils";
import { Wash } from "./primitives";

interface Props {
  slide: QuestionSlideType;
}

/** Saved votes, or null where they are missing, unreadable or for another number of options. */
function parseCounts(raw: string | null, length: number): number[] | null {
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    return Array.isArray(saved) && saved.length === length && saved.every(Number.isFinite)
      ? saved
      : null;
  } catch {
    return null;
  }
}

/** The votes, kept across reloads. Saved votes load after mount: the server renders none, and a
 *  first client render that read them kept the server's "0 votes" labels. Nothing is written
 *  before they have loaded, so the zeros of the first render never overwrite them. */
function usePersistedCounts(storageKey: string, length: number, printMode: boolean) {
  const [counts, setCounts] = useState<number[]>(() => Array(length).fill(0));
  // The key whose saved votes have loaded, so a new key never receives the previous one's votes.
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (printMode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount load above
    setCounts(parseCounts(readStored("local", storageKey), length) ?? Array(length).fill(0));
    setLoaded(storageKey);
  }, [storageKey, length, printMode]);

  useEffect(() => {
    if (loaded === storageKey) writeStored("local", storageKey, JSON.stringify(counts));
  }, [counts, storageKey, loaded]);

  // A vote in another window of the deck, such as the speaker window, reaches this one through
  // the storage it wrote, so both show the same votes and neither overwrites the other's.
  useEffect(() => {
    if (printMode) return;
    const adopt = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const saved = parseCounts(event.newValue, length);
      if (saved) setCounts(saved);
    };
    window.addEventListener("storage", adopt);
    return () => window.removeEventListener("storage", adopt);
  }, [storageKey, length, printMode]);

  return [counts, setCounts] as const;
}

export function QuestionSlide({ slide }: Props) {
  const { headline, storageKey, options } = slide;
  const printMode = usePrintMode();
  const [cursor, setCursor] = useState(0);
  // A backward arrival opens at the last option, as every stepped slide opens at its last step.
  const [arrivedBackwards] = useState(() => !printMode && readArrivedBackwards());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the post-mount step above
    if (arrivedBackwards) setCursor(options.length - 1);
    writeStored("session", directionKey(), null);
  }, [arrivedBackwards, options.length]);
  const [counts, setCounts] = usePersistedCounts(storageKey, options.length, printMode);

  useSlideKeyboard({
    onRight: () => {
      if (cursor < options.length - 1) {
        setCursor((prev) => prev + 1);
        return true;
      }
      return false;
    },
    onLeft: () => {
      if (cursor > 0) {
        setCursor((prev) => prev - 1);
        return true;
      }
      return false;
    },
    onSpace: () => {
      setCounts((prev) => prev.map((c, i) => (i === cursor ? c + 1 : c)));
    },
    onBackspace: () => {
      setCounts((prev) => prev.map((c, i) => (i === cursor ? Math.max(0, c - 1) : c)));
    },
    onKey: (key) => {
      if (key === "q" || key === "Q") {
        setCounts(Array(options.length).fill(0));
      }
    },
    enabled: !printMode,
    pending: cursor < options.length - 1,
    undoable: cursor > 0,
  });

  return (
    <SlideShell direction="col">
      <Wash strength={3} />

      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-12">
        <BlurFade delay={0.1} duration={0.6}>
          <h2 className="mb-14 text-center font-heading text-5xl font-bold tracking-[-0.03em] text-text md:text-6xl">
            {headline}
          </h2>
        </BlurFade>

        <div className="w-full max-w-4xl space-y-4" role="group" aria-label={headline}>
          {options.map((option, i) => {
            const isActive = i === cursor && !printMode;
            const vote = () => {
              setCursor(i);
              setCounts((prev) => prev.map((c, idx) => (idx === i ? c + 1 : c)));
            };
            return (
              <BlurFade key={i} delay={0.2 + i * 0.05} duration={0.5}>
                <button
                  type="button"
                  onClick={vote}
                  onFocus={() => setCursor(i)}
                  disabled={printMode}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${option.label}: ${option.text}, ${counts[i]} votes`}
                  className={`flex w-full items-center justify-between rounded-brand border px-6 py-5 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${
                    isActive ? "scale-[1.01] border-primary bg-primary/7" : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 font-mono text-sm font-bold ${isActive ? "text-primary" : "text-text-subtle"}`}
                    >
                      {option.label}
                    </span>
                    <span className="text-lg text-text">{option.text}</span>
                  </div>
                  <div
                    className="min-w-[3ch] text-right font-mono text-xl font-bold text-primary"
                    aria-live="polite"
                  >
                    <NumberTicker value={counts[i]} />
                  </div>
                </button>
              </BlurFade>
            );
          })}
        </div>

        {!printMode && (
          <p className="mt-10 text-sm text-text-subtle">
            → next · ← prev · Space vote · Backspace undo · Q reset
          </p>
        )}
      </div>
    </SlideShell>
  );
}
