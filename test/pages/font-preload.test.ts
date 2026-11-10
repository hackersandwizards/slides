import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// A slide drawn from the server's markup painted in the fallback face, and the web font swapping in
// after the first paint moved its blocks: Lighthouse counted a layout shift in 7 of 12 mobile loads
// of the deck page. Preloaded, the faces mostly arrive before that paint
// (commit 4a66c0b).
const dist = join(import.meta.dirname, "..", "..", "dist");
const FACES = [
  "inter-latin-400-normal",
  "inter-latin-500-normal",
  "inter-latin-700-normal",
  "jetbrains-mono-latin-500-normal",
  "jetbrains-mono-latin-700-normal",
];

it.each([
  ["a story page", "stories/Types/content-slide/prose"],
  ["a deck page", "stories/Deck/deck-view/specimen-deck"],
])("%s preloads the faces a slide paints, at the URLs its stylesheet loads", (_, path) => {
  const html = readFileSync(join(dist, path, "index.html"), "utf8");
  const preloads = [...html.matchAll(/<link rel="preload"[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes('as="font"'))
    .map((tag) => /href="([^"]+)"/.exec(tag)![1]);
  expect(FACES.filter((face) => !preloads.some((href) => href.includes(`/${face}.`)))).toEqual([]);
  const css = [...html.matchAll(/<link rel="stylesheet" href="\/slides\/([^"]+)"/g)]
    .map(([, href]) => readFileSync(join(dist, href), "utf8"))
    .join();
  for (const href of preloads) expect(css).toContain(href);
});
