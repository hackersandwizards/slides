import { vi } from "vitest";
import { NARROW } from "../lib/slide-utils";

/** A window under 48rem: the engine's narrow query matches. Undone by `vi.restoreAllMocks()`. */
export const phoneWidth = () => {
  const original = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    ...original(query),
    matches: query === NARROW,
  }));
};
