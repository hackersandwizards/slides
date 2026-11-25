import { VISUAL_MUTED } from "./DiagramVocabulary";
import { revealVisibility } from "./FlowRowLook";

export function FlowLoop({
  label,
  firstTitle,
  count,
  visible,
}: {
  label: string;
  firstTitle?: string;
  count: number;
  visible: boolean;
}) {
  const edge = `${(0.5 / count) * 100}%`;
  return (
    <div
      className={`slide-flow-loop relative mb-2 ${label ? "h-24" : "h-16"} ${revealVisibility(visible)}`}
      data-back={firstTitle?.replace(/[*_`]/g, "")}
      aria-hidden
    >
      <div
        className={`absolute ${label ? "top-6" : "top-2"} bottom-0 rounded-t-(--slide-loop-bend) border-x-4 border-t-4`}
        style={{ left: edge, right: edge, borderColor: VISUAL_MUTED }}
      />
      <svg
        className="absolute bottom-0 h-6 w-7 -translate-x-1/2"
        style={{ left: edge }}
        viewBox="0 0 28 24"
      >
        <path d="M0 0 H28 L14 24 Z" fill={VISUAL_MUTED} />
      </svg>
      {label && (
        <span className="absolute top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--slide-ground) px-6 font-sans text-xl font-semibold text-text">
          {label}
        </span>
      )}
    </div>
  );
}

export function FlowLinks({
  count,
  revealed,
  mid,
}: {
  count: number;
  revealed: number;
  mid: string;
}) {
  const centre = (i: number) => `${((i + 0.5) / count) * 100}%`;
  return (
    <>
      {Array.from({ length: Math.max(count - 1, 0) }, (_, i) => (
        <div
          key={i}
          className={`slide-flow-link ${revealVisibility(i + 1 < revealed)}`}
          aria-hidden
        >
          <div
            className={`absolute ${mid} h-1 -translate-y-1/2`}
            style={{
              left: centre(i),
              right: `${100 - ((i + 1.5) / count) * 100}%`,
              background: VISUAL_MUTED,
            }}
          />
          <svg
            className={`absolute ${mid} h-7 w-6 -translate-x-full -translate-y-1/2`}
            style={{ left: `calc(${centre(i + 1)} - var(--slide-arrow-inset))` }}
            viewBox="0 0 24 28"
          >
            <path d="M0 0 L24 14 L0 28 Z" fill={VISUAL_MUTED} />
          </svg>
        </div>
      ))}
    </>
  );
}
