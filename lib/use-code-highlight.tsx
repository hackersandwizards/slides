"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

type Highlighter = typeof import("./code-highlight");

// Shiki is a large share of a deck's script and only code slides use it: it loads with the first
// slide that shows code, as recharts does with the first chart. Until then, and in the server and
// hydration render, a code block shows its lines unhighlighted in the brand's night-muted, the
// grey closest to the theme's foreground.
let loaded: Highlighter | undefined;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const subscribeLoaded = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const load = () => {
  loading ??= import("./code-highlight").then((m) => {
    loaded = m;
    listeners.forEach((l) => l());
  });
};

const plainLines = (code: string): ReactNode[] =>
  code.split("\n").map((line, i) => (
    <span key={i} className="text-night-muted">
      {line || " "}
    </span>
  ));

/** `highlightLines` from `code-highlight` once it has loaded, plain lines until then. */
export function useHighlightLines(): (code: string, language?: string) => ReactNode[] {
  const highlighter = useSyncExternalStore(
    subscribeLoaded,
    () => loaded,
    () => undefined,
  );
  useEffect(load, []);
  return highlighter?.highlightLines ?? plainLines;
}

/** A code block's lines, one element each. */
export function CodeLines({ code, language }: { code: string; language?: string }) {
  const highlightLines = useHighlightLines();
  return highlightLines(code, language).map((line, i) => <div key={i}>{line}</div>);
}
