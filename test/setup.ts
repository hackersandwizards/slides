import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// recharts' ResponsiveContainer and motion observe element size; jsdom has no
// ResizeObserver/IntersectionObserver, so stub them out.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", NoopObserver);
vi.stubGlobal("IntersectionObserver", NoopObserver);

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

window.scrollTo = () => {};

// jsdom has no canvas backend; the title-slide particle effect calls
// getContext and already tolerates a null result. Return null quietly instead
// of letting jsdom log a "Not implemented" warning per render.
HTMLCanvasElement.prototype.getContext = (() => null) as never;

// jsdom under vitest does not always expose localStorage; QuestionSlide reads
// and writes it during render. Back it with an in-memory store.
if (!("localStorage" in window) || window.localStorage == null) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}
