import { Scanner } from "@tailwindcss/oxide";
import { brandHref, placeBrandUrls } from "./brand-urls";
import { classesIn, compileSlides } from "./print-css";
import { exceptionSections, usesTiles } from "./print-elements";
import { inlineFrames } from "./print-inline";

// The checkout, which the config hands over: under Astro's bundle import.meta points into dist/.
const root = __SLIDES_ROOT__;

// The markup print-inline.ts and print-elements.ts assemble; a class written elsewhere on the pages, as in index.astro, needs its
// own entry here (test/pages/print-classes.test.ts).
const compiler = await compileSlides(root);
export const css = placeBrandUrls(
  compiler.build([
    ...new Scanner({ sources: compiler.sources }).scan(),
    ...[inlineFrames, usesTiles, exceptionSections].flatMap(classesIn),
  ]),
  `../${brandHref}`,
);
