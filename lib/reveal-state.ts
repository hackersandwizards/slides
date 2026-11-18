"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Which reveal handlers on the page still hold a step ahead, so the presenter hint can say "to
// reveal" only while the next arrow press reveals something rather than changing slides, and which
// hold one behind, so Previous stays live on the first slide while a step can be taken back.
const pending = { ahead: new Set<symbol>(), behind: new Set<symbol>() };
const pendingListeners = new Set<() => void>();
const notifyPending = () => pendingListeners.forEach((listener) => listener());
const subscribePending = (listener: () => void) => {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
};

/** Registers this handler as holding a reveal step ahead while `ahead` is true, and one to take
 *  back while `behind` is true. */
export function useReportPendingReveal(ahead: boolean, behind = false) {
  const [id] = useState(() => Symbol("reveal"));
  useEffect(() => {
    const held = [ahead && pending.ahead, behind && pending.behind].filter((set) => set !== false);
    if (!held.length) return;
    held.forEach((set) => set.add(id));
    notifyPending();
    return () => {
      held.forEach((set) => set.delete(id));
      notifyPending();
    };
  }, [id, ahead, behind]);
}

/** True while any handler on the page still holds a reveal step ahead. */
export const hasPendingReveal = () => pending.ahead.size > 0;

/** The same, as a hook that re-renders when it changes; `"behind"` asks for a step to take back. */
export function usePendingReveal(direction: keyof typeof pending = "ahead"): boolean {
  return useSyncExternalStore(
    subscribePending,
    () => pending[direction].size > 0,
    () => false,
  );
}
