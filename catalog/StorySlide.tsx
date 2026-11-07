import type { ComponentProps } from "react";
import { SlideContainer } from "../components/slides/SlideContainer";
import { slideComponents } from "../lib/slide-components";
import { useMounted } from "../lib/use-mounted";
import type { Slide } from "../types/slide";

/** A specimen slide as a deck shows it, in `SlideContainer` with the strip, the corner mark and the
 *  page counter. The slide mounts after hydration, so it enters as a slide reached from the one
 *  before does: on the slide a page load opens on, every entrance shows at once. */
export function StorySlide({
  slide,
  ...container
}: { slide: Slide } & Omit<ComponentProps<typeof SlideContainer>, "children">) {
  const SlideComponent = slideComponents[slide.type];
  const mounted = useMounted();
  return (
    <SlideContainer {...container}>{mounted && <SlideComponent slide={slide} />}</SlideContainer>
  );
}
