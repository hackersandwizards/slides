"use client";

import { useState } from "react";
import { opensRevealed } from "./slide-arrival";
import { useMounted } from "./use-mounted";

export function useHydratedRevealArrival(enabled: boolean) {
  // Read during render, applied after mount: the server cannot see sessionStorage and renders the
  // slide unrevealed, and React keeps a hydrated tree's mismatched attributes as the server sent
  // them, so revealing in the first client render left a backward arrival blank.
  const [arrivedRevealed] = useState(() => enabled && opensRevealed());
  const showArrival = useMounted() && arrivedRevealed;
  return { arrivedRevealed, showArrival };
}
