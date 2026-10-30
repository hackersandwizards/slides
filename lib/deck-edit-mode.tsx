"use client";

import { useEffect, useRef, useState } from "react";
import { deckSync } from "./presenter-sync";
import { directionKey, readStored, writeStored } from "./slide-utils";
import { useMounted } from "./use-mounted";

/** Edit mode, local development only: E toggles it, a click on a text opens that text's source
 *  string in a field over it, Enter or a click elsewhere writes it into the deck file, Escape
 *  cancels. Each host mounts this behind its dev flag and serves `ENDPOINT` from its dev server
 *  only (`deck-edit.ts` holds the file logic), so neither reaches a production build.
 *
 *  The field sits in its own frame: the deck's shortcuts listen on this window, several in the
 *  capture phase, and typing H, S, F or Space there would fire them. */

const ENDPOINT = "/api/deck-edit";
const STORAGE_KEY = "deck-edit";
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
html[data-deck-edit] body *:not(:has(*)):hover { outline: 2px dashed ${LEAD}; outline-offset: 2px; cursor: text; }`;

const FIELD = `<!doctype html><style>html,body{margin:0;height:100%}textarea{box-sizing:border-box;
width:100%;height:100%;border:0;padding:8px;font:18px/1.4 system-ui,sans-serif;color:#19283a;
background:#fff;resize:none;outline:none}</style><textarea spellcheck="false"></textarea>`;

export function DeckEdit({ deck }: { deck: string }) {
  // Stays on across the reload a save causes: read after hydration, so the server render agrees.
  const mounted = useMounted();
  const [choice, setChoice] = useState<boolean | null>(null);
  const on = choice ?? (mounted && readStored("session", STORAGE_KEY) === "on");
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const badge = useRef<HTMLDivElement>(null);
  // The audience window only: the speaker window's slide sits inert under the speaker view, which
  // edits notes itself, and its frames are previews.
  const [active] = useState(() => deckSync.role() === "audience");

  useEffect(() => {
    if (!active) return;
    const toggle = (event: KeyboardEvent) => {
      if (event.key !== "e" && event.key !== "E") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
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

  useEffect(() => {
    if (!on || !active) return;
    document.documentElement.dataset.deckEdit = "";
    let field: HTMLIFrameElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flash = (text: string, error = false) => {
      clearTimeout(timer);
      setNote({ text, error });
      timer = setTimeout(() => setNote(null), error ? 6000 : 2500);
    };
    // A refusal opens no field, so the refused text itself shows it, next to where the eye is.
    // Each outlined element keeps its own outline and one timer: a second refusal while the first
    // shows restarts the timer and still restores the element's own outline, never the red.
    const refused = new Map<
      HTMLElement,
      { outline: string; timer: ReturnType<typeof setTimeout> }
    >();
    const restore = (element: HTMLElement) => {
      const mark = refused.get(element);
      if (!mark) return;
      clearTimeout(mark.timer);
      element.style.outline = mark.outline;
      refused.delete(element);
    };
    const refuse = (element: Element, text: string) => {
      flash(text, true);
      if (!(element instanceof HTMLElement)) return;
      const outline = refused.get(element)?.outline ?? element.style.outline;
      clearTimeout(refused.get(element)?.timer);
      element.style.outline = "3px solid var(--color-factory)";
      refused.set(element, { outline, timer: setTimeout(() => restore(element), 2500) });
    };
    const close = () => {
      field?.remove();
      field = null;
    };

    const open = (element: Element, value: string) => {
      close();
      const rect = element.getBoundingClientRect();
      const frame = document.createElement("iframe");
      frame.title = "Edit text";
      const width = Math.min(Math.max(rect.width + 16, 360), innerWidth - 16);
      const left = Math.min(Math.max(rect.left - 8, 8), innerWidth - width - 8);
      const top = Math.min(Math.max(rect.top - 8, 8), innerHeight - 120);
      Object.assign(frame.style, {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: "60px",
        zIndex: "90",
        border: `2px solid ${LEAD}`,
        borderRadius: "6px",
        background: "#fff",
        boxShadow: "0 8px 24px rgb(0 0 0 / 0.4)",
      });
      frame.srcdoc = FIELD;
      frame.addEventListener("load", () => {
        const area = frame.contentDocument?.querySelector("textarea");
        if (!area) return;
        let done = false;
        const fit = () => {
          frame.style.height = "0";
          frame.style.height = `${Math.min(Math.max(area.scrollHeight + 4, 64), innerHeight - top - 8)}px`;
        };
        const save = async () => {
          if (done) return;
          done = true;
          const to = area.value;
          close();
          if (to === value) return;
          // The save reloads the slide. Arriving "backwards" opens it fully revealed, so the
          // result shows; a host that refreshes in place keeps the slide, and the mark is dropped.
          writeStored("session", directionKey(), "back");
          setTimeout(() => writeStored("session", directionKey(), null), 3000);
          const answer = await ask({ deck, from: value, to });
          if (answer.ok) flash("Saved. The slide reloads.");
          else {
            // Nothing was saved, so a reload must open the slide as it was.
            writeStored("session", directionKey(), null);
            flash(answer.error ?? "The write failed.", true);
          }
        };
        area.value = value;
        fit();
        area.focus();
        area.setSelectionRange(value.length, value.length);
        area.addEventListener("input", fit);
        // A click elsewhere on the page saves; switching to another app keeps the field open.
        area.addEventListener("blur", () =>
          setTimeout(() => {
            if (document.hasFocus()) void save();
          }),
        );
        area.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void save();
          } else if (event.key === "Escape") {
            done = true;
            close();
          }
        });
      });
      document.body.append(frame);
      field = frame;
    };

    const outside = (event: Event) => !badge.current?.contains(event.target as Node);
    // Propagation only: the default moves focus, which blurs an open field and so saves it.
    const swallow = (event: Event) => {
      if (outside(event)) event.stopPropagation();
    };
    const pick = async (event: MouseEvent) => {
      if (!outside(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const chain: Element[] = [];
      for (
        let element = event.target as Element | null;
        element && element !== document.body && chain.length < 12;
        element = element.parentElement
      )
        chain.push(element);
      // A click on the page itself, outside every element, has no text to edit.
      if (!chain.length) return;
      const texts = chain.map((element) => (element.textContent ?? "").slice(0, 4000));
      const answer = await ask({ deck, texts });
      if (answer.value !== undefined && answer.index !== undefined)
        open(chain[answer.index], answer.value);
      else refuse(chain[0], answer.error ?? "This text cannot be edited here.");
    };

    // Capture on the window runs before the slide's own pointer handlers, the laser among them.
    window.addEventListener("mousedown", swallow, true);
    window.addEventListener("click", pick, true);
    return () => {
      window.removeEventListener("mousedown", swallow, true);
      window.removeEventListener("click", pick, true);
      delete document.documentElement.dataset.deckEdit;
      clearTimeout(timer);
      refused.forEach((_, element) => restore(element));
      setNote(null);
      close();
    };
  }, [on, active, deck]);

  if (!on || !active) return null;
  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={badge}
        role="status"
        style={{ zIndex: 90, background: note?.error ? "var(--color-factory)" : LEAD }}
        className="shadow-overlay fixed bottom-4 left-4 max-w-md rounded-sm px-3 py-2 font-sans text-sm text-white"
      >
        {note?.text ?? "Edit mode: click a text. Enter saves, Esc cancels, E ends."}
      </div>
    </>
  );
}
