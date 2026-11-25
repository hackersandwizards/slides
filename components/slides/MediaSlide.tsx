"use client";

import type { MediaSlide as MediaSlideType } from "../../types/slide";
import { mediaAsContent } from "../../lib/gallery-media";
import { ContentSlide } from "./ContentSlide";

/** @deprecated Renders as the content slide that replaces it (`mediaAsContent`): an image, video
 *  or gallery block. */
export function MediaSlide({ slide }: { slide: MediaSlideType }) {
  return <ContentSlide slide={mediaAsContent(slide)} />;
}
