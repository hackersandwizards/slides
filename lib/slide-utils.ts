import { ROLE_NAMES } from "./presenter-sync";
import type { SectionTheme } from "../types/slide";

/** The sessionStorage key carrying the direction a navigation arrives from. The frames inside the
 *  speaker window share that window's sessionStorage, so each role keeps a key of its own; the
 *  audience window keeps the plain one. */
export function directionKey(name = typeof window === "undefined" ? "" : window.name): string {
  return (Object.values(ROLE_NAMES) as string[]).includes(name)
    ? `slide-direction:${name}`
    : "slide-direction";
}

/** Whether this slide was reached backwards, which opens it fully revealed. A pure read, safe in a
 *  render-phase state initializer: `SlideNavigation` consumes the key after mount, once every hook
 *  on the slide has read it. */
export function arrivedBackwards(): boolean {
  return typeof window !== "undefined" && readStored("session", directionKey()) === "back";
}

/** A key the deck leaves alone. One held with Cmd, Ctrl or Alt belongs to the browser or the
 *  system: Cmd+Left goes back in history, so the deck stepping on it too would move two places.
 *  One pressed on the page while the dev-only edit mode (`deck-edit-mode.tsx`) is on is ignored,
 *  so typing after a click that opened no field changes nothing; a press the engine dispatches
 *  itself, from a touch button or replayed from another window, still counts there. */
export function ignoredKey(event: KeyboardEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    (event.isTrusted && "deckEdit" in document.documentElement.dataset)
  );
}

/** Storage can be blocked, and then even naming it throws: reads answer null, writes do nothing. */
const store = (kind: "local" | "session") => (kind === "local" ? localStorage : sessionStorage);

export function readStored(kind: "local" | "session", key: string): string | null {
  try {
    return store(kind).getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(kind: "local" | "session", key: string, value: string | null) {
  try {
    if (value === null) store(kind).removeItem(key);
    else store(kind).setItem(key, value);
  } catch {}
}

/** The corner counter, "05 / 24", on every slide but a title slide, which carries none. */
export function pageLabel(slides: ReadonlyArray<{ type: string }>, index: number) {
  if (slides[index]?.type === "title") return undefined;
  const width = Math.max(2, String(slides.length).length);
  const pad = (n: number) => String(n).padStart(width, "0");
  return `${pad(index + 1)} / ${pad(slides.length)}`;
}

/** The accent of the nth person on a slide, by position and never by who it is: teal first, then
 *  purple, alternating, in the order of the logo ("hackers" teal, "wizards" purple). */
export function personAccent(index: number): "primary" | "secondary" {
  return index % 2 === 0 ? "primary" : "secondary";
}

/** A slide of a deep-dive part stands on night, the brand's ground for a whole section (os design
 *  guide), so the part reads as one from the back row: the deep-dive divider, a slide whose
 *  `sectionTheme` is `deepdive` and a pill map whose phases are. Blind-scored against the part
 *  marked by its label alone and against the old rose and amber backdrop (os
 *  docs/tracking/2026-11-01-deep-dive-brand.md). */
export function isDeepDive(slide: {
  type: string;
  sectionTheme?: SectionTheme;
  phases?: { theme?: SectionTheme }[];
}): boolean {
  return (
    slide.type === "deep-dive-divider" ||
    slide.sectionTheme === "deepdive" ||
    (slide.phases?.some((p) => p.theme === "deepdive") ?? false)
  );
}

/** A link as a slide spells it out under a linked image, where a projected or printed slide hides
 *  the link itself: without its scheme, `www.` and a closing slash. */
export function linkLabel(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
