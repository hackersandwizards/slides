import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Grounded, SlideGround } from "../../types/slide";
import { NARROW } from "../../lib/slide-utils";

/** Tailwind sees each class whole. */
const GROUNDS: Record<SlideGround, string> = {
  intro: "bg-section-intro",
  primary: "bg-section-primary",
  secondary: "bg-section-secondary",
  accent: "bg-section-accent",
  success: "bg-section-success",
};

/** A slide's ground from `ground`, or from the class its deprecated `background` names. */
export function groundOf(slide: Grounded): SlideGround {
  const named = slide.ground ?? slide.background?.slice("bg-section-".length);
  return named && named in GROUNDS ? (named as SlideGround) : "intro";
}

/** Whether the deck holding the slide stands on night (`theme-brand-dark`): SlideContainer and
 *  PrintSlide provide it, so a day slide in a night deck stays night. */
export const DeckNight = createContext(false);

/** The deck's language (`deckLang`), for the words a slide takes from brand, such as the claim on
 *  a contact closing: PrintSlide and SlideContainer's `lang` provide it, English outside a frame. */
export const DeckLang = createContext<"en" | "de">("en");

// The theme is set on every slide, "light" included: the brand's night stops at the nearest light
// theme, so a dark page around a day slide (talks' and trainer-hub's <html>) leaves its elements day.
export function SlideShell({
  children,
  ground = "intro",
  direction = "row",
  overflowHidden = false,
  night = false,
  className,
}: {
  children: ReactNode;
  ground?: SlideGround;
  direction?: "row" | "col";
  overflowHidden?: boolean;
  /** The slide stands on night: `slides.css` sets the night tokens on it and on the frame holding
   *  it, the corner mark included, and the brand's elements take their night rule. */
  night?: boolean;
  className?: string;
}) {
  const ref = useFitToSlide();
  const deckNight = useContext(DeckNight);
  const classes = [
    "slide-shell relative flex min-h-screen items-center justify-center",
    direction === "col" && "flex-col",
    overflowHidden && "overflow-hidden",
    GROUNDS[ground],
    night && "slide-night",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      data-hw-scale="stage"
      data-theme={night || deckNight ? "dark" : "light"}
      data-hw-night={night ? "" : undefined}
    >
      {children}
    </div>
  );
}

/** A slide never clips: when its content holds more than fits, it shrinks until it fits, instead
 *  of spilling past the bottom edge where a projector cuts it off. A slide that fits is left
 *  untouched. On a titled slide only the body below the title shrinks, from its top, laid out
 *  wider by the same factor where that fits, so it still spans the slide's full width and rewraps
 *  into fewer lines; elsewhere the whole `.slide-content` shrinks to fill the space between its
 *  top and bottom edges. There is no floor
 *  here: a body that needs less than 0.8 belongs on two slides, which `slides-density` fails in the
 *  consumer's gate, but in the browser it shows whole.
 *  Measured top-aligned, because centred overflow above the box does not count in `scrollHeight`. */
