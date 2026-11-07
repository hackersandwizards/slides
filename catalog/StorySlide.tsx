import type { ComponentProps } from "react";
import { SlideContainer } from "../components/slides/SlideContainer";
import { slideComponents } from "../lib/slide-components";
import { useMounted } from "../lib/use-mounted";
import type { Slide } from "../types/slide";

/** Mounts after hydration, since on the slide a page load opens on every entrance shows at once. */
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
