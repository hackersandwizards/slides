"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Check from "lucide-react/icons/check";
import Minus from "lucide-react/icons/minus";
import Pencil from "lucide-react/icons/pencil";
import Plus from "lucide-react/icons/plus";
import X from "lucide-react/icons/x";
import { readStored, writeStored } from "../../lib/browser-storage";
import { PresenterIconButton } from "./PresenterIconButton";

const NOTES_SIZE_KEY = "slide-notes-size";
/** Editing notes writes the deck file through the edit mode's endpoint, which only the dev server
 *  serves; the condition folds to false in a build, which drops the button with it. */
const EDITABLE = import.meta.env.DEV;
const EDIT_ENDPOINT = "/api/deck-edit";

async function saveDeckNote(basePath: string, from: string, to: string): Promise<void> {
  const response = await fetch(EDIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck: basePath, from, to }),
  });
  const answer = (await response.json()) as { ok?: boolean; error?: string };
  if (!answer.ok) throw new Error(answer.error ?? "The deck file was not changed.");
}

function useDeckEditFlag(editing: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!editing || "deckEdit" in root.dataset) return;
    root.dataset.deckEdit = "";
    return () => {
      delete root.dataset.deckEdit;
    };
  }, [editing]);
}

function useNotesSize(): [number, (size: number) => void] {
  const [size, setSize] = useState(() => {
    const stored = Number(readStored("local", NOTES_SIZE_KEY));
    return stored >= 14 && stored <= 48 ? stored : 24;
  });
  return [
    size,
    (next) => {
      const clamped = Math.min(48, Math.max(14, next));
      setSize(clamped);
      writeStored("local", NOTES_SIZE_KEY, String(clamped));
    },
  ];
}

/** Up and Down scroll the notes by most of a screen; a new slide opens its notes at the top. The
 *  deck takes neither key. */
function useNotesKeys(slide: number) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: 0 });
  }, [slide]);
  useEffect(() => {
    function scroll(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const element = box.current;
      if (!element) return;
      event.preventDefault();
      const by = element.clientHeight * 0.8;
      element.scrollBy({ top: event.key === "ArrowDown" ? by : -by, behavior: "smooth" });
    }
    window.addEventListener("keydown", scroll);
    return () => window.removeEventListener("keydown", scroll);
  }, []);
  return box;
}

/** Edit and save a slide's notes, dev server only. Save replaces the note's string in the deck
 *  file, the one literal holding exactly the text the deck loaded; the endpoint refuses rather than
 *  guess when that literal is gone or appears twice. A saved note shows at once, before the dev
 *  server reloads the deck. While the field is open the page carries the edit mode's flag, so the
 *  deck's shortcuts ignore what is typed and the clicker waits until the field closes. */
function useNotesEdit(notes: Array<string | undefined>, basePath: string) {
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<{ slide: number; draft: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const current = (slide: number) => saved[slide] ?? notes[slide];
  useDeckEditFlag(open !== null);

  return {
    open,
    error,
    saving,
    current,
    start(slide: number) {
      setError(null);
      setOpen({ slide, draft: current(slide) ?? "" });
    },
    change: (draft: string) => setOpen((was) => was && { ...was, draft }),
    cancel() {
      setError(null);
      setOpen(null);
    },
    async save() {
      if (!open || saving) return;
      const from = current(open.slide);
      if (from === undefined) {
        setError("This slide has no notes field. Add one in the deck file.");
        return;
      }
      if (open.draft === from) {
        setOpen(null);
        return;
      }
      setSaving(true);
      try {
        await saveDeckNote(basePath, from, open.draft);
        setSaved((was) => ({ ...was, [open.slide]: open.draft }));
        setError(null);
        setOpen(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The dev server did not answer.");
      } finally {
        setSaving(false);
      }
    },
  };
}

function NotesEditButtons({
  editing,
  saving,
  onStart,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!EDITABLE) return null;
  if (!editing) {
    return (
      <PresenterIconButton label="Edit notes" onClick={onStart}>
        <Pencil />
      </PresenterIconButton>
    );
  }
  return (
    <>
      <PresenterIconButton label="Cancel editing" onClick={onCancel}>
        <X />
      </PresenterIconButton>
      <PresenterIconButton label={saving ? "Saving" : "Save notes"} onClick={onSave}>
        <Check />
      </PresenterIconButton>
    </>
  );
}

function NotesEditor({
  draft,
  fontSize,
  onChange,
  onCancel,
  onSave,
}: {
  draft: string;
  fontSize: number;
  onChange: (draft: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <textarea
      aria-label="Speaker notes text"
      autoFocus
      spellCheck={false}
      value={draft}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
        else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSave();
      }}
      className="min-h-0 flex-1 resize-none rounded-brand bg-night-2 px-5 py-4 leading-relaxed text-night-ink outline-2 outline-amber"
      style={{ fontSize }}
    />
  );
}

function NotesHeader({
  heading,
  error,
  editControls,
  onResize,
}: {
  heading: string;
  error: string | null;
  editControls: ReactNode;
  onResize: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="flex-1 text-sm font-bold tracking-wide text-night-muted">{heading}</h2>
      <span role="alert" className="text-sm text-red-night">
        {error}
      </span>
      {editControls}
      <PresenterIconButton label="Smaller notes" onClick={() => onResize(-2)}>
        <Minus />
      </PresenterIconButton>
      <PresenterIconButton label="Larger notes" onClick={() => onResize(2)}>
        <Plus />
      </PresenterIconButton>
    </div>
  );
}

function NotesReader({
  slide,
  note,
  fontSize,
}: {
  slide: number;
  note?: string;
  fontSize: number;
}) {
  const notesBox = useNotesKeys(slide);
  return (
    <div
      ref={notesBox}
      className="min-h-0 flex-1 overflow-y-auto rounded-brand bg-night-2 px-5 py-4 leading-relaxed whitespace-pre-line"
      style={{ fontSize }}
    >
      {note || <span className="text-night-muted">No notes on this slide.</span>}
    </div>
  );
}

export function SpeakerNotes({
  notes,
  slide,
  basePath,
}: {
  notes: Array<string | undefined>;
  slide: number;
  basePath: string;
}) {
  const [size, setSize] = useNotesSize();
  const edit = useNotesEdit(notes, basePath);
  const note = edit.current(slide)?.trim();
  const heading =
    edit.open && edit.open.slide !== slide
      ? `Notes of slide ${edit.open.slide + 1}, being edited`
      : "Notes";

  return (
    <section aria-label="Speaker notes" className="flex min-h-0 flex-1 flex-col gap-2">
      <NotesHeader
        heading={heading}
        error={edit.error}
        onResize={(delta) => setSize(size + delta)}
        editControls={
          <NotesEditButtons
            editing={edit.open !== null}
            saving={edit.saving}
            onStart={() => edit.start(slide)}
            onCancel={edit.cancel}
            onSave={() => void edit.save()}
          />
        }
      />
      {edit.open ? (
        <NotesEditor
          draft={edit.open.draft}
          fontSize={size}
          onChange={edit.change}
          onCancel={edit.cancel}
          onSave={() => void edit.save()}
        />
      ) : (
        <NotesReader slide={slide} note={note} fontSize={size} />
      )}
    </section>
  );
}
