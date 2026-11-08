import type { ComponentProps, ComponentType } from "react";
import { SlideContainer } from "../components/slides/SlideContainer";
import { useMounted } from "../lib/use-mounted";
import type { Slide } from "../types/slide";

/** A story file's component for one slide type: taking the type's component rather than the
 *  registry keeps every other type out of the story's bundle. The slide mounts after hydration,
 *  since on the slide a page load opens on every entrance shows at once. */
export const storySlide = <S extends Slide>(SlideComponent: ComponentType<{ slide: S }>) =>
  function StorySlide({
    slide,
    ...container
  }: { slide: S } & Omit<ComponentProps<typeof SlideContainer>, "children">) {
    const mounted = useMounted();
    return (
      <SlideContainer {...container}>{mounted && <SlideComponent slide={slide} />}</SlideContainer>
    );
  };
