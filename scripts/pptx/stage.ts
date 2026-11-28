import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tokens } from "@hackersandwizards/brand/tokens";
import { STAGE } from "../../lib/figure-layout";
import { family, MONO, SANS } from "./faces";

// The print route's 1920 px stage on a 13.333 in slide: 144 px to the inch, so a CSS px is half a
// point; the route's root font size is 21.333 px.
export const W = 13.333;
export const H = 7.5;
export const EDGE = 96 / 144;
export const TOP = 117 / 144;
export const BOTTOM = H - 123 / 144;
export const CW = W - 2 * EDGE;

export const PT = {
  label: 13.5,
  sm: 16,
  base: 18,
  h4: 18,
  lead: 20,
  h3: 24,
  title: 36,
  s6: 40,
  s8: 48,
  display: 64,
};

/** brand's stage scale, the slide's type table: a value it sets, as a number. */
const stageCss = readFileSync(
  createRequire(import.meta.url).resolve("@hackersandwizards/brand/stage.css"),
  "utf8",
);
function stageNumber(name: string): number {
  const m = new RegExp(`${name}:\\s*([\\d.]+);`).exec(stageCss);
  if (!m) throw new Error(`brand's stage.css sets no ${name}`);
  return Number(m[1]);
}
/** The web's line heights: body text, a slide title, a display heading. */
export const LEADING = {
  body: stageNumber("--text-base--line-height"),
  title: stageNumber("--slide-title-leading"),
  display: stageNumber("--slide-display-leading"),
};

/** A card's title and a diagram's label in the brand's h3 face, as the web's card-title utility. */
export const TITLE = (() => {
  const face = family(
    tokens["--type-h3-family"].replace(
      /^var\((--[\w-]+)\)$/,
      (_, v: string) => (tokens as Record<string, string>)[v],
    ),
  );
  const weight = Number(tokens["--type-h3-weight"]);
  if (![MONO, SANS].includes(face) || !weight)
    throw new Error(
      `brand h3 ${face} ${tokens["--type-h3-weight"]}: neither the mono nor the sans`,
    );
  return { mono: face === MONO, bold: weight >= 600 };
})();

/** The brand card's corner, `--slide-radius` at 1920: 40 px at the top left and bottom right, a
 *  quarter of it at the other two, which the post-processing sets. */
export const CORNER = 40 / 144;

/** The small corner, `--slide-radius-sm` at 1920: a quarter of the brand corner (10 px). */
export const CORNER_SM = CORNER / 4;

/** A rem of the print route's stage, in inches. */
export const REM = STAGE.rem / 144;

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BODY = (y: number): Area => ({ x: EDGE, y, w: CW, h: BOTTOM - y });

export type Place = Pick<Area, "x" | "y">;

export type Disc = Place & { d: number };

export type Measure = { w: number; k: number };

export const spacing = (v: number, k: number) => v * 0.25 * REM * k;
