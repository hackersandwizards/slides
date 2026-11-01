"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import type { MotionProps, Variants } from "motion/react";
import { usePrintMode } from "../../lib/print-context";
import { useMounted } from "../../lib/use-mounted";

const MAX_DELAY = 0.3;
const MAX_DURATION = 0.45;
const OFFSET = 6;

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  /** Waits until the element scrolls into view; otherwise it fades in on mount. */
  inView?: boolean;
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  direction = "down",
  inView = false,
  ...props
}: BlurFadeProps) {
  const printMode = usePrintMode();
  const ref = useRef(null);
  // Starting "in view" skips the observer, which only an `inView` fade needs.
  const isInView = useInView(ref, { once: true, margin: "-50px", initial: !inView });
  // The slide a page load opens on shows at once, from the server's markup (Benedikt 01.11.2026:
  // „Erste ohne Animation“). A fade that mounts after hydration, on every later slide, enters.
  // motion reads `initial` on mount only.
  const hydrating = !useMounted();

  if (printMode) {
    return <div className={className}>{children}</div>;
  }

  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const variants: Variants = {
    hidden: {
      [axis]: direction === "right" || direction === "down" ? -OFFSET : OFFSET,
      opacity: 0,
      filter: "blur(6px)",
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      // A filter left on, even blur(0px), keeps the text on its own layer, whose bounds came from the
      // fallback face: after the web font swapped in, descenders stayed clipped until a repaint.
      transitionEnd: { filter: "none" },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial={hydrating ? false : "hidden"}
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      // A slide's text is fully in within 0.8s, whatever its stagger: a later delay or a longer
      // fade read as a slow slide in a video call.
      transition={{
        delay: 0.04 + Math.min(delay, MAX_DELAY),
        duration: Math.min(duration, MAX_DURATION),
        ease: "easeOut",
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
