import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Browser } from "puppeteer";
import { afterAll, beforeAll, expect, it } from "vitest";

// Every portrait on the print page's slides, read off its box: the picture sits in its frame at the
// same inset on every side, and its corners follow the frame's at that inset. The closing slide's
// speakers drew a ring round a box with the brand corner, and the picture inside took the small
// corner by brand's nesting rule, so it poked out at two corners and left gaps at the others
// (2026-11-08). A portrait is any picture of the specimen deck's portraits.
const FRAMES = pathToFileURL(
  join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "frames.html"),
).href;
const TOLERANCE = 0.5; // CSS px

type Fit = { label: string; insets: number[]; corners: [number, number][] };

/** Runs in the page: per portrait, the inset of the picture from its frame's outer edge on each
 *  side, and per corner the picture's radius beside the frame's radius less that inset. */
function measure(): Fit[] {
  const px = (v: string) => parseFloat(v) || 0;
  // A ring is a box-shadow drawn outside the box: its widest coloured spread.
  const ringOf = (el: Element) =>
    Math.max(
      0,
      ...[...getComputedStyle(el).boxShadow.matchAll(/(rgba?\([^)]*\)|oklab\([^)]*\)|#\w+)[^,]*/g)]
        .filter(([, colour]) => !/rgba\([^)]*,\s*0\)$/.test(colour!))
        .map(([shadow]) => px(shadow.trim().split(/\s+/).at(-1)!)),
    );
  const draws = (el: Element) => {
    const s = getComputedStyle(el);
    return (
      s.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      px(s.borderTopWidth) > 0 ||
      px(s.paddingTop) > 0 ||
      ringOf(el) > 0
    );
  };
  const corners = [
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ] as const;
  // The horizontal radius: the brand corner is round, so it equals the vertical one.
  const radius = (el: Element, corner: (typeof corners)[number]) =>
    px(getComputedStyle(el)[corner]);
  return [...document.querySelectorAll<HTMLImageElement>('img[src*="portrait-"]')]
    .filter((img) => img.getBoundingClientRect().width > 0)
    .map((img) => {
      const frame = draws(img) ? img : draws(img.parentElement!) ? img.parentElement! : img;
      const s = getComputedStyle(img);
      const r = img.getBoundingClientRect();
      // The picture's own box: inside its border and padding.
      const pic = {
        left: r.left + px(s.borderLeftWidth) + px(s.paddingLeft),
        top: r.top + px(s.borderTopWidth) + px(s.paddingTop),
        right: r.right - px(s.borderRightWidth) - px(s.paddingRight),
        bottom: r.bottom - px(s.borderBottomWidth) - px(s.paddingBottom),
      };
      const ring = ringOf(frame);
      const f = frame.getBoundingClientRect();
      const insets = [
        pic.left - (f.left - ring),
        pic.top - (f.top - ring),
        f.right + ring - pic.right,
        f.bottom + ring - pic.bottom,
      ];
      // On one element the browser clips the picture to the frame's radius less the inset, which
      // is the target by construction; a picture nested in its frame carries its own radius.
      const inset = Math.min(...insets);
      return {
        label: `${img.alt || img.src} in ${frame === img ? "itself" : frame.className}`,
        insets: insets.map((v) => +v.toFixed(2)),
        corners: corners.map((c): [number, number] => {
          const target = Math.max(0, radius(frame, c) + ring - inset);
          const own = frame === img ? Math.max(0, radius(img, c) - inset) : radius(img, c);
          return [+own.toFixed(2), +target.toFixed(2)];
        }),
      };
    });
}

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--use-mock-keychain", "--password-store=basic"],
  });
});
afterAll(() => browser?.close());

it("fits every portrait in its frame at one inset with the frame's corners", async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(FRAMES, { waitUntil: "load" });
  const fits = await page.evaluate(measure);
  await page.close();
  // Closing, profiles, single profile, grid quote and statement quotation each show one.
  expect(fits.length).toBeGreaterThanOrEqual(5);
  const off = fits.filter(
    ({ insets, corners }) =>
      Math.max(...insets) - Math.min(...insets) > TOLERANCE ||
      corners.some(([own, target]) => Math.abs(own - target) > TOLERANCE),
  );
  expect(off).toEqual([]);
}, 60_000);
