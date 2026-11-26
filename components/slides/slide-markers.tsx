"use client";

import { type ReactNode } from "react";
import Image from "../ui/image";

const TILE_SIZES = {
  sm: "size-10 text-lg",
  md: "size-12 text-xl",
  lg: "size-16 text-3xl",
  /** A number in an annotated picture's gutter, which a phone draws short. */
  gutter: "size-12 text-xl max-md:size-7 max-md:text-sm",
  xl: "h-24 min-w-24 px-3 text-4xl",
};

const TILE_TONES = {
  solid: "bg-primary text-white",
  soft: "bg-primary/7 text-primary",
  badge: "border border-badge-border bg-badge-bg text-primary",
  ink: "bg-text text-white",
  /** The colours come from the caller, a tile whose state animates them (a pillar's badge). */
  none: "",
};

/** A number or an icon on a square tile: a step's number, a pillar's badge, a phase's mark. */
export function NumberTile({
  children,
  size = "md",
  tone = "solid",
  className = "",
}: {
  children: ReactNode;
  size?: keyof typeof TILE_SIZES;
  tone?: keyof typeof TILE_TONES;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-brand-sm font-heading font-bold tabular-nums ${TILE_SIZES[size]} ${TILE_TONES[tone]} ${className}`.trim()}
    >
      {typeof children === "string" || typeof children === "number" ? (
        // Trimmed to the cap height and the baseline, the numeral itself is what the tile centres:
        // the font's ascent and descent put it a pixel or more off (test/pages/badge-centre).
        <span className="[text-box:trim-both_cap_alphabetic]">{children}</span>
      ) : (
        children
      )}
    </span>
  );
}

/** The ground behind a portrait without a picture, in the person's accent; brand's teal-dark
 *  where none is named. */
const PORTRAIT_HUES = {
  neutral: "",
  primary: "[--hw-avatar-hue:var(--color-primary)]",
  secondary: "[--hw-avatar-hue:var(--color-secondary)]",
};

/** A portrait's diameter; brand's own where none is named. */
const PORTRAIT_SIZES = {
  sm: "[--hw-avatar-size:--spacing(14)]",
  md: "[--hw-avatar-size:--spacing(32)]",
  lg: "[--hw-avatar-size:--spacing(36)]",
  xl: "[--hw-avatar-size:--spacing(36)] md:[--hw-avatar-size:--spacing(44)]",
  "2xl": "[--hw-avatar-size:--spacing(36)] md:[--hw-avatar-size:--spacing(72)]",
};

/** A person's picture as brand's round `hw-avatar`. Without a picture it draws `children` on the
 *  person's hue. */
export function Portrait({
  src,
  alt,
  size,
  tone = "neutral",
  className = "",
  children,
}: {
  src?: string;
  alt: string;
  size?: keyof typeof PORTRAIT_SIZES;
  tone?: keyof typeof PORTRAIT_HUES;
  className?: string;
  children?: ReactNode;
}) {
  return (
    // Top-aligned, so a block parent's line adds no descent below the circle.
    <span
      className={[
        "hw-avatar align-top",
        size && PORTRAIT_SIZES[size],
        PORTRAIT_HUES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(!src && alt ? { role: "img", "aria-label": alt } : {})}
    >
      {src ? <Image src={src} alt={alt} width={480} height={480} /> : children}
    </span>
  );
}
