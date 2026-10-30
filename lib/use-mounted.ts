"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR / static prerender and the first (hydrating) client render,
 * true thereafter. Use it to defer children that measure the DOM — recharts'
 * ResponsiveContainer reports width/height -1 when prerendered (there is no
 * layout box yet), which floods the build log. Backed by useSyncExternalStore
 * so the server snapshot (false) and the hydration render agree, then the
 * client snapshot (true) takes over once a real box exists.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