function useFitToSlide() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const content = ref.current?.querySelector<HTMLElement>(":scope > .slide-content");
    if (!content) return;
    // Only a title bounds the body's height (slides.css): an untitled body grows with what it
    // holds, so it never reads as overflowing, and the whole content is measured instead.
    const body = content.classList.contains("slide-titled")
      ? content.querySelector<HTMLElement>(":scope > .slide-body")
      : null;
    const box = body ?? content;
    // The top and bottom distances the content keeps from the slide's edges: the padding, and at
    // least 5% of the slide's height.
    const edges = () => {
      const cs = getComputedStyle(box);
      const margin = box.clientHeight * 0.05;
      return [cs.paddingTop, cs.paddingBottom].map((p) => Math.max(parseFloat(p) || 0, margin));
    };
    // The scale the box needs when laid out at `1 / scale` of its width.
    const needs = (scale: number) => {
      box.style.width = scale < 1 ? `${100 / scale}%` : "";
      return box.clientHeight / box.scrollHeight;
    };
    // Lays the box out for the largest scale at which it fits, and returns that scale.
    const layout = () => {
      box.style.scale = "";
      box.style.translate = "";
      box.style.width = "";
      if (!body) {
        // The content fits inside the padding, whose bottom is the footer band, and an unpadded
        // edge keeps a margin of 5% of the slide's height. Measured from the children, laid out
        // from the top: `scrollHeight` never reads less than the box, so it misses content that
        // reaches into the bottom padding without passing the box's edge.
        const [top, bottom] = edges();
        const start = parseFloat(getComputedStyle(box).paddingTop) || 0;
        let end = start;
        for (const child of box.children) {
          const el = child as HTMLElement;
          if (getComputedStyle(el).position !== "absolute")
            end = Math.max(end, el.offsetTop + el.offsetHeight);
        }
        const avail = box.clientHeight - top - bottom;
        return end - start <= avail + 1 ? 1 : avail / (end - start);
      }
      const ratio = box.clientHeight / box.scrollHeight;
      if (ratio >= 0.995) return 1;
      // The widest layout that still fits. `ratio` fits at full width; a wider layout of text is
      // shorter and may fit at a larger scale, while a wider image only grows, so each candidate
      // is measured and only one that fits is kept.
      let best = ratio;
      let lo = ratio;
      let hi = 1;
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        if (needs(mid) >= mid) best = lo = mid;
        else hi = mid;
      }
      // Shrunk, the body is laid out wider by the same factor wherever that still fits, so it spans
      // the slide's full width even where the wider layout gains no height, as a table whose rows
      // keep their lines does; left at full width it ended at the scale's share of the slide.
      const wide = best > ratio || needs(ratio) >= ratio;
      box.style.width = wide ? `${100 / best}%` : "";
      return best;
    };
    // Below `md` a slide is one column that scrolls (slides.css), so nothing shrinks there.
    const narrow = window.matchMedia?.(NARROW);
    const fit = () => {
      box.style.removeProperty("--card-boost");
      if (narrow?.matches) {
        box.style.scale = "";
        box.style.translate = "";
        box.style.width = "";
        box.style.justifyContent = "";
        return;
      }
      // A slide reached by navigation is measured while its entrance (BlurFade) still holds the
      // text offset, which read the bottom block short and left a larger scale than a page load
      // gives: measured with the offset held off, both open at one scale.
      const entering = [...box.querySelectorAll<HTMLElement>("[data-entrance]")].filter(
        (el) => getComputedStyle(el).transform !== "none",
      );
      const kept = entering.map((el) => el.style.getPropertyValue("transform"));
      for (const el of entering) el.style.setProperty("transform", "none", "important");
      try {
        scaleToFit();
      } finally {
        entering.forEach((el, i) => el.style.setProperty("transform", kept[i]));
      }
    };
    const scaleToFit = () => {
      box.style.justifyContent = "flex-start";
      let scale = layout();
      // Larger card text is worth a shrink of at most two percent of everything else.
      if (scale < 1 && box.querySelector("[class*='card-text-']")) {
        box.style.setProperty("--card-boost", "1");
        const plain = layout();
        if (scale >= plain - 0.02) {
          box.style.removeProperty("--card-boost");
          scale = layout();
        } else scale = plain;
      }
      if (scale >= 1) {
        box.style.justifyContent = "";
        return;
      }
      if (body) {
        box.style.transformOrigin =
          box.style.width || getComputedStyle(body).alignItems !== "center"
            ? "top left"
            : "top center";
      } else {
        // Shrunk as measured, from the top, and moved down to the top edge: shrunk, it fills the
        // space between the edges exactly. Centred and shrunk round that space's middle, it was
        // still centred in the padding box and rose above the top edge where the padding is
        // smaller than the edge, up under the strip.
        const start = parseFloat(getComputedStyle(box).paddingTop) || 0;
        box.style.transformOrigin = `center ${start}px`;
        box.style.translate = `0 ${edges()[0] - start}px`;
      }
      box.style.scale = String(scale);
    };
    // The children's sizes the last fit left, so an observer report of those same sizes, such as
    // the one every observation starts with, lays nothing out again.
    let sizes = "";
    const measure = () =>
      [...box.children]
        .map((child) => {
          // The computed size keeps fractions; the offset size covers an inline child, whose
          // computed size reads "auto". Neither moves with the box's own `scale`.
          const { width, height } = getComputedStyle(child);
          const { offsetWidth, offsetHeight } = child as HTMLElement;
          return `${width}x${height}/${offsetWidth}x${offsetHeight}`;
        })
        .join();
    const refit = () => {
      fit();
      sizes = measure();
    };
    refit();
    // A web font still loading changes the text's size once it arrives.
    if (document.fonts?.status === "loading") void document.fonts.ready.then(refit);
    if (typeof ResizeObserver === "undefined") return;
    // The box keeps its size, so what grows is a child: an image loading, a block revealed.
    const observer = new ResizeObserver(() => {
      if (measure() !== sizes) refit();
    });
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  return ref;
}
