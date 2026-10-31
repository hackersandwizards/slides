import { BlurFade } from "../ui/blur-fade";
import { ACCENT_PILL } from "../../lib/section-styles";

interface Props {
  label?: string;
  labelColor?: string;
  principle?: string;
  pillColor?: string;
  stageMarker?: string[];
  stagePrefix?: string;
  stageMarkerTheme?: "deepdive" | "default";
}

const PIPELINE_STAGES = ["Refine", "Challenge", "Implement", "Review", "Rework", "QA", "Codify"];

export function SectionHeader({
  label,
  labelColor,
  principle,
  pillColor,
  stageMarker,
  stagePrefix,
  stageMarkerTheme = "default",
}: Props) {
  const hasStageStrip = (stageMarker && stageMarker.length > 0) || !!stagePrefix;
  if (!label && !principle && !hasStageStrip) return null;

  const themeStyles =
    stageMarkerTheme === "deepdive"
      ? {
          container: "border-deep-300/40 bg-deep-50/70",
          label: "text-deep-700",
          active: "bg-deep-500 text-white",
          idle: "text-deep-900/70",
          sep: "text-deep-300/70",
          prefix: "bg-deep-500 text-white",
          bigSep: "text-deep-500/100",
        }
      : {
          container: "border-border bg-white",
          label: "text-text-subtle",
          active: "bg-secondary text-white",
          idle: "text-text-subtle/70",
          sep: "text-text-subtle/40",
          prefix: "bg-text text-white",
          bigSep: "text-text-subtle",
        };

  return (
    <BlurFade delay={0.1} duration={0.5}>
      {/* The kicker band is one line tall at least and grows with what wraps in it, so a long
          label pushes the title down instead of running into it. The stage strip stays one line
          from `md` up: where it does not fit beside the label, the whole pill moves to the next
          row. The minimums are the band heights in slides.css. */}
      <div
        className={`slide-kicker mb-4 flex h-auto! min-h-10 flex-wrap items-center gap-5 max-md:min-h-0`}
      >
        {label && (
          <span className={`text-xl leading-tight font-medium ${labelColor ?? ""}`}>{label}</span>
        )}
        {principle && (
          <span
            className={`rounded-full border px-5 py-0.5 text-xl leading-tight ${pillColor ?? ACCENT_PILL}`}
          >
            {principle}
          </span>
        )}
        {hasStageStrip && (
          <div
            className={`flex min-w-0 flex-wrap items-center gap-1 rounded-brand-sm border px-4 py-1.5 md:shrink-0 md:flex-nowrap md:rounded-full ${themeStyles.container}`}
          >
            <span className={`label-caps mr-1.5 text-xl ${themeStyles.label}`}>Stage</span>
            {stagePrefix && (
              <span className="flex items-center">
                <span
                  className={`rounded-brand-sm px-2.5 py-0.5 font-mono text-xl font-bold whitespace-nowrap ${themeStyles.prefix}`}
                >
                  {stagePrefix}
                </span>
                <span className={`mx-2 text-xl font-bold ${themeStyles.bigSep}`}>»</span>
              </span>
            )}
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = stageMarker?.includes(stage) ?? false;
              return (
                <span key={stage} className="flex items-center">
                  <span
                    className={`rounded-brand-sm px-2 py-0.5 font-mono text-xl font-bold whitespace-nowrap transition-colors ${isActive ? themeStyles.active : themeStyles.idle}`}
                  >
                    {stage}
                  </span>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <span className={`mx-0.5 text-xl ${themeStyles.sep}`}>›</span>
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
