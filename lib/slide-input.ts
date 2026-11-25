/** Whether a dialog holds the input; a modal one makes the deck behind it inert to all but keys
 *  and touches, which reach the window's listeners. */
export const dialogOpen = () => document.querySelector("dialog[open]") !== null;

/** A key the deck leaves alone. One held with Cmd, Ctrl or Alt belongs to the browser or the
 *  system: Cmd+Left goes back in history, so the deck stepping on it too would move two places.
 *  One pressed on the page while the dev-only edit mode (`deck-edit-mode.tsx`) is on is ignored,
 *  so typing after a click that opened no field changes nothing; one pressed under an open dialog
 *  is too. A press the engine dispatches itself, from a touch button or replayed from another
 *  window, still counts there. */
export function ignoredKey(event: KeyboardEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    (event.isTrusted && ("deckEdit" in document.documentElement.dataset || dialogOpen()))
  );
}
