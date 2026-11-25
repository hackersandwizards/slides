import { FIT_STYLE, NARROW } from "../../lib/slide-utils";

/** A heading's word wider than its box broke without a hyphen ("Architectur / e"): Chrome
 *  hyphenates no capitalised English word and Safari none under the limit `slides.css` sets. Such a
 *  heading shrinks until its widest word fits, and every heading of its size on the slide with it,
 *  so the cards of one row keep one size. Not below `WORD_FLOOR`, where a title still stands above
 *  its card's text: past that the word breaks. "Internationalization" in a phone's card needs 0.78.
 *  A shrunk heading carries its factor as `data-word-scale`, which `slides-density` reads. A brand
 *  element (`hw-*`) keeps the size its own setting gives it. */
const WORD_FLOOR = 0.7;
function fitWords(root: HTMLElement) {
  const headings = [
    ...root.querySelectorAll<HTMLElement>(":is(h1, h2, h3, .card-title):not([class*='hw-'])"),
  ];
  for (const h of headings.filter((h) => h.dataset.wordScale)) {
    h.style.removeProperty("font-size");
    delete h.dataset.wordScale;
  }
  const sizes = headings.map((h) => getComputedStyle(h).fontSize);
  // The factor so far for each size; a width does not follow its size exactly, so it is measured
  // again. Every heading is measured in one layout, with no break inside a word.
  const scales = new Map<string, number>();
  for (let pass = 0; pass < 3; pass++) {
    for (const h of headings) h.style.overflowWrap = "normal";
    const fits = headings.map((h) => (h.clientWidth ? h.clientWidth / h.scrollWidth : 1));
    for (const h of headings) h.style.removeProperty("overflow-wrap");
    const need = new Map<string, number>();
    fits.forEach((fit, i) => {
      if (fit < 1 && (scales.get(sizes[i]) ?? 1) > WORD_FLOOR)
        need.set(sizes[i], Math.min(fit, need.get(sizes[i]) ?? 1));
    });
    if (!need.size) return;
    for (const [size, fit] of need)
      scales.set(size, Math.max(WORD_FLOOR, (scales.get(size) ?? 1) * fit * 0.995));
    headings.forEach((h, i) => {
      if (!need.has(sizes[i])) return;
      const scale = scales.get(sizes[i])!.toFixed(3);
      h.style.fontSize = `calc(${sizes[i]} * ${scale})`;
      h.dataset.wordScale = scale;
    });
  }
}

function verticalEdges(box: HTMLElement): number[] {
  const cs = getComputedStyle(box);
  const margin = box.clientHeight * 0.05;
  return [cs.paddingTop, cs.paddingBottom].map((p) => Math.max(parseFloat(p) || 0, margin));
}

function resetFitStyle(box: HTMLElement) {
  FIT_STYLE.forEach((p) => box.style.removeProperty(p));
}

// Measured from the children: `scrollHeight` never reads less than the box, so it misses
// content that reaches into the bottom padding without passing the box's edge.
function measureUntitledBox(box: HTMLElement): number {
  const [top, bottom] = verticalEdges(box);
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

// The scale the box needs when laid out at `1 / scale` of its width.
function neededScaleAtWidth(box: HTMLElement, scale: number): number {
  box.style.width = scale < 1 ? `${100 / scale}%` : "";
  return box.clientHeight / box.scrollHeight;
}

function fitTitledBody(box: HTMLElement): number {
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
    if (neededScaleAtWidth(box, mid) >= mid) best = lo = mid;
    else hi = mid;
  }
  // Shrunk, the body is laid out wider by the same factor wherever that still fits, so it spans
  // the slide's full width even where the wider layout gains no height, as a table whose rows
  // keep their lines does; left at full width it ended at the scale's share of the slide.
  const wide = best > ratio || neededScaleAtWidth(box, ratio) >= ratio;
  box.style.width = wide ? `${100 / best}%` : "";
  return best;
}

function resolveFitScale(box: HTMLElement, measure: (target: HTMLElement) => number): number {
  const layout = () => {
    resetFitStyle(box);
    return measure(box);
  };
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
  return scale;
}

function zoomTitledBody(box: HTMLElement, scale: number) {
  const { width, alignItems } = getComputedStyle(box);
  // A narrower body centred in its slide; the shell centres an untitled box itself.
  if (!box.style.width && alignItems === "center") box.style.marginInline = "auto";
  applyBoxZoom(box, scale, width);
}

