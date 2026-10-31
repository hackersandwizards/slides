// Shared "Part Two" deepdive decoration, previously copy-pasted across
// DeepDiveDivider, PhasedPillsSlide (deepdive variant) and DualPillOverview.
// Decorative only (aria-hidden). Keeping it here locks the deepdive brand
// identity in one place — a stated goal in CLAUDE.md.

import type { ReactNode } from "react";

type Intensity = "strong" | "soft";

const DOTTED_GRID = {
  backgroundImage: "radial-gradient(circle, var(--color-deep-800) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
} as const;

// Full literal class strings (Tailwind can't generate interpolated names).
const INTENSITY: Record<Intensity, { wash: string; blobA: string; blobB: string; dotted: string }> =
  {
    strong: {
      wash: "from-deep-100/40 via-section-deepdive to-amber/7",
      blobA: "-top-48 -left-32 h-[40rem] w-[40rem] bg-deep-200/40 blur-[160px]",
      blobB: "-bottom-40 -right-32 h-[35rem] w-[35rem] bg-amber/15 blur-[140px]",
      dotted: "opacity-7",
    },
    soft: {
      wash: "from-deep-100/25 via-section-deepdive to-amber/7",
      blobA: "-top-40 -left-32 h-[35rem] w-[35rem] bg-deep-200/25 blur-[140px]",
      blobB: "-bottom-40 -right-32 h-[30rem] w-[30rem] bg-amber/15 blur-[120px]",
      dotted: "opacity-7",
    },
  };

export function DeepDiveBackdrop({ intensity = "strong" }: { intensity?: Intensity }) {
  const s = INTENSITY[intensity];
  return (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.wash}`} />
      <div className={`pointer-events-none absolute rounded-full ${s.blobA}`} aria-hidden="true" />
      <div className={`pointer-events-none absolute rounded-full ${s.blobB}`} aria-hidden="true" />
      <div
        className={`pointer-events-none absolute inset-0 ${s.dotted}`}
        style={DOTTED_GRID}
        aria-hidden="true"
      />
    </>
  );
}

const HAIRLINE_COLOR = {
  rose: { line: "via-deep-300/70 to-deep-300/70", diamond: "bg-deep-400" },
  amber: { line: "via-amber/40 to-amber/40", diamond: "bg-amber" },
} as const;

// Full-width hairline rule with a center diamond — the deepdive top/bottom
// frame. color picks the tint, position the edge.
export function HairlineRule({
  color,
  position,
}: {
  color: keyof typeof HAIRLINE_COLOR;
  position: "top" | "bottom";
}) {
  const c = HAIRLINE_COLOR[color];
  return (
    <div
      className={`pointer-events-none absolute right-20 left-20 ${
        // The bottom rule draws the top edge of the footer band, which no content enters.
        position === "top" ? "top-12" : "bottom-(--slide-footer-band)"
      } flex items-center gap-4`}
      aria-hidden="true"
    >
      <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${c.line}`} />
      <div className={`h-1.5 w-1.5 rotate-45 ${c.diamond}`} />
      <div className={`h-px flex-1 bg-gradient-to-l from-transparent ${c.line}`} />
    </div>
  );
}

// Centered kicker label flanked by two short rose rules — the deepdive eyebrow.
// className carries the caller's margin (mb-8 / mb-12).
export function EyebrowRule({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <div className="h-px w-14 bg-deep-400" />
      <span className="label-caps text-base text-deep-600">{children}</span>
      <div className="h-px w-14 bg-deep-400" />
    </div>
  );
}
