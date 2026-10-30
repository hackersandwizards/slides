"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion } from "motion/react";
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

  if (printMode) {
    return <span className={className}>{value}</span>;
  }

  // Starts at the motion value's 0, which a count of 0 never moves from.
  return (
    <motion.span ref={ref} className={className}>
      0
    </motion.span>
  );
}
