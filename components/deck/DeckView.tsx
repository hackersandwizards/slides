import { lazy, Suspense, useEffect } from "react";
import type { Presentation } from "../../types/slide";
import { slideComponents } from "../../lib/slide-components";
import { slideFrame } from "../../lib/slide-utils";
import { usePathname } from "../../lib/navigate";
import { SlideContainer } from "../slides/SlideContainer";
import { SlideNavigation } from "../slides/SlideNavigation";
import { SlideHints } from "../slides/SlideHints";
import { LaserPointer } from "../slides/LaserPointer";
import { PresenterView } from "../slides/PresenterView";

// Edit mode, dev only: the condition folds to null in a build, which drops the import with it.
const DeckEdit = import.meta.env.DEV
  ? lazy(() => import("../../lib/deck-edit-mode").then((m) => ({ default: m.DeckEdit })))
  : null;

interface Props {
  presentation: Presentation;
  /** The slide the page's path names, which the server renders. */
  index: number;
  /** The deck's path; slide n lives at `${basePath}/${n}`. */
  basePath: string;
  /** Keep the document's title `<deck name> - <slide number>` as the deck moves. */
  documentTitle?: boolean;
}

/** A whole deck as one React root, the island a deck page renders. Splitting the container, the
 *  navigation and the slide into separate islands would hand each other's children to React as
 *  static HTML, and the arrow keys would stop reaching the reveal handlers.
 *
 *  It shows the slide its path names, so changing slides never loads a document
 *  (`lib/navigate.ts`). Each slide mounts fresh under its own key, so its entrance and reveal state
 *  start over; the speaker window sits outside that key and stays. */
export function DeckView({ presentation, index: initial, basePath, documentTitle }: Props) {
  const path = usePathname(`${basePath}/${initial}`);
  const match = path.startsWith(`${basePath}/`) ? path.slice(basePath.length + 1) : "";
  const index =
    /^\d+$/.test(match) && Number(match) < presentation.slides.length ? Number(match) : initial;
  const slide = presentation.slides[index];
  const SlideComponent = slideComponents[slide.type];

  useEffect(() => {
    if (documentTitle) document.title = `${presentation.name} - ${index + 1}`;
  }, [documentTitle, presentation.name, index]);

  return (
    <>
      <SlideContainer key={index} {...slideFrame(presentation, index)}>
        <SlideNavigation
          currentIndex={index}
          totalSlides={presentation.slides.length}
          basePath={basePath}
        />
        <SlideComponent slide={slide} />
        <SlideHints slideIndex={index} />
        <LaserPointer />
      </SlideContainer>
      <PresenterView notes={presentation.slides.map((s) => s.notes)} basePath={basePath} />
      {DeckEdit && (
        <Suspense fallback={null}>
          <DeckEdit deck={basePath} />
        </Suspense>
      )}
    </>
  );
}
