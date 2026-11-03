"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

type Highlighter = Pick<typeof import("./code-highlight"), "highlightLines">;

// Shiki is a large share of a deck's script and only code slides use it: it loads with the first
// slide that shows code, as recharts does with the first chart. Until then, and in the server and
// hydration render, a code block shows its lines unhighlighted in the code panel's text colour.
let loaded: Highlighter | undefined;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const subscribeLoaded = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
// `data-code-plain` marks a line still waiting for the highlighter: the PDF export waits it out.
// Where Shiki fails to load, the lines stay plain without the mark, so the export never hangs.
const markedLines = (code: string, waiting: boolean): ReactNode[] =>
  code.split("\n").map((line, i) => (
    <span key={i} data-code-plain={waiting ? "" : undefined}>
      {line || " "}
    </span>
  ));
const plainLines = (code: string) => markedLines(code, true);
const load = () => {
  loading ??= import("./code-highlight")
    .catch((): Highlighter => ({ highlightLines: (code) => markedLines(code, false) }))
    .then((m) => {
      loaded = m;
      listeners.forEach((l) => l());
    });
};

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
