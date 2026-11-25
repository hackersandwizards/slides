import { blockFrames, extraFrames, frames, markerFrames } from "./print";
import { partFrames } from "./print-parts";

export const inlineFrames = [
  ...partFrames,
  ...frames,
  ...markerFrames,
  ...blockFrames,
  ...extraFrames,
]
  .map((f) => f.markup)
  .join("\n");
