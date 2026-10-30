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
      const { onRight, onLeft, onSpace, onBackspace, onKey, enabled } = optionsRef.current;
      if (enabled === false || ignoredKey(event)) return;

      if (event.key === "ArrowRight" && onRight) {
        const handled = onRight();
        if (handled !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (event.key === "ArrowLeft" && onLeft) {
        const handled = onLeft();
        if (handled !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (event.key === " " && onSpace) {
        event.preventDefault();
        event.stopPropagation();
        onSpace();
      } else if (event.key === "Backspace" && onBackspace) {
        event.preventDefault();
        event.stopPropagation();
        onBackspace();
      } else if (onKey) {
        onKey(event.key);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [options.enabled]);
}
