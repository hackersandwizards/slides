"use client";

import CheckCircle from "lucide-react/icons/circle-check-big";
import XCircle from "lucide-react/icons/circle-x";
import { renderMarkdown } from "../../lib/markdown";
import type { ComparisonSide } from "../../types/slide";
import { SlideCard } from "./slide-cards";

/** A side's highlight under its heading, on every two-sided variant; `muted` for a side that is
 *  not the point. A step over the label size: at text-sm it would read about 12 px in a
 *  1000 px stream. */
export function SideHighlight({ text, muted = false }: { text?: string; muted?: boolean }) {
  if (!text) return null;
  return (
    <p
      className="hw-label mb-4 [--hw-label-size:var(--text-base)]"
      data-tone={muted ? "muted" : undefined}
    >
      {text}
    </p>
  );
}

type SideContent = Pick<ComparisonSide, "label" | "items" | "highlight">;

function BeforeSideCard({
  side,
  strike,
  revealed,
}: {
  side: SideContent;
  strike: boolean;
  revealed: boolean;
}) {
  const struck = revealed && strike;

  return (
    <div
      className={`rounded-brand border p-8 transition-all duration-500 ${
        struck ? "border-border bg-text-subtle/7" : "border-border bg-white"
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        {strike && <XCircle className="h-6 w-6 text-text-subtle" />}
        <h2 className="card-title text-2xl text-text-muted">{side.label}</h2>
      </div>
      <SideHighlight text={side.highlight} muted />
      <ul className="space-y-3">
        {side.items.map((item, i) => (
          <li
            key={i}
            className={`text-xl transition-all duration-300 ${
              struck
                ? "text-text-muted line-through decoration-text-subtle/70 decoration-2"
                : "text-text"
            }`}
          >
            {renderMarkdown(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AfterSideCard({
  side,
  revealed,
  adds,
}: {
  side: SideContent;
  revealed: boolean;
  adds: boolean;
}) {
  return (
    <SlideCard
      inert={!revealed}
      tone="primary"
      look="soft"
      className={`transition-all duration-500 card-pad-8 ${
        revealed ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        {!adds && <CheckCircle className="h-6 w-6 text-primary" />}
        <h2 className="card-title text-2xl text-primary">{side.label}</h2>
      </div>
      <SideHighlight text={side.highlight} />
      <ul className="space-y-3">
        {side.items.map((item, i) => (
          <li key={i} className="text-xl text-text">
            {renderMarkdown(item)}
          </li>
        ))}
      </ul>
    </SlideCard>
  );
}

/** The before and the after side by side, the after shown once `after` is set. With `strike`
 *  (the default) the before side is crossed out, then struck through and greyed once the after
 *  shows; without it, it stays as plain text on a white card, for a before that stays. The
 *  transform block draws with it too. */
export function BeforeAfterSides({
  left,
  right,
  after,
  strike = true,
  adds = false,
}: {
  left: SideContent;
  right: SideContent;
  after: boolean;
  strike?: boolean;
  adds?: boolean;
}) {
  return (
    <div
      className="grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-stretch gap-6"
      data-hw-repeat
    >
      <BeforeSideCard side={left} strike={strike} revealed={after} />

      <div
        inert={!after}
        className={`flex items-center justify-center transition-all duration-500 ${after ? "opacity-100" : "opacity-0"}`}
      >
        {adds ? (
          <span className="text-5xl font-bold text-primary">+</span>
        ) : (
          <span className="rotate-90 text-3xl font-bold text-primary md:rotate-0">&rarr;</span>
        )}
      </div>

      <AfterSideCard side={right} revealed={after} adds={adds} />
    </div>
  );
}
