import puppeteer, { type Page } from "puppeteer";

export interface PdfDeck {
  title: string;
  slideCount: number;
}

// Chrome embeds every image at its source resolution: a 3456px screenshot shown 1100px wide and
// a 7920px logo were most of a deck's megabytes.
async function downsamplePrintImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const isOpaque = (alpha: Uint8ClampedArray) => {
      for (let i = 3; i < alpha.length; i += 4) {
        if (alpha[i] < 255) return false;
      }
      return true;
    };
    const redraw = async (img: HTMLImageElement, scale: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // A picture from another origin taints the canvas, which then refuses to be read: it stays
      // as it is.
      let alpha: Uint8ClampedArray;
      try {
        alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      } catch (error) {
        if (error instanceof DOMException && error.name === "SecurityError") return;
        throw error;
      }
      img.srcset = "";
      const png = canvas.toDataURL("image/png");
      const jpeg = isOpaque(alpha) ? canvas.toDataURL("image/jpeg", 0.9) : png;
      img.src = jpeg.length < png.length ? jpeg : png;
      await img.decode();
    };

    for (const img of document.querySelectorAll<HTMLImageElement>(".print-slide img")) {
      if (/\.svg($|\?)|^data:image\/svg\+xml/i.test(img.currentSrc) || !img.naturalWidth) continue;
      const { width, height } = img.getBoundingClientRect();
      // `object-contain` shows the whole image inside its box, so the tighter side sets its size.
      const fit = getComputedStyle(img).objectFit === "contain" ? Math.min : Math.max;
      const scale = fit((2 * width) / img.naturalWidth, (2 * height) / img.naturalHeight);
      // A hidden image has no box, and a canvas of no size breaks the export: it stays as it is.
      if (scale && scale < 1) await redraw(img, scale);
    }
  });
}

/** Prints a deck's print route to a PDF through Chrome's own print pipeline, one slide per page
 *  with selectable text; a raster PDF stitched from screenshots has no text, takes about a hundred
 *  times as long and ran to 30 MB for a 74-slide deck. Each repo's `export-pdf.ts` resolves the
 *  deck, the URL and the file name, and calls this, which refuses any URL but http(s). */
export function renderPdf(url: string, out: string, deck: PdfDeck): Promise<void>;
export function renderPdf(
  url: string,
  out: string,
  ...deck: [title: string, slideCount: number]
): Promise<void>;
export async function renderPdf(
  url: string,
  out: string,
  ...[deckOrTitle, slideCount]: [deckOrTitle: PdfDeck | string, slideCount?: number]
): Promise<void> {
  const deck = typeof deckOrTitle === "string" ? { title: deckOrTitle, slideCount } : deckOrTitle;
  // A deck's print route, served: a file:// or other local URL would print whatever file it names.
  const { protocol } = new URL(url);
  if (protocol !== "http:" && protocol !== "https:")
    throw new Error(
      `Cannot print the ${protocol} URL ${url} because PDF export loads a served print route. Pass the route's http or https URL to renderPdf.`,
    );
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
      throw new Error(
        `The page rendered ${slides} slides but the deck holds ${deck.slideCount}, so PDF export stopped. Pass the full presentation to PrintDeck and its slides.length as slideCount to renderPdf.`,
      );
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
  if (!res?.ok())
    throw new Error(
      `HTTP ${res?.status()} from ${url} prevented the print route from loading. Check the route URL and fix any error in the server log.`,
    );
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-chart-plot]")].every((box) =>
        box.querySelector("svg"),
      ) && !document.querySelector("[data-code-plain]"),
    { timeout: 300_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.$(".print-slide")))
    throw new Error(
      "No .print-slide elements found, so there are no slides to print or measure. Render PrintDeck with the deck in the print route.",
    );
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
          `Slides are still unfitted after 300 s at ${url}, so PDF export stopped. Mount PrintDeck with client:load in the print route and fix any hydration error in the browser console.`,
        );
    });
  // The fit guard refits on its ResizeObserver: two frames and a pause let it land.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await new Promise((r) => setTimeout(r, 500));
}
