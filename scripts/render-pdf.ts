import puppeteer, { type Page } from "puppeteer";

export interface PdfDeck {
  title: string;
  slideCount: number;
}

export interface ImageMetrics {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  objectFit: string;
}

const SVG_SRC = /\.svg($|\?)|^data:image\/svg\+xml/i;

export function rasterTargetSize(img: ImageMetrics): { width: number; height: number } | undefined {
  if (SVG_SRC.test(img.src) || !img.naturalWidth) return;
  // `object-contain` shows the whole image inside its box, so the tighter side sets its size.
  const fit = img.objectFit === "contain" ? Math.min : Math.max;
  const scale = fit((2 * img.width) / img.naturalWidth, (2 * img.height) / img.naturalHeight);
  // A hidden image has no box, and a canvas of no size breaks the export: it stays as it is.
  if (!scale || scale >= 1) return;
  return {
    width: Math.round(img.naturalWidth * scale),
    height: Math.round(img.naturalHeight * scale),
  };
}

// Runs inside ElementHandle.evaluate, so it may reference only browser globals.
async function redrawImage(
  img: HTMLImageElement,
  size: { width: number; height: number },
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // A picture from another origin taints the canvas, which then refuses to be read: it stays
  // as it is.
  let alpha: Uint8ClampedArray;
  try {
    alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return;
  }
  let opaque = true;
  for (let i = 3; i < alpha.length; i += 4) {
    if (alpha[i] < 255) {
      opaque = false;
      break;
    }
  }
  img.srcset = "";
  const png = canvas.toDataURL("image/png");
  const jpeg = opaque ? canvas.toDataURL("image/jpeg", 0.9) : png;
  img.src = jpeg.length < png.length ? jpeg : png;
  await img.decode();
}

// Chrome embeds every image at its source resolution: a 3456px screenshot shown 1100px wide and
// a 7920px logo were most of a deck's megabytes.
async function downsamplePrintImages(page: Page): Promise<void> {
  const handles = await page.$$(".print-slide img");
  for (const handle of handles) {
    try {
      const metrics = await handle.evaluate((img): ImageMetrics => {
        const { width, height } = img.getBoundingClientRect();
        return {
          src: img.currentSrc,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          width,
          height,
          objectFit: getComputedStyle(img).objectFit,
        };
      });
      const target = rasterTargetSize(metrics);
      if (target) await handle.evaluate(redrawImage, target);
    } finally {
      await handle.dispose();
    }
  }
}

/** Prints a deck's print route to a PDF through Chrome's own print pipeline, one slide per page
 *  with selectable text; a raster PDF stitched from screenshots has no text, takes about a hundred
 *  times as long and ran to 30 MB for a 74-slide deck. Each repo's `export-pdf.ts` resolves the
 *  deck, the URL and the file name, and calls this, which refuses any URL but http(s). */
export async function renderPdf(url: string, out: string, deck: PdfDeck) {
  // A deck's print route, served: a file:// or other local URL would print whatever file it names.
  const { protocol } = new URL(url);
  if (protocol !== "http:" && protocol !== "https:")
    throw new Error(`renderPdf prints an http(s) page, not a ${protocol} URL: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300_000,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await settlePrintPage(page, url, { fitted: true });

    const slides = await page.$$eval(".print-slide", (nodes) => nodes.length);
    if (slides !== deck.slideCount) {
      throw new Error(`page rendered ${slides} slides, the deck holds ${deck.slideCount}`);
    }

    await downsamplePrintImages(page);
    await page.evaluate((t) => (document.title = t), deck.title);
    await page.pdf({
      path: out,
      // Explicit, not `preferCSSPageSize`: with the CSS page size Chrome evaluated the media queries
      // between 768 and 1024px, so every `lg:` size printed one step smaller.
      width: "1920px",
      height: "1080px",
      printBackground: true,
      outline: true,
      tagged: true,
      timeout: 300_000,
    });
  } finally {
    await browser.close();
  }
}

/** A slide the fit guard has not fitted, which only a page that never hydrated keeps. */
export const UNFITTED_SLIDE = ".slide-shell > .slide-content:not([data-fitted])";

/** Loads a deck's print route and waits until it stands as printed: the route answered, every
 *  chart and code block drawn after hydration (network idle can come first), the web fonts in,
 *  every slide fitted, and the fit guard's refit after them landed. `slides-density` measures the page this leaves.
 *  With `fitted`, a slide still unfitted after 300 s throws rather than going on, as `renderPdf` needs. */
export async function settlePrintPage(
  page: import("puppeteer").Page,
  url: string,
  { fitted = false }: { fitted?: boolean } = {},
) {
  const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 300_000 });
  if (!res?.ok()) throw new Error(`HTTP ${res?.status()} from ${url}`);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-chart-plot]")].every((box) =>
        box.querySelector("svg"),
      ) && !document.querySelector("[data-code-plain]"),
    { timeout: 300_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.$(".print-slide"))) throw new Error("no .print-slide elements found");
  // A page that never hydrates goes on after the wait, and slides-density fails its unfitted slides.
  // An export never goes on: a late hydration printed its slides unfitted.
  await page
    .waitForFunction(
      (sel) => !document.querySelector(sel),
      { timeout: fitted ? 300_000 : 10_000 },
      UNFITTED_SLIDE,
    )
    .catch((e: Error) => {
      if (e.name !== "TimeoutError") throw e;
      if (fitted)
        throw new Error(
          `slides still unfitted after 300 s, the print route did not hydrate: ${url}`,
        );
    });
  // The fit guard refits on its ResizeObserver: two frames and a pause let it land.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await new Promise((r) => setTimeout(r, 500));
}
