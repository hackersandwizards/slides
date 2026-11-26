import { afterEach, expect, it, vi } from "vitest";
import { rasterTargetSize, redrawImage, renderPdf, type ImageMetrics } from "../scripts/render-pdf";
import { rejection } from "@hackersandwizards/scaffolding/rejection";

it.each(["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)"])(
  "refuses to print %s before it starts a browser",
  async (url) => {
    expect(await rejection(renderPdf(url, "/dev/null", { title: "T", slideCount: 1 }))).toMatch(
      /http\(s\) page/,
    );
  },
);

const photo = (overrides: Partial<ImageMetrics> = {}): ImageMetrics => ({
  src: "https://example.test/shot.png",
  naturalWidth: 2000,
  naturalHeight: 1000,
  width: 500,
  height: 100,
  objectFit: "cover",
  ...overrides,
});

it.each([
  ["SVG file", photo({ src: "https://example.test/logo.svg?v=1" }), undefined],
  ["SVG data URL", photo({ src: "data:image/svg+xml,<svg/>" }), undefined],
  ["unloaded image", photo({ naturalWidth: 0 }), undefined],
  ["hidden box", photo({ width: 0, height: 0 }), undefined],
  ["image already within 2x", photo({ naturalWidth: 800, width: 500 }), undefined],
  [
    "oversized cover image (wider side sets scale)",
    photo({ objectFit: "cover" }),
    { width: 1000, height: 500 },
  ],
  [
    "oversized contain image (tighter side sets scale)",
    photo({ objectFit: "contain" }),
    { width: 400, height: 200 },
  ],
])("computes rasterTargetSize for %s", (_label, metrics, expected) => {
  expect(rasterTargetSize(metrics)).toEqual(expected);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stubCanvasGetImageData(error: unknown) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: vi.fn(),
      getImageData: () => {
        throw error;
      },
    }),
  } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockReturnValueOnce(canvas);
}

it("leaves a cross-origin tainted image untouched on SecurityError", async () => {
  stubCanvasGetImageData(new DOMException("tainted canvas", "SecurityError"));
  const img = { src: "https://other.example/photo.png", srcset: "x 2x" } as HTMLImageElement;
  await redrawImage(img, { width: 100, height: 100 });
  expect(img.src).toBe("https://other.example/photo.png");
  expect(img.srcset).toBe("x 2x");
});

it("propagates unexpected canvas errors from redrawImage", async () => {
  stubCanvasGetImageData(new TypeError("unexpected canvas failure"));
  const img = { src: "https://other.example/photo.png", srcset: "" } as HTMLImageElement;
  expect(await rejection(redrawImage(img, { width: 100, height: 100 }))).toMatch(
    /unexpected canvas failure/,
  );
});
