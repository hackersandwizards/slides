import { readStored } from "./browser-storage";

/** The sessionStorage key carrying the direction a navigation arrives from. Every frame of a tab
 *  shares that tab's sessionStorage, so a frame keeps a key of its own under its `window.name`: the
 *  speaker window's frames their role, any other frame, such as a catalog tile, a name given on
 *  first use, which holds across its reloads. An unnamed top window keeps the plain key. */
export function directionKey(name = frameName()): string {
  return name ? `slide-direction:${name}` : "slide-direction";
}

function frameName(): string {
  if (typeof window === "undefined") return "";
  if (window !== window.parent) window.name ||= `tile-${Math.random().toString(36).slice(2)}`;
  return window.name;
}

/** Whether this slide was reached backwards, which `presenter-sync` tells the deck's other windows.
 *  Safe in a render-phase state initializer, since it writes nothing but a frame's stable name:
 *  `SlideNavigation` consumes the key after mount, once every hook on the slide has read it. */
export function arrivedBackwards(): boolean {
  return typeof window !== "undefined" && readStored("session", directionKey()) === "back";
}

/** Whether the URL carries `?revealed`, which docs/setup.md documents for catalogs and checks: the
 *  slide opens full and shows no presenter hints. The deck's other windows are not told. */
export function revealedUrl(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(location.search).has("revealed");
}

/** Whether this slide opens with every build step shown: reached backwards, or on `?revealed`. */
export function opensRevealed(): boolean {
  return arrivedBackwards() || revealedUrl();
}
