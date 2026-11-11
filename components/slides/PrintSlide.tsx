import type { Presentation } from "../../types/slide";
import { slideComponents } from "../../lib/slide-components";
import { cornerMark, logoPlaces, resolveSlideLogo } from "../../lib/logo";
import { PrintProvider } from "../../lib/print-context";
import { useMounted } from "../../lib/use-mounted";
import { bulletsAsStatement, deckLang, pageLabel, regularAsContent } from "../../lib/slide-utils";
import { BrandStrip, CornerStart, DeckLogo, PageCounter } from "./SlideContainer";
import { DeckLang, DeckNight } from "./SlideShell";

/** One slide as a printed page: the slide, the brand strip and the corner with the page counter
 *  and the deck's logos, the h&w mark where the deck names none. `scripts/render-pdf.ts` and
 *  `slides-density` read each `.print-slide`; `data-use` names the type a slide should be. Render
 *  it inside `PrintProvider`, as `PrintDeck` does. */
export function PrintSlide({ presentation, index }: { presentation: Presentation; index: number }) {
  const slide = presentation.slides[index];
  const SlideComponent = slideComponents[slide.type];
  const { corner, start } = logoPlaces(resolveSlideLogo(presentation, index));
  const page = pageLabel(presentation.slides, index);
  const lang = deckLang(presentation);
  const drawn = slide.type === "regular" ? regularAsContent(slide) : slide;

  return (
    <div
      className={`print-slide${presentation.theme ? ` theme-${presentation.theme}` : ""}`}
      data-theme={presentation.theme ? "dark" : "light"}
      data-hw-night={presentation.theme ? "" : undefined}
      data-use={drawn?.type === "content" && bulletsAsStatement(drawn) ? "statement" : undefined}
      lang={lang}
    >
      <DeckNight.Provider value={!!presentation.theme}>
        <DeckLang.Provider value={lang}>
          <SlideComponent slide={slide} />
        </DeckLang.Provider>
      </DeckNight.Provider>
      <BrandStrip />
      <CornerStart logos={start} position="absolute" />
      <div className="print-watermark flex items-center gap-2">
        {page && (
          <span className="mr-3">
            <PageCounter label={page} />
          </span>
        )}
        {/* The print root's 21.333px rem sizes the h&w mark as the screen corner at 1920x1080. */}
        <DeckLogo logo={corner} asMark mark={cornerMark(presentation, index)} />
      </div>
    </div>
  );
}

/** The whole deck in one document and one React root, the page a consumer's print route serves.
 *  The one root is what makes `PrintProvider` reach every slide: an island per slide makes each its
 *  own root, `usePrintMode()` reads false everywhere, and the export silently loses every animated
 *  and progressively revealed element while the page count stays correct. */
export function PrintDeck({ presentation }: { presentation: Presentation }) {
  // Until hydration has run the fit guard, the server's slides wait hidden (PrintSlide.css).
  const unfitted = !useMounted();
  return (
    <PrintProvider>
      <div className="contents" data-print-unfitted={unfitted ? "" : undefined}>
        {presentation.slides.map((_, index) => (
          <PrintSlide key={index} presentation={presentation} index={index} />
        ))}
      </div>
    </PrintProvider>
  );
}
