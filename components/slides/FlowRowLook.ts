import { VISUAL_LABEL } from "./DiagramVocabulary";
import type { FlowStep } from "./Visuals";

// The colour a step's name states, never a status role: Red is the brand red, not the warning.
const TONES = {
  red: "text-red",
  green: "text-green-dark",
} as const;

const FLOW_HEADING = {
  dense: `mt-2 ${VISUAL_LABEL.replace("text-4xl", "text-xl")}`,
  narrow: `mt-7 ${VISUAL_LABEL.replace("text-4xl", "text-2xl")}`,
  regular: `mt-7 ${VISUAL_LABEL}`,
} as const;

// The line runs through the tiles' middle: half an xl tile, or half a sm one when dense.
const TILE_SCALE = {
  dense: { size: "sm" as const, icon: "h-5 w-5", linkMid: "top-5" },
  regular: { size: "xl" as const, icon: "h-12 w-12", linkMid: "top-12" },
} as const;

// A label of up to four characters ("10x") fits the tile; one longer moves above the title, for
// every step of the row, so the tiles stay one kind.
const TILE_LABEL = 4;

// Six and more steps leave a column about a sixth of the slide: a size down keeps the labels
// whole words.
export function flowRowLook(steps: FlowStep[], dense: boolean) {
  const narrow = steps.length >= 6;
  return {
    inTile: steps.every((step) => (step.label?.length ?? 0) <= TILE_LABEL),
    ...TILE_SCALE[dense ? "dense" : "regular"],
    heading: FLOW_HEADING[dense ? "dense" : narrow ? "narrow" : "regular"],
    padding: narrow ? "px-2" : "px-5",
  };
}

export type FlowRowLook = ReturnType<typeof flowRowLook>;

// A label carrying a number ("Stage 1", "Monat 2 und 3") already counts: the tiles stay empty
// rather than repeat or contradict it.
export function stepNumbers(steps: FlowStep[]): (number | undefined)[] {
  if (steps.some((step) => /\d/.test(step.label ?? ""))) return steps.map(() => undefined);
  let count = 0;
  return steps.map((step) => (step.numbered === false ? undefined : ++count));
}

export function revealVisibility(visible: boolean) {
  return `transition-opacity duration-500 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`;
}

// A tone (red, green) colours the step's words only, so the nodes stay one family.
export function stepInk(step: Pick<FlowStep, "dim" | "tone">) {
  if (step.dim) return "text-text-muted";
  return step.tone && Object.hasOwn(TONES, step.tone) ? TONES[step.tone] : "text-text";
}
