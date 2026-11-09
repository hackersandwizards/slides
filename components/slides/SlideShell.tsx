import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Grounded, SlideGround } from "../../types/slide";
import { FIT_STYLE, NARROW } from "../../lib/slide-utils";

/** Each ground's class, whole so Tailwind sees it: a deck's deprecated `background` names one. */
export const GROUNDS: Record<SlideGround, string> = {
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

/** A heading's word wider than its box broke without a hyphen ("Architectur / e"): Chrome
 *  hyphenates no capitalised English word and Safari none under the limit `slides.css` sets. Such a
 *  heading shrinks until its widest word fits, and every heading of its size on the slide with it,
 *  so the cards of one row keep one size. Not below `WORD_FLOOR`, where a title still stands above
 *  its card's text: past that the word breaks. "Internationalization" in a phone's card needs 0.78. */
const WORD_FLOOR = 0.7;
function fitWords(shell: HTMLElement) {
  const headings = [...shell.querySelectorAll<HTMLElement>(":is(h1, h2, h3, .card-title)")];
  for (const h of headings) h.style.removeProperty("font-size");
  const sizes = headings.map((h) => getComputedStyle(h).fontSize);
  // Each heading's scale so far; a width does not follow its size exactly, so it is measured again.
  const scales = headings.map(() => 1);
  for (let pass = 0; pass < 3; pass++) {
    const need = new Map<string, number>();
    headings.forEach((h, i) => {
      if (!h.clientWidth || scales[i] <= WORD_FLOOR) return;
      h.style.overflowWrap = "normal";
      const fits = h.clientWidth / h.scrollWidth;
      h.style.removeProperty("overflow-wrap");
      if (fits < 1) need.set(sizes[i], Math.min(fits, need.get(sizes[i]) ?? 1));
    });
    if (!need.size) return;
    headings.forEach((h, i) => {
      const fits = need.get(sizes[i]);
      if (!fits) return;
      scales[i] = Math.max(WORD_FLOOR, scales[i] * fits * 0.995);
      h.style.fontSize = `calc(${sizes[i]} * ${scales[i].toFixed(3)})`;
    });
  }
}

/** A slide never clips: content that holds more than fits shrinks until it fits, rather than
 *  spilling past the bottom edge where a projector cuts it off. On a titled slide only the body
 *  shrinks, from its top, laid out wider by the same factor where that fits, so it rewraps into
 *  fewer lines; elsewhere the whole `.slide-content` shrinks. No floor here: `slides-density` owns
 *  it. Measured top-aligned, because centred overflow above the box does not count in
 *  `scrollHeight`.
 *
 *  It shrinks with `zoom`, which lays the box out smaller, and sets brand's `--hw-zoom` beside it,
 *  so the list marker rounds to real pixels. Under `scale` Chrome snaps each baseline to the device
 *  pixel grid but draws the marker where the transform puts it, up to half a device pixel off its
 *  line. */
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
    const reset = () => FIT_STYLE.forEach((p) => box.style.removeProperty(p));
    // Lays the box out for the largest scale at which it fits, and returns that scale.
    const layout = () => {
      reset();
      if (!body) {
        // Measured from the children: `scrollHeight` never reads less than the box, so it misses
        // content that reaches into the bottom padding without passing the box's edge.
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
      reset();
      fitWords(ref.current!);
      if (narrow?.matches) {
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
      // A zoomed box draws its own lengths zoomed too, a percentage width excepted: each is set in
      // px as laid out, so the box keeps its lines and draws at `scale` of that width.
      // Each is read before the first write, which changes the computed style.
      const { width, height, alignItems } = getComputedStyle(box);
      const [top] = edges();
      // Under a zoomed frame the marker rounds in the product of both zooms.
      const outer = (box.parentElement as { currentCSSZoom?: number } | null)?.currentCSSZoom ?? 1;
      // A narrower body centred in its slide; the shell centres an untitled box itself.
      if (body && !box.style.width && alignItems === "center") box.style.marginInline = "auto";
      if (!body) {
        // Shrunk as measured, from the top edge: it fills the space between the edges exactly, at
        // the slide's full height. Centred in its padding box, it rose above the top edge where
        // the padding is smaller than the edge, up under the strip.
        box.style.height = `${parseFloat(height) / scale}px`;
        box.style.paddingTop = `${top / scale}px`;
      }
      box.style.width = width;
      box.style.zoom = String(scale);
      box.style.setProperty("--hw-zoom", String(scale * outer));
    };
    // The sizes the last fit left, so an observer report of those same sizes, such as the one every
    // observation starts with, lays nothing out again: the children's and the parent's, since the
    // zoomed box's px width and height no longer follow a window that changes size.
    let sizes = "";
    const parent = box.parentElement!;
    const measure = () =>
      [parent, ...box.children]
        .map((child) => {
          // The computed size keeps fractions; the offset size covers an inline child, whose
          // computed size reads "auto". Neither moves with the box's own `zoom`.
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
    // The box keeps its size, so what grows is a child, an image loading, a block revealed, or the
    // parent with the window.
    const observer = new ResizeObserver(() => {
      if (measure() !== sizes) refit();
    });
    for (const el of [parent, ...box.children]) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}
