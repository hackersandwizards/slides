"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { deckSync } from "./presenter-sync";
import { dialogOpen, directionKey, readStored, writeStored } from "./slide-utils";
import { useMounted } from "./use-mounted";

/** Edit mode, local development only, in a tab opened once with `?edit`, so a stray E while
 *  presenting from the dev server never starts it: E toggles it, a click on a text opens that
 *  text's source string in a field over it, Enter or a click elsewhere writes it into the deck
 *  file, Escape cancels. `DeckView` mounts this in dev only, and each host serves `ENDPOINT` from
 *  its dev server only (`deck-edit-server.ts`), so neither reaches a production build.
 *
 *  The field sits in its own frame: the deck's shortcuts listen on this window, several in the
 *  capture phase, and typing H, S, F or Space there would fire them. */

const ENDPOINT = "/api/deck-edit";
const STORAGE_KEY = "deck-edit";
/** Set by `?edit` for the tab's session, which survives the reload a save causes and the
 *  navigation that drops the query. */
const ARMED_KEY = "deck-edit-armed";
const LEAD = "var(--color-teal)";

type Answer = { value?: string; index?: number; error?: string; ok?: boolean };

async function ask(body: object): Promise<Answer> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as Answer;
  } catch {
    return { error: "The dev server did not answer." };
  }
}

const STYLE = `
html[data-deck-edit] body :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd):hover,
html[data-deck-edit] body *:not(:has(*)):hover { outline: var(--slide-edit-outline) dashed ${LEAD}; outline-offset: var(--slide-edit-outline); cursor: text; }`;

// The field is its own document, where the deck's custom properties do not reach: its tokens are
// read off the deck when the field opens.
const fieldDoc = () => {
  const token = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `<!doctype html><style>html,body{margin:0;height:100%}textarea{box-sizing:border-box;
width:100%;height:100%;border:0;padding:${token("--slide-edit-field-padding")};font:${token("--slide-edit-field-font")};
color:${token("--color-ink")};background:${token("--color-white")};resize:none;outline:none}</style><textarea spellcheck="false"></textarea>`;
};

type EditNote = { text: string; error: boolean };
type EditTarget = { deck: string; element: Element; value: string };

function editFieldBox(
  rect: Pick<DOMRect, "left" | "top" | "width">,
  viewport: { width: number; height: number },
) {
  const width = Math.min(Math.max(rect.width + 16, 360), viewport.width - 16);
  const left = Math.min(Math.max(rect.left - 8, 8), viewport.width - width - 8);
  const top = Math.min(Math.max(rect.top - 8, 8), viewport.height - 120);
  return { left, top, width };
}

function createEditFrame(element: Element): HTMLIFrameElement {
  const box = editFieldBox(element.getBoundingClientRect(), {
    width: innerWidth,
    height: innerHeight,
  });
  const frame = document.createElement("iframe");
  frame.title = "Edit text";
  Object.assign(frame.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: "var(--slide-edit-field)",
    zIndex: "90",
    border: `var(--slide-edit-outline) solid ${LEAD}`,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-white)",
    boxShadow: "var(--shadow-overlay)",
  });
  frame.srcdoc = fieldDoc();
  return frame;
}

async function submitDeckEdit(deck: string, from: string, to: string): Promise<Answer> {
  // The save reloads the slide. Arriving "backwards" opens it fully revealed, so the
  // result shows; a host that refreshes in place keeps the slide, and the mark is dropped.
  writeStored("session", directionKey(), "back");
  setTimeout(() => writeStored("session", directionKey(), null), 3000);
  const answer = await ask({ deck, from, to });
  // Nothing was saved, so a reload must open the slide as it was.
  if (!answer.ok) writeStored("session", directionKey(), null);
  return answer;
}

async function resolveDeckClick(
  deck: string,
  chain: Element[],
): Promise<{ element: Element; value: string } | { error: string }> {
  const texts = chain.map((element) => (element.textContent ?? "").slice(0, 4000));
  const answer = await ask({ deck, texts });
  if (answer.value !== undefined && answer.index !== undefined)
    return { element: chain[answer.index], value: answer.value };
  return { error: answer.error ?? "This text cannot be edited here." };
}

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

type CloseField = (field?: EditField) => void;

class EditField {
  private readonly frame: HTMLIFrameElement;
  private done = false;
  private readonly target: EditTarget;
  private readonly onNote: (note: EditNote) => void;
  private readonly close: CloseField;

  constructor(target: EditTarget, onNote: (note: EditNote) => void, close: CloseField) {
    this.target = target;
    this.onNote = onNote;
    this.close = close;
    this.frame = createEditFrame(target.element);
    this.frame.addEventListener("load", this.bindTextarea);
    document.body.append(this.frame);
  }

  remove = () => this.frame.remove();

  private fit(area: HTMLTextAreaElement) {
    const top = Number.parseFloat(this.frame.style.top);
    this.frame.style.height = "0";
    this.frame.style.height = `${Math.min(Math.max(area.scrollHeight + 4, 64), innerHeight - top - 8)}px`;
  }

  // The field stays open until the write answers, so a refused one keeps what was typed.
  private async save(area: HTMLTextAreaElement) {
    if (this.done) return;
    this.done = true;
    const { deck, value } = this.target;
    const to = area.value;
    if (to === value) return this.close();
    const answer = await submitDeckEdit(deck, value, to);
    if (answer.ok) {
      this.close(this);
      this.onNote({ text: "Saved. The slide reloads.", error: false });
    } else {
      this.onNote({ text: answer.error ?? "The write failed.", error: true });
      this.done = false;
      area.focus();
    }
  }

  private bindTextarea = () => {
    const area = this.frame.contentDocument?.querySelector("textarea");
    if (!area) return;
    const { value } = this.target;
    area.value = value;
    this.fit(area);
    area.focus();
    area.setSelectionRange(value.length, value.length);
    area.addEventListener("input", () => this.fit(area));
    // A click elsewhere on the page saves; switching to another app keeps the field open.
    area.addEventListener("blur", () =>
      setTimeout(() => {
        if (document.hasFocus()) void this.save(area);
      }),
    );
    area.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.save(area);
      } else if (event.key === "Escape") {
        this.done = true;
        this.close();
      }
    });
  };
}

function createEditOverlay(onNote: (note: EditNote) => void) {
  let current: EditField | null = null;
  const close = (field?: EditField) => {
    if (field && field !== current) return;
    current?.remove();
    current = null;
  };
  return {
    isOpen: () => current !== null,
    close,
    open(target: EditTarget) {
      close();
      current = new EditField(target, onNote, close);
    },
  };
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
      void resolveDeckClick(deck, chain)
        .then((result) => {
          if ("value" in result) return overlay.open({ deck, ...result });
          flash({ text: result.error, error: true });
          marks.mark(chain[0]);
        })
        .catch(() => flash({ text: "This text cannot be edited here.", error: true }));
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
        style={{ zIndex: 90, background: note?.error ? "var(--color-red)" : LEAD }}
        className="fixed bottom-4 left-4 max-w-md rounded-sm px-3 py-2 font-sans text-sm text-white shadow-overlay"
      >
        {note?.text ?? "Edit mode: click a text. Enter saves, Esc cancels, E ends."}
      </div>
    </>
  );
}
