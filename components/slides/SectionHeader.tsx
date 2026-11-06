import { BlurFade } from "../ui/blur-fade";

interface Props {
  label?: string;
  principle?: string;
  pillColor?: string;
  stageMarker?: string[];
  stagePrefix?: string;
}

const PIPELINE_STAGES = ["Refine", "Challenge", "Implement", "Review", "Rework", "QA", "Codify"];

export function SectionHeader({ label, principle, pillColor, stageMarker, stagePrefix }: Props) {
  const hasStageStrip = (stageMarker && stageMarker.length > 0) || !!stagePrefix;
  if (!label && !principle && !hasStageStrip) return null;

  return (
    <BlurFade delay={0.1} duration={0.5}>
      {/* The kicker band is one line tall at least and grows with what wraps in it, so a long
          label pushes the title down instead of running into it. The stage strip stays one line
          from `md` up: where it does not fit beside the label, the whole strip moves to the next
          row. The minimums are the band heights in slides.css. */}
      <div className="slide-kicker mb-4 flex h-auto! min-h-10 flex-wrap items-center gap-5 max-md:min-h-0">
        {label && <span className="hw-label [--hw-label-size:var(--text-xl)]">{label}</span>}
        {principle && <span className={`hw-pill ${pillColor ?? ""}`.trim()}>{principle}</span>}
        {hasStageStrip && (
          <div className="hw-label-box min-w-0 flex-wrap gap-1 md:shrink-0 md:flex-nowrap">
            <span className="hw-label mr-1.5 [--hw-label-size:var(--text-xl)]" data-tone="muted">
              Stage
            </span>
            {stagePrefix && (
              <span className="flex items-center">
                <span className="rounded-brand-sm bg-text px-2.5 py-0.5 font-mono text-xl font-bold whitespace-nowrap text-white">
                  {stagePrefix}
                </span>
                <span className="mx-2 text-xl font-bold text-text-subtle">»</span>
              </span>
            )}
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = stageMarker?.includes(stage) ?? false;
              return (
                <span key={stage} className="flex items-center">
                  <span
                    className={`rounded-brand-sm px-2 py-0.5 font-mono text-xl font-bold whitespace-nowrap transition-colors ${isActive ? "bg-secondary text-white" : "text-text-subtle/70"}`}
                  >
                    {stage}
                  </span>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <span className="mx-0.5 text-xl text-text-subtle/40">›</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </BlurFade>
  );
}
