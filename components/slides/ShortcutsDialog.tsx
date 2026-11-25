"use client";

import { Fragment, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { deckSync } from "../../lib/presenter-sync";
import { dialogOpen } from "../../lib/slide-input";

/** What a presenter can press, for the "?" overlay. A clicker sends PageDown and PageUp. */
const KEYS: Array<[string[], string]> = [
  [["→", "PageDown", "Space"], "next step or slide"],
  [["←", "PageUp", "Shift+Space"], "previous step or slide"],
  [["F"], "fullscreen on and off"],
  [["S"], "speaker view in a second window"],
  [["O"], "overview of every slide"],
  [["H"], "hints on and off"],
  [["?"], "this overlay"],
];
if (process.env.NODE_ENV === "development")
  KEYS.push([["E"], "edit text, dev only, in a tab opened with ?edit"]);

/** A stable ref, so only the dialog's mount opens it: an inline one runs on every render and
 *  would reopen it between Esc and its queued `close` event. */
const openShortcutsModal = (dialog: HTMLDialogElement | null) => dialog?.showModal();

/** Whether a press or click lies outside the panel: the backdrop's events reach the dialog element. */
function onBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < left || x > right || y < top || y > bottom;
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="grid gap-y-1 sm:contents">
      <dt className="flex flex-wrap gap-1">
        {keys.map((key) => (
          <span key={key} className="flex items-center gap-1">
            {key.split("+").map((part, i) => (
              <Fragment key={part}>
                {i > 0 && "+"}
                <kbd className="hw-kbd">{part}</kbd>
              </Fragment>
            ))}
          </span>
        ))}
      </dt>
      <dd>{description}</dd>
    </div>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const pressedBackdrop = useRef(false);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (deckSync.follows() || deckSync.isReplayed(event) || event.defaultPrevented) return;
      if (event.key === "?" && dialogOpen() && !event.metaKey && !event.ctrlKey && !event.altKey)
        onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Closes on a press and release both on the backdrop: a selection that starts in the panel
    // and ends outside it is no click on the backdrop.
    <dialog
      ref={openShortcutsModal}
      className="hw-dialog"
      data-hw-scale="dense"
      data-size="large"
      aria-label="Keyboard shortcuts"
      onClose={onClose}
      onMouseDown={(event) => {
        pressedBackdrop.current = onBackdrop(event);
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && onBackdrop(event)) onClose();
      }}
    >
      <div className="hw-dialog-body [--hw-field-size:var(--text-sm)]">
        <dl className="grid gap-y-4 [--hw-kbd-size:var(--text-sm)] sm:grid-cols-[auto_auto] sm:items-center sm:gap-x-6 sm:gap-y-2">
          {KEYS.map(([keys, what]) => (
            <ShortcutRow key={what} keys={keys} description={what} />
          ))}
        </dl>
      </div>
    </dialog>
  );
}
