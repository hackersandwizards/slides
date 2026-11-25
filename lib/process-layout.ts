/** A step count from which a flow stands upright on a phone, and a process loop leaves its circle. */
export const LONG_FLOW = 5;

/** Whether a timeline split over slides runs in from the slide's edge and out to it. */
export const continuation = ({ continues }: { continues?: "in" | "out" | "both" }) => ({
  into: continues === "in" || continues === "both",
  onward: continues === "out" || continues === "both",
});

/** Whether a process node is the phase a slide names, in any case. */
export const isHighlightPhase = (title: string, phase?: string) =>
  !!phase && title.toLowerCase() === phase.toLowerCase();
