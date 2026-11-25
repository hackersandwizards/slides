"use client";

import { useEffect, useRef } from "react";
import { useReportPendingReveal } from "./use-progressive-reveal";
import { ignoredKey } from "./slide-utils";

interface UseSlideKeyboardOptions {
  onRight?: () => boolean | void;
  onLeft?: () => boolean | void;
  onSpace?: () => void;
  onBackspace?: () => void;
  onKey?: (key: string) => void;
  enabled?: boolean;
  /** True while the next ArrowRight still reveals a step on this slide, for the presenter hint. */
  pending?: boolean;
  /** True while the next ArrowLeft still takes a step back on this slide, for the Previous button. */
  undoable?: boolean;
}

interface SlideKeyAction {
  handler: "onRight" | "onLeft" | "onSpace" | "onBackspace";
  consumeBeforeHandler: boolean;
}

const slideKeyActions = new Map<string, SlideKeyAction>([
  ["ArrowRight", { handler: "onRight", consumeBeforeHandler: false }],
  ["ArrowLeft", { handler: "onLeft", consumeBeforeHandler: false }],
  [" ", { handler: "onSpace", consumeBeforeHandler: true }],
  ["Backspace", { handler: "onBackspace", consumeBeforeHandler: true }],
]);

function consumeSlideKey(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function useSlideKeyboard(options: UseSlideKeyboardOptions) {
  const optionsRef = useRef(options);
  const enabled = options.enabled !== false;
  useReportPendingReveal(enabled && !!options.pending, enabled && !!options.undoable);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (options.enabled === false) return;

    function handleKeyDown(event: KeyboardEvent) {
      const current = optionsRef.current;
      if (current.enabled === false || ignoredKey(event)) return;

      const action = slideKeyActions.get(event.key);
      const handler = action && current[action.handler];
      if (!action || !handler) {
        const { onKey } = current;
        onKey?.(event.key);
        return;
      }
      if (action.consumeBeforeHandler) {
        consumeSlideKey(event);
        handler();
        return;
      }
      if (handler() !== false) consumeSlideKey(event);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [options.enabled]);
}
