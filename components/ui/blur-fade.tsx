"use client";

import { useRef } from "react";
import { domAnimation, LazyMotion, m, useInView } from "motion/react";
import type { MotionProps, Variants } from "motion/react";
import { usePrintMode } from "../../lib/print-context";
import { useMounted } from "../../lib/use-mounted";

const MAX_DELAY = 0.3;
const MAX_DURATION = 0.45;
const OFFSET = 6;

type FadeDirection = "up" | "down" | "left" | "right";

const VISIBLE_VARIANT = {
  x: 0,
  y: 0,
  opacity: 1,
  filter: "blur(0px)",
  // A filter left on, even blur(0px), keeps the text on its own layer, whose bounds came from the
  // fallback face: after the web font swapped in, descenders stayed clipped until a repaint.
  transitionEnd: { filter: "none" },
};

const FADE_VARIANTS: Record<FadeDirection, Variants> = {
  up: { hidden: { y: OFFSET, opacity: 0, filter: "blur(6px)" }, visible: VISIBLE_VARIANT },
  down: { hidden: { y: -OFFSET, opacity: 0, filter: "blur(6px)" }, visible: VISIBLE_VARIANT },
  left: { hidden: { x: OFFSET, opacity: 0, filter: "blur(6px)" }, visible: VISIBLE_VARIANT },
  right: { hidden: { x: -OFFSET, opacity: 0, filter: "blur(6px)" }, visible: VISIBLE_VARIANT },
};

function variantsForDirection(direction: FadeDirection): Variants {
  return Object.hasOwn(FADE_VARIANTS, direction) ? FADE_VARIANTS[direction] : FADE_VARIANTS.up;
}

const MOTION_TAGS = { div: m.div, li: m.li } as const;

// No layout or drag, which no slide uses: the fade draws with the DOM animations alone
// (LazyMotion below).
interface BlurFadeProps extends Omit<
  MotionProps,
  `layout${string}` | "layout" | `drag${string}` | "drag"
> {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  direction?: FadeDirection;
  /** Waits until the element scrolls into view; otherwise it fades in on mount. */
  inView?: boolean;
  /** `li` where the fade is an item of a list, which may hold only list items. */
  as?: "div" | "li";
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  direction = "down",
  inView = false,
  as: Tag = "div",
  ...props
}: BlurFadeProps) {
  const printMode = usePrintMode();
  const ref = useRef(null);
  // Starting "in view" skips the observer, which only an `inView` fade needs.
  const isInView = useInView(ref, { once: true, margin: "-50px", initial: !inView });
  // The slide a page load opens on shows at once, from the server's markup. A fade that mounts
  // after hydration, on every later slide, enters. motion reads `initial` on mount only.
  const hydrating = !useMounted();

  if (printMode) {
    return <Tag className={className}>{children}</Tag>;
  }

  const Motion = Object.hasOwn(MOTION_TAGS, Tag) ? MOTION_TAGS[Tag] : MOTION_TAGS.div;
  return (
    <LazyMotion features={domAnimation}>
      <Motion
        ref={ref}
        initial={hydrating ? false : "hidden"}
        animate={isInView ? "visible" : "hidden"}
        variants={variantsForDirection(direction)}
        // A slide's text is fully in within 0.8s, whatever its stagger: a later delay or a longer
        // fade read as a slow slide in a video call.
        transition={{
          delay: 0.04 + Math.min(delay, MAX_DELAY),
          duration: Math.min(duration, MAX_DURATION),
          ease: "easeOut",
        }}
        className={className}
        data-entrance=""
        {...props}
      >
        {children}
      </Motion>
    </LazyMotion>
  );
}
