"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Presentation } from "../../types/slide";
import { goToSlide } from "../../lib/navigate";
import { PrintProvider } from "../../lib/print-context";
import { deckSync } from "../../lib/presenter-sync";
import { ignoredKey } from "../../lib/slide-input";
import { PrintSlide } from "./PrintSlide";

/** A stable ref, so only the dialog's mount opens it, as for the keyboard overlay. */
const openModal = (dialog: HTMLDialogElement | null) => dialog?.showModal();

/** One slide as its printed page, every step revealed, scaled into the tile's width. */
function Thumbnail({ presentation, index }: { presentation: Presentation; index: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const page = element.firstElementChild as HTMLElement | null;
    const observer = new ResizeObserver(() =>
      setScale(page ? element.clientWidth / page.offsetWidth : 0),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-video overflow-hidden" inert>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
      >
        <PrintSlide presentation={presentation} index={index} />
      </div>
    </div>
  );
}

function useOverviewShortcut(onOpen: (open: boolean) => void) {
  useEffect(() => {
    // The frames inside the speaker window only follow.
    if (deckSync.follows()) return;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || ignoredKey(event) || deckSync.isReplayed(event)) return;
      if (event.key === "o" || event.key === "O") onOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

function overviewGridStep(columns: number, key: string): number | undefined {
  const steps: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: columns,
    ArrowUp: -columns,
  };
  return steps[key];
}

/** Arrow keys move the focus one tile, or one row up and down. */
function moveOverviewFocus(event: ReactKeyboardEvent<HTMLOListElement>) {
  const list = event.currentTarget;
  const tiles = [...list.querySelectorAll<HTMLButtonElement>(":scope > li > button")];
  const at = tiles.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  const columns = getComputedStyle(list)
    .getPropertyValue("grid-template-columns")
    .split(" ").length;
  const step = overviewGridStep(columns, event.key);
  if (!step) return;
  event.preventDefault();
  tiles[Math.min(tiles.length - 1, Math.max(0, at + step))].focus();
}

function OverviewTile({
  presentation,
  index,
  current,
  onSelect,
}: {
  presentation: Presentation;
  index: number;
  current: boolean;
  onSelect: (target: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        autoFocus={current}
        aria-current={current ? "page" : undefined}
        onClick={() => onSelect(index)}
        className={`hw-focus-ring block w-full overflow-hidden rounded-brand-sm border-2 text-left ${current ? "border-primary" : "border-border"}`}
      >
        <Thumbnail presentation={presentation} index={index} />
        <span className="block px-2 py-1 text-xs text-text-muted tabular-nums">{index + 1}</span>
      </button>
    </li>
  );
}

/** Every slide of the deck as a tile, on `o`: arrow keys or Tab move between them, Enter or a
 *  click opens one, Esc closes. A modal dialog, so the slide's own keys rest while it is open. The
 *  tiles are the printed pages, which a dialog holds in one `PrintProvider`: they show every step,
 *  and the print root sizes them while the dialog is open. */
export function DeckOverview({
  presentation,
  index,
  basePath,
}: {
  presentation: Presentation;
  index: number;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  useOverviewShortcut(setOpen);

  if (!open) return null;

  function jump(target: number) {
    setOpen(false);
    if (target === index) return;
    const direction = target < index ? "back" : "forward";
    goToSlide(`${basePath}/${target}`, direction);
    deckSync.navigated(target, direction);
  }

  return (
    <dialog
      ref={openModal}
      className="hw-dialog"
      data-hw-scale="dense"
      data-size="large"
      aria-label="Slide overview"
      onClose={() => setOpen(false)}
    >
      <div className="hw-dialog-body">
        <PrintProvider>
          <ol className="grid grid-cols-2 gap-4 md:grid-cols-4" onKeyDown={moveOverviewFocus}>
            {presentation.slides.map((_, i) => (
              <OverviewTile
                key={i}
                presentation={presentation}
                index={i}
                current={i === index}
                onSelect={jump}
              />
            ))}
          </ol>
        </PrintProvider>
      </div>
    </dialog>
  );
}
