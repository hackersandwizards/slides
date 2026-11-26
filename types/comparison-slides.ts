import type { IconName } from "../lib/icons";
import type { SectionTheme, Grounded } from "./slide-theme";

export interface GridCard {
  title: string;
  description?: string;
  icon?: IconName;
  value?: string;
  label?: string;
  highlight?: boolean;
  imageSrc?: string;
  author?: string;
}

interface GridBase extends Grounded {
  type: "grid";
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  headline: string;
  cards: GridCard[];
  allActive?: boolean;
}

/** `pillars` (the default) and `stats` are deprecated: the engine draws them as a content slide
 *  with a `cards` or `numbers` block, through `gridAsContent` in `lib/slide-aliases.ts`; `quotes`
 *  stays. Figures (`stats`) stand in a row of up to four and wrap, so they take no `columns`. */
export type GridSlide =
  | (GridBase & {
      variant?: "pillars";
      columns?: 2 | 3 | 4;
      /** The first pillar's number, where one set of pillars runs across two slides. */
      numberFrom?: number;
    })
  | (GridBase & { variant: "quotes"; columns?: 2 | 3 | 4 })
  | (GridBase & { variant: "stats" });

export interface ComparisonSide {
  label: string;
  items: string[];
  logo?: string;
  highlight?: string;
}

interface ComparisonBase {
  type: "comparison";
  /** The kicker above the headline, as on a content slide. */
  sectionLabel?: string;
  headline?: string;
  punchline?: string;
  /** On a `vs` slide, the punchline waits for one more arrow key instead of showing on arrival. */
  revealPunchline?: boolean;
  footnotes?: string[];
}

/** Two sides: `vs` pros against cons, `before-after` the old against the new, `split` two lists. */
export interface ComparisonSidesSlide extends ComparisonBase {
  variant?: "vs" | "before-after" | "split";
  /** A lead line under the headline. */
  subtitle?: string;
  left: ComparisonSide;
  right: ComparisonSide;
  /** `before-after` only: `false` keeps the before side unstruck, uncrossed and untinted, for a
   *  before that stays rather than goes ("Stays from stage 3"), and shows the slide whole on
   *  arrival; a struck slide brings in the after side and the punchline on the next press. */
  strike?: boolean;
  /** `before-after` with `strike: false` only: the right side is added to a left side that stays
   *  ("Stays" and "Needs building"), so a plus stands between them in place of the arrow, which
   *  says the left turns into the right, and the right side carries no check mark. */
  adds?: boolean;
}

/** Examples, each a bad and a good version, with an optional intro and points above them. */
export interface ComparisonGuidanceSlide extends ComparisonBase {
  variant: "guidance";
  intro?: string;
  points?: string[];
  examples: GuidanceExample[];
}

export interface PositionSide {
  name: string;
  stance: string;
  quote: string;
}

/** Two named stances with a quote each, and the resolution under them. */
export interface ComparisonPositionsSlide extends ComparisonBase {
  variant: "positions";
  /** A lead line under the headline. */
  subtitle?: string;
  left: PositionSide;
  right: PositionSide;
  middle?: string;
  resolution: string;
}

export type ComparisonSlide =
  ComparisonSidesSlide | ComparisonGuidanceSlide | ComparisonPositionsSlide;

export interface GuidanceExample {
  title: string;
  bad: string;
  good: string;
  language?: string;
}

/** @deprecated A `comparison` slide with `variant: "guidance"`, which draws it. The engine still
 *  renders it, through `guidanceAsComparison` in `lib/slide-aliases.ts`. */
export interface GuidanceSlide {
  type: "guidance";
  headline?: string;
  intro?: string;
  points?: string[];
  examples: GuidanceExample[];
}
