import { expect, it } from "vitest";
import { rasterTargetSize, renderPdf, type ImageMetrics } from "../scripts/render-pdf";
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
