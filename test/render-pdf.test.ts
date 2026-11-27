import puppeteer from "puppeteer";
import { afterEach, expect, it, vi } from "vitest";
import { renderPdf } from "../scripts/render-pdf";
import { rejection } from "@hackersandwizards/scaffolding/rejection";

it.each(["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)"])(
  "refuses to print %s before it starts a browser",
  async (url) => {
    expect(await rejection(renderPdf(url, "/dev/null", { title: "T", slideCount: 1 }))).toMatch(
      /http\(s\) page/,
    );
  },
);

function mockPrintPage() {
  const page = {
    goto: vi.fn().mockResolvedValue({ ok: () => true }),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue({}),
    $$: vi.fn().mockResolvedValue([]),
    $$eval: vi.fn().mockResolvedValue(2),
    setViewport: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(undefined),
  };
  vi.spyOn(puppeteer, "launch").mockResolvedValue({
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Awaited<ReturnType<typeof puppeteer.launch>>);
  return page;
}

function evaluatePrintImages(page: ReturnType<typeof mockPrintPage>, images: object[]) {
  page.evaluate
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockImplementationOnce(async (callback: () => Promise<void>) => await callback());
  return vi
    .spyOn(document, "querySelectorAll")
    .mockReturnValueOnce(images as unknown as NodeListOf<HTMLImageElement>);
}

const printMockDeck = (title: string) =>
  renderPdf("https://example.test/print", "/dev/null", { title, slideCount: 2 });

it("prints two slides with the positional title and slide count", async () => {
  const page = mockPrintPage();
  await renderPdf("https://example.test/print", "/dev/null", "Positional title", 2);
  expect(page.evaluate).toHaveBeenLastCalledWith(expect.any(Function), "Positional title");
  expect(page.pdf).toHaveBeenCalledOnce();
});

it("checks 100 SVGs in one page evaluation without per-image handles", async () => {
  const page = mockPrintPage();
  const svg = { currentSrc: "https://example.test/logo.svg" };
  const images = Array<typeof svg>(100).fill(svg);
  const handle = {
    evaluate: vi.fn().mockResolvedValue({ ...svg, src: svg.currentSrc }),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
  page.$$.mockResolvedValue(images.map(() => handle));
  const query = evaluatePrintImages(page, images);
  await printMockDeck("SVGs");
  expect({
    imagePageEvaluations: page.evaluate.mock.calls.length - 3,
    handleQueries: page.$$.mock.calls.length,
    handleEvaluations: handle.evaluate.mock.calls.length,
    handleDisposals: handle.dispose.mock.calls.length,
  }).toEqual({
    imagePageEvaluations: 1,
    handleQueries: 0,
    handleEvaluations: 0,
    handleDisposals: 0,
  });
  expect(query).toHaveBeenCalledExactlyOnceWith(".print-slide img");
});

const photoMetrics = {
  src: "https://example.test/shot.png",
  naturalWidth: 2000,
  naturalHeight: 1000,
  width: 500,
  height: 100,
  objectFit: "cover",
};
const photo = (overrides: Partial<typeof photoMetrics> = {}) => ({ ...photoMetrics, ...overrides });

function mockPrintPhoto(metrics: typeof photoMetrics, srcset = "") {
  const { src, naturalWidth, naturalHeight, width, height, objectFit } = metrics;
  const image = {
    src,
    srcset,
    currentSrc: src,
    naturalWidth,
    naturalHeight,
    getBoundingClientRect: () => ({ width, height }),
    decode: vi.fn().mockResolvedValue(undefined),
  };
  evaluatePrintImages(mockPrintPage(), [image]);
  vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({ objectFit } as CSSStyleDeclaration);
  return image;
}

it.each([
  ["SVG file", photo({ src: "https://example.test/logo.svg?v=1" }), []],
  ["SVG data URL", photo({ src: "data:image/svg+xml,<svg/>" }), []],
  ["unloaded image", photo({ naturalWidth: 0 }), []],
  ["hidden box", photo({ width: 0, height: 0 }), []],
  ["image already within 2x", photo({ naturalWidth: 800, width: 500 }), []],
  [
    "oversized cover image (wider side sets scale)",
    photo({ objectFit: "cover" }),
    [{ width: 1000, height: 500 }],
  ],
  [
    "oversized contain image (tighter side sets scale)",
    photo({ objectFit: "contain" }),
    [{ width: 400, height: 200 }],
  ],
])("chooses the raster redraw dimensions for %s", async (_label, metrics, expected) => {
  mockPrintPhoto(metrics);
  const { drawImage } = stubCanvas();
  await printMockDeck("Sizing");
  expect(drawImage.mock.calls.map(([, , , width, height]) => ({ width, height }))).toEqual(
    expected,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stubCanvas() {
  const ctx = {
    drawImage: vi.fn<CanvasRenderingContext2D["drawImage"]>(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: (type: string) => `data:${type};base64,a`,
  } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockReturnValueOnce(canvas);
  return ctx;
}

const crossOriginPhoto = photo({
  src: "https://other.example/photo.png",
  naturalHeight: 2000,
  width: 50,
  height: 50,
});

it("leaves a cross-origin tainted image untouched on SecurityError", async () => {
  const img = mockPrintPhoto(crossOriginPhoto, "x 2x");
  stubCanvas().getImageData.mockImplementation(() => {
    throw new DOMException("tainted canvas", "SecurityError");
  });
  await printMockDeck("Tainted");
  expect(img.src).toBe("https://other.example/photo.png");
  expect(img.srcset).toBe("x 2x");
});

it("propagates unexpected canvas errors from the browser evaluation", async () => {
  mockPrintPhoto(crossOriginPhoto);
  stubCanvas().getImageData.mockImplementation(() => {
    throw new TypeError("unexpected canvas failure");
  });
  expect(await rejection(printMockDeck("Broken canvas"))).toMatch(/unexpected canvas failure/);
});
