import type { ReactNode } from "react";
import { themeDotColor, type StageCategory } from "../../lib/stage-utils";

// Shared chrome for the two "factory frame" slide types (OverviewSlide,
// PhasedPillsSlide): the centered gradient title pill and the "new/active" dot.
// Kept here so the two slides cannot drift apart. The dot does not pulse: a loop
// that never ends pulls the eye off the speaker for the whole slide.

/** The factory frame's title, a caps label on the brand gradient pill over the frame's edge. */
export function GradientTitlePill({ children }: { children: ReactNode }) {
  return (
    <span className="label-caps inline-block rounded-full bg-gradient-to-r from-primary via-brand-accent/70 to-secondary px-8 py-2.5 text-base whitespace-nowrap text-white">
      {children}
    </span>
  );
}

/** The dot on a stage that is new or active, in its category's colour, ringed white. */
export function PulseDot({
  category,
  offset = "-top-1 -right-1",
}: {
  category: StageCategory;
  offset?: string;
}) {
  const color = themeDotColor[category] ?? "bg-secondary";
  return (
    <span className={`absolute ${offset} flex h-3 w-3`}>
      <span className={`relative inline-flex h-3 w-3 rounded-full ring-4 ring-white ${color}`} />
    </span>
  );
}
