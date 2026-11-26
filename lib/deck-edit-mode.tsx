"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { resolveDeckClick } from "./deck-edit-client";
import { createEditOverlay, DECK_EDIT_LEAD, type EditNote } from "./deck-edit-field";
import { deckSync } from "./presenter-sync";
import { dialogOpen } from "./slide-input";
import { readStored, writeStored } from "./browser-storage";
import { useMounted } from "./use-mounted";

/** Edit mode, local development only, in a tab opened once with `?edit`, so a stray E while
 *  presenting from the dev server never starts it: E toggles it, a click on a text opens that
 *  text's source string in a field over it, Enter or a click elsewhere writes it into the deck
 *  file, Escape cancels. `DeckView` mounts this in dev only, and each host serves `/api/deck-edit` from
 *  its dev server only (`deck-edit-server.ts`), so neither reaches a production build.
 *
 *  The field sits in its own frame: the deck's shortcuts listen on this window, several in the
 *  capture phase, and typing H, S, F or Space there would fire them. */

const STORAGE_KEY = "deck-edit";
/** Set by `?edit` for the tab's session, which survives the reload a save causes and the
 *  navigation that drops the query. */
const ARMED_KEY = "deck-edit-armed";

const STYLE = `
html[data-deck-edit] body :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd):hover,
html[data-deck-edit] body *:not(:has(*)):hover { outline: var(--slide-edit-outline) dashed ${DECK_EDIT_LEAD}; outline-offset: var(--slide-edit-outline); cursor: text; }`;

function collectElementChain(target: EventTarget | null): Element[] {
  const chain: Element[] = [];
  for (
    let element = target as Element | null;
    element && element !== document.body && chain.length < 12;
    element = element.parentElement
  )
    chain.push(element);
  return chain;
}

// A refusal opens no field, so the refused text itself shows it, next to where the eye is.
// Each outlined element keeps its own outline and one timer: a second refusal while the first
// shows restarts the timer and still restores the element's own outline, never the red.
class RefusalMarks {
  private readonly marks = new Map<
    HTMLElement,
    { outline: string; timer: ReturnType<typeof setTimeout> }
  >();

  mark(element: Element) {
    if (!(element instanceof HTMLElement)) return;
    const outline = this.marks.get(element)?.outline ?? element.style.outline;
    clearTimeout(this.marks.get(element)?.timer);
    element.style.outline = "var(--slide-rule-strong) solid var(--color-red)";
    this.marks.set(element, { outline, timer: setTimeout(() => this.restore(element), 2500) });
  }

  restore(element: HTMLElement) {
    const entry = this.marks.get(element);
    if (!entry) return;
    clearTimeout(entry.timer);
    element.style.outline = entry.outline;
    this.marks.delete(element);
  }

  clear = () => this.marks.forEach((_, element) => this.restore(element));
}

function useFlashNote() {
  const [note, setNote] = useState<EditNote | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setNote(null);
  }, []);
  const flash = useCallback((next: EditNote) => {
    clearTimeout(timer.current);
    setNote(next);
    timer.current = setTimeout(() => setNote(null), next.error ? 6000 : 2500);
  }, []);
  return { note, flash, clear };
}

function useEditModeToggle(): boolean {
  // Stays on across the reload a save causes: read after hydration, so the server render agrees.
  const mounted = useMounted();
  const [choice, setChoice] = useState<boolean | null>(null);
  const on = choice ?? (mounted && readStored("session", STORAGE_KEY) === "on");
  // The audience window only: the speaker window's slide sits inert under the speaker view, which
  // edits notes itself, and its frames are previews.
  const [audience] = useState(() => deckSync.role() === "audience");
  const opted = mounted && new URLSearchParams(location.search).has("edit");
  const active = audience && mounted && (opted || readStored("session", ARMED_KEY) === "on");

  useEffect(() => {
    if (opted) writeStored("session", ARMED_KEY, "on");
  }, [opted]);

  useEffect(() => {
    if (!active) return;
    const toggle = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") return;
      if (event.metaKey || event.ctrlKey || event.altKey || dialogOpen()) return;
      if ((event.target as Element | null)?.closest?.("input, textarea, [contenteditable]")) return;
      setChoice((was) => {
        const next = !(was ?? readStored("session", STORAGE_KEY) === "on");
        writeStored("session", STORAGE_KEY, next ? "on" : null);
        return next;
      });
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [active]);

  return on && active;
}

export async function applyDeckClick(
  deck: string,
  chain: Element[],
  ui: {
    open: (target: { deck: string; element: Element; value: string }) => void;
    flash: (note: EditNote) => void;
    mark: (element: Element) => void;
  },
): Promise<void> {
  const result = await resolveDeckClick(deck, chain);
  if ("value" in result) {
    ui.open({ deck, ...result });
    return;
  }
  ui.flash({ text: result.error, error: true });
  ui.mark(chain[0]);
}

function useDeckEditSession(
  deck: string,
  enabled: boolean,
  badge: RefObject<HTMLDivElement | null>,
): EditNote | null {
  const { note, flash, clear } = useFlashNote();

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.dataset.deckEdit = "";
    // A press outside an open field commits that field: the click it ends picks nothing.
    let committing = false;
    const marks = new RefusalMarks();
    const overlay = createEditOverlay(flash);
    const outside = (event: Event) => !badge.current?.contains(event.target as Node);
    // Propagation only: the default moves focus, which blurs an open field and so saves it.
    const swallow = (event: Event) => {
      if (!outside(event)) return;
      event.stopPropagation();
      committing = overlay.isOpen();
    };
    const pick = (event: MouseEvent) => {
      if (!outside(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (committing) {
        committing = false;
        return;
      }
      const chain = collectElementChain(event.target);
      // A click on the page itself, outside every element, has no text to edit.
      if (!chain.length) return;
      void applyDeckClick(deck, chain, {
        open: (target) => overlay.open(target),
        flash,
        mark: (element) => marks.mark(element),
      });
    };

    // Capture on the window runs before the slide's own pointer handlers, the laser among them.
    window.addEventListener("mousedown", swallow, true);
    window.addEventListener("click", pick, true);
    return () => {
      window.removeEventListener("mousedown", swallow, true);
      window.removeEventListener("click", pick, true);
      delete document.documentElement.dataset.deckEdit;
      marks.clear();
      clear();
      overlay.close();
    };
  }, [enabled, deck, badge, flash, clear]);

  return note;
}

export function DeckEdit({ deck }: { deck: string }) {
  const enabled = useEditModeToggle();
  const badge = useRef<HTMLDivElement>(null);
  const note = useDeckEditSession(deck, enabled, badge);

  if (!enabled) return null;
  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={badge}
        role="status"
        style={{ zIndex: 90, background: note?.error ? "var(--color-red)" : DECK_EDIT_LEAD }}
        className="fixed bottom-4 left-4 max-w-md rounded-sm px-3 py-2 font-sans text-sm text-white shadow-overlay"
      >
        {note?.text ?? "Edit mode: click a text. Enter saves, Esc cancels, E ends."}
      </div>
    </>
  );
}
