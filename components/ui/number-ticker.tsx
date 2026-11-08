"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { usePrintMode } from "../../lib/print-context";

interface NumberTickerProps {
  value: number;
  className?: string;
  duration?: number;
}

export function NumberTicker({ value, className, duration = 0.5 }: NumberTickerProps) {
  const printMode = usePrintMode();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (printMode) return;
    const controls = animate(motionValue, value, { duration });
    return controls.stop;
  }, [motionValue, value, duration, printMode]);

  useEffect(() => {
    if (printMode) return;
    return rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = String(latest);
      }
    });
  }, [rounded, printMode]);

  // On screen it starts at the motion value's 0, which a count of 0 never moves from.
  return (
    <span ref={ref} className={className}>
      {printMode ? value : 0}
    </span>
  );
}