function zoomUntitledBox(box: HTMLElement, scale: number) {
  const { width, height } = getComputedStyle(box);
  const [top] = verticalEdges(box);
  // Shrunk as measured, from the top edge: it fills the space between the edges exactly, at
  // the slide's full height. Centred in its padding box, it rose above the top edge where
  // the padding is smaller than the edge, up under the strip.
  box.style.height = `${parseFloat(height) / scale}px`;
  box.style.paddingTop = `${top / scale}px`;
  applyBoxZoom(box, scale, width);
}

// Read the computed width before the first layout write, which changes it.
function applyBoxZoom(box: HTMLElement, scale: number, width: string) {
  // A zoomed box draws its own lengths zoomed too, a percentage width excepted: each is set in
  // px as laid out, so the box keeps its lines and draws at `scale` of that width.
  // Under a zoomed frame the marker rounds in the product of both zooms.
  const outer = (box.parentElement as { currentCSSZoom?: number } | null)?.currentCSSZoom ?? 1;
  box.style.width = width;
  box.style.zoom = String(scale);
  // The zoom Chrome applies, both zooms' product as a 32-bit float: the double above it, by a
  // rounding error, put a label's marker 1 px low at 0.9683333.
  box.style.setProperty(
    "--hw-zoom",
    String((box as { currentCSSZoom?: number }).currentCSSZoom ?? scale * outer),
  );
}

// A slide reached by navigation is measured while its entrance (BlurFade) still holds the
// text offset, which read the bottom block short and left a larger scale than a page load
// gives: measured with the offset held off, both open at one scale.
function withoutEntranceTransform(box: HTMLElement, run: () => void) {
  const entering = [...box.querySelectorAll<HTMLElement>("[data-entrance]")].filter(
    (el) => getComputedStyle(el).transform !== "none",
  );
  const kept = entering.map((el) => el.style.getPropertyValue("transform"));
  for (const el of entering) el.style.setProperty("transform", "none", "important");
  try {
    run();
  } finally {
    entering.forEach((el, i) => el.style.setProperty("transform", kept[i]));
  }
}

function runFitPass(content: HTMLElement, box: HTMLElement) {
  box.style.removeProperty("--card-boost");
  resetFitStyle(box);
  fitWords(content);
  // Below `md` a slide is one column that scrolls (slides.css), so nothing shrinks there.
  if (window.matchMedia?.(NARROW)?.matches) {
    box.style.justifyContent = "";
    return;
  }
  const isBody = box !== content;
  const measure = isBody ? fitTitledBody : measureUntitledBox;
  withoutEntranceTransform(box, () => {
    box.style.justifyContent = "flex-start";
    const scale = resolveFitScale(box, measure);
    if (scale >= 1) {
      box.style.justifyContent = "";
      return;
    }
    if (isBody) zoomTitledBody(box, scale);
    else zoomUntitledBox(box, scale);
  });
}

function snapshotBoxSizes(parent: HTMLElement, box: HTMLElement): string {
  return [parent, ...box.children]
    .map((child) => {
      // The computed size keeps fractions; the offset size covers an inline child, whose
      // computed size reads "auto". Neither moves with the box's own `zoom`.
      const { width, height } = getComputedStyle(child);
      const { offsetWidth, offsetHeight } = child as HTMLElement;
      return `${width}x${height}/${offsetWidth}x${offsetHeight}`;
    })
    .join();
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
export function fitSlide(shell: HTMLElement | null) {
  const content = shell?.querySelector<HTMLElement>(":scope > .slide-content");
  if (!content) return;
  // Only a title bounds the body's height (slides.css): an untitled body grows with what it
  // holds, so it never reads as overflowing, and the whole content is measured instead.
  const body = content.classList.contains("slide-titled")
    ? content.querySelector<HTMLElement>(":scope > .slide-body")
    : null;
  const box = body ?? content;
  // The sizes the last fit left, so an observer report of those same sizes, such as the one every
  // observation starts with, lays nothing out again: the children's and the parent's, since the
  // zoomed box's px width and height no longer follow a window that changes size.
  let sizes = "";
  const parent = box.parentElement!;
  const refit = () => {
    runFitPass(content, box);
    sizes = snapshotBoxSizes(parent, box);
  };
  refit();
  // `slides-density` reads a slide without it as one the guard never fitted.
  content.dataset.fitted = "";
  // A web font still loading changes the text's size once it arrives.
  if (document.fonts?.status === "loading") void document.fonts.ready.then(refit);
  if (typeof ResizeObserver === "undefined") return;
  // The box keeps its size, so what grows is a child, an image loading, a block revealed, or the
  // parent with the window.
  const observer = new ResizeObserver(() => {
    if (snapshotBoxSizes(parent, box) !== sizes) refit();
  });
  for (const el of [parent, ...box.children]) observer.observe(el);
  return () => observer.disconnect();
}
