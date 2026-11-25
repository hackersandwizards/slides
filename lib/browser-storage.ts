/** Storage can be blocked, and then even naming it throws, so callers look it up inside a try.
 *  Without a window or with blocked storage, reads return null and writes do nothing.
 *  A full store also leaves writes as no-ops. */
function store(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  return kind === "local" ? localStorage : sessionStorage;
}

const isStorageError = (error: unknown, name: string) =>
  error instanceof DOMException && error.name === name;

export function readStored(kind: "local" | "session", key: string): string | null {
  try {
    const storage = store(kind);
    return storage === null ? null : storage.getItem(key);
  } catch (error) {
    if (isStorageError(error, "SecurityError")) return null;
    throw error;
  }
}

/** A stored value that does not parse as JSON counts as absent. */
export function parseStoredJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export function writeStored(kind: "local" | "session", key: string, value: string | null) {
  try {
    const storage = store(kind);
    if (storage === null) return;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch (error) {
    if (isStorageError(error, "SecurityError") || isStorageError(error, "QuotaExceededError"))
      return;
    throw error;
  }
}
