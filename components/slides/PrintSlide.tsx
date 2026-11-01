import type { LogoConfig, Presentation } from "../../types/slide";
import { slideComponents } from "../../lib/slide-components";
import { HW_LOGO, cornerMark, resolveSlideLogo } from "../../lib/logo";
import { PrintProvider } from "../../lib/print-context";
import { pageLabel } from "../../lib/slide-utils";
import Image from "../ui/image";
import { BrandStrip, HwWordmark, PageCounter } from "./SlideContainer";

/** One slide as a printed page: the slide, the brand strip and the corner with the page counter
 *  and the deck's logos, the h&w mark where the deck names none. `scripts/render-pdf.ts` and
 *  `slides-density` read each `.print-slide`. Render it inside `PrintProvider`, as `PrintDeck`
 *  does. */
export function PrintSlide({ presentation, index }: { presentation: Presentation; index: number }) {
  const slide = presentation.slides[index];
  const SlideComponent = slideComponents[slide.type];
  const slideLogo = resolveSlideLogo(presentation, index);
  const logos: LogoConfig[] =
    slideLogo == null ? [HW_LOGO] : Array.isArray(slideLogo) ? slideLogo : [slideLogo];
  const page = pageLabel(presentation.slides, index);

  return (
    <div className={`print-slide${presentation.theme ? ` theme-${presentation.theme}` : ""}`}>
      <SlideComponent slide={slide} />
      <BrandStrip />
      <div className="print-watermark flex items-center gap-2">
        {page && (
          <span className="mr-3">
            <PageCounter label={page} />
          </span>
        )}
        {/* The print root's 21.333px rem sizes the h&w mark as the screen corner at 1920x1080. */}
        {logos.map((l, i) =>
          l.src === HW_LOGO.src ? (
            <HwWordmark key={i} mark={cornerMark(presentation, index)} />
          ) : (
            <Image
              key={i}
              src={l.src}
              alt={l.alt}
              width={l.width ?? 60}
              height={l.height ?? 49}
              className="pointer-events-none h-9 w-auto"
            />
          ),
        )}
      </div>
    </div>
  );
}

/** The whole deck in one document and one React root, the page a consumer's print route serves.
 *  The one root is what makes `PrintProvider` reach every slide: an island per slide makes each its
 *  own root, `usePrintMode()` reads false everywhere, and the export silently loses every animated
 *  and progressively revealed element while the page count stays correct. */
export function PrintDeck({ presentation }: { presentation: Presentation }) {
  return (
    <PrintProvider>
      {presentation.slides.map((_, index) => (
        <PrintSlide key={index} presentation={presentation} index={index} />
      ))}
    </PrintProvider>
  );
}
