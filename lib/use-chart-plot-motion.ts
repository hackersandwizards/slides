"use client";

import { useState } from "react";
import { usePrintMode } from "./print-context";
import { opensRevealed } from "./slide-arrival";
import { useMounted } from "./use-mounted";

/** Whether a plot shows at once rather than growing: on a printed slide, on the slide a page load
 *  opens on (a recharts plot mounts after hydration, so it keeps whether its slide hydrated), and
 *  on one opening revealed, such as a catalogue tile, where the growth drew no bar for seconds, and
 *  none in a background tab. */
export function useChartPlotMotion() {
  const mounted = useMounted();
  const [opened] = useState(() => !mounted || opensRevealed());
  return { mounted, still: usePrintMode() || opened };
}
