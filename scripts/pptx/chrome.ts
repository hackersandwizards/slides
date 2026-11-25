import type { Slide } from "../../types/slide";

/** Whether a closing stands the h&w lockup in its centre column and none in the corner, as the
 *  web's `.slide-closing-mark` does on a contact closing without portraits. */
export const centredMark = (d: Extract<Slide, { type: "closing" }>) =>
  d.variant !== "discussion" && !d.speakers?.some((sp) => sp.imageSrc);
