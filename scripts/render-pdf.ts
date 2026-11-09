import puppeteer from "puppeteer";

/** Prints a deck's print route to a PDF through Chrome's own print pipeline, one slide per page
 *  with selectable text; a raster PDF stitched from screenshots has no text, takes about a hundred
 *  times as long and ran to 30 MB for a 74-slide deck. Each repo's `export-pdf.ts` resolves the
 *  deck, the URL and the file name, and calls this, which refuses any URL but http(s). */
export async function renderPdf(url: string, out: string, title: string, slideCount: number) {
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
    await page.goto(url, { waitUntil: "networkidle0", timeout: 300_000 });
    // A trend or bar chart and a code block's colours draw after hydration, from a script loaded
    // only then: network idle can come first.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[data-chart-plot]")].every((box) =>
          box.querySelector("svg"),
        ) && !document.querySelector("[data-code-plain]"),
      { timeout: 300_000 },
    );

    const slides = await page.$$eval(".print-slide", (nodes) => nodes.length);
    if (slides === 0) throw new Error("no .print-slide elements found");
    if (slides !== slideCount) {
      throw new Error(`page rendered ${slides} slides, the deck holds ${slideCount}`);
    }

    // Chrome embeds every image at its source resolution: a 3456px screenshot shown 1100px wide and
    // a 7920px logo were most of a deck's megabytes. Each raster image is redrawn at twice its
    // displayed size, as the smaller of PNG and JPEG where it has no transparency. An SVG, by file
    // or as a data URL, is vector and stays.
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll<HTMLImageElement>(".print-slide img")) {
        if (/\.svg($|\?)|^data:image\/svg\+xml/i.test(img.currentSrc) || !img.naturalWidth)
          continue;
        const { width, height } = img.getBoundingClientRect();
        // `object-contain` shows the whole image inside its box, so the tighter side sets its size.
        const fit = getComputedStyle(img).objectFit === "contain" ? Math.min : Math.max;
        const scale = fit((2 * width) / img.naturalWidth, (2 * height) / img.naturalHeight);
        // A hidden image has no box, and a canvas of no size breaks the export: it stays as it is.
        if (!scale || scale >= 1) continue;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
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
    });
    await page.evaluate((t) => (document.title = t), title);
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
