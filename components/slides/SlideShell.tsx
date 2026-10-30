import { useLayoutEffect, useRef, type ReactNode } from "react";

// The shared slide-frame contract: a full-viewport flex-centered root. Every
// slide opened with a hand-copied `relative flex min-h-screen items-center
// justify-center <bg>` wrapper; this owns it so the frame can change in one
// place. The inner gradient wash / decoration stays as the slide's own
// children (it varies per slide).
export function SlideShell({
  children,
  background = "bg-section-intro",
  direction = "row",
  overflowHidden = false,
  className,
}: {
  children: ReactNode;
  background?: string;
  direction?: "row" | "col";
  overflowHidden?: boolean;
  className?: string;
}) {
  const ref = useFitToSlide();
  const classes = [
    "relative flex min-h-screen items-center justify-center",
    direction === "col" && "flex-col",
    overflowHidden && "overflow-hidden",
    background,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  );
}

/** A slide never clips: when its content holds more than fits, it shrinks until it fits, instead
 *  of spilling past the bottom edge where a projector cuts it off. A slide that fits is left
 *  untouched. On a titled slide only the body below the title shrinks, from its top, laid out
 *  wider by the same factor where that fits, so it still spans the slide's full width and rewraps
 *  into fewer lines; elsewhere the whole `.slide-content` shrinks around its centre. There is no floor:
 *  a body that needs less than 0.75 belongs on two slides, but until it is split it shows whole.
 *  Measured top-aligned, because centred overflow above the box does not count in `scrollHeight`. */
function useFitToSlide() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const content = ref.current?.querySelector<HTMLElement>(":scope > .slide-content");
    if (!content) return;
    const body = content.querySelector<HTMLElement>(":scope > .slide-body");
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
    // Every pipeline row in the box hears `pipeline-settle` or `pipeline-reset` (PipelineRow in
    // ContentSlide), synchronously, so the next measure sees its layout.
    const rows = (event: string) => {
      for (const row of box.querySelectorAll(".pipeline-row")) row.dispatchEvent(new Event(event));
    };
    // A pipeline row tightens until it holds one line. Where the body shrinks anyway, laying it out
    // wider with its rows at full spacing reads better, so that layout wins wherever it costs at
    // most 1% of the scale.
    const solve = () => {
      const tight = layout("pipeline-settle");
      if (!box.querySelector(".pipeline-row")) return tight;
      const wide = layout("pipeline-reset");
      return wide >= tight - 0.01 ? wide : layout("pipeline-settle");
    };
    // Lays the box out for the largest scale at which it fits, and returns that scale.
    const layout = (event: string) => {
      box.style.scale = "";
      box.style.width = "";
      rows(event);
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
      box.style.width = best > ratio ? `${100 / best}%` : "";
      return best;
    };
    // Below `md` a slide is one column that scrolls (slides.css), so nothing shrinks there.
    const narrow = window.matchMedia?.("screen and (width < 48rem)");
    const fit = () => {
      box.style.removeProperty("--card-boost");
      if (narrow?.matches) {
        box.style.scale = "";
        box.style.width = "";
        box.style.justifyContent = "";
        rows("pipeline-settle");
        return;
      }
      box.style.justifyContent = "flex-start";
      let scale = solve();
      // Larger card text is worth a shrink of at most two percent of everything else.
      if (scale < 1 && box.querySelector("[class*='card-text-']")) {
        box.style.setProperty("--card-boost", "1");
        const plain = solve();
        if (scale >= plain - 0.02) {
          box.style.removeProperty("--card-boost");
          scale = solve();
        } else scale = plain;
      }
      rows("pipeline-settle");
      // A row that wraps even tightened splits into two (data-step 3): the body is laid out wider,
      // and shrinks with it, until every row holds one line.
      const split = () => box.querySelector(".pipeline-row[data-step='3']");
      if (body && split()) {
        const kept = box.style.width;
        const fits = (at: number) => {
          box.style.width = `${100 / at}%`;
          rows("pipeline-settle");
          return !split() && box.clientHeight / box.scrollHeight >= at;
        };
        let low = 0.5;
        let high = Math.min(scale, 1);
        if (fits(low)) {
          for (let i = 0; i < 8; i++) {
            const mid = (low + high) / 2;
            if (fits(mid)) low = mid;
            else high = mid;
          }
          fits(low);
          scale = low;
        } else {
          box.style.width = kept;
          rows("pipeline-settle");
        }
      }
      if (scale >= 1 || !body) box.style.justifyContent = "";
      if (scale >= 1) return;
      if (body) {
        box.style.transformOrigin =
          box.style.width || getComputedStyle(body).alignItems !== "center"
            ? "top left"
            : "top center";
      } else {
        // Shrunk around the middle of the space between the edges, so it stays inside both.
        const [top, bottom] = edges();
        box.style.transformOrigin = `center ${(top + box.clientHeight - bottom) / 2}px`;
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
