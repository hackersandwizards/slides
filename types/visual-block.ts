import type { IconName } from "../lib/icons";

export interface FlowFrame {
  label?: string;
  logos?: { src: string; alt: string }[];
  notes?: string[];
  footer?: string;
}

/** The diagram vocabulary (`components/slides/Visuals.tsx`): a content block that draws one
 *  relationship instead of listing it. `highlight` is the index of the one element in the brand
 *  colour; every other element stays neutral. */
export type VisualBlock =
  | {
      type: "flow";
      steps: {
        title: string;
        text?: string;
        icon?: IconName;
        /** A step whose own name is a state, such as Red or Green in TDD, takes that colour. */
        tone?: "red" | "green";
        /** A line under the step, such as "You are here". */
        badge?: string;
      }[];
      highlight?: number;
      /** Label of an arrow from the last step back to the first. */
      loop?: string;
      /** A dashed frame round the steps: a label with logos above, notes beside, a footer. */
      frame?: FlowFrame;
      /** Small tiles and titles, at the height of the pipeline it replaces: for two flows on one
       *  slide or a flow with more beside it. */
      dense?: boolean;
    }
  | {
      type: "layers";
      layers: { title: string; text?: string }[];
      highlight?: number;
      /** Numbers the layers, for a stack read in order. */
      ordered?: boolean;
    }
  | {
      type: "timeline";
      events: {
        when?: string;
        title: string;
        text?: string;
        /** A label on the line that leads from the previous event to this one, such as the
         *  duration "2 weeks": `when` names a point in time, this the time between two. The first
         *  event's is not drawn, a continued timeline's run-in included. */
        segment?: string;
        /** A result in the figure face, such as "-90%". */
        figure?: string;
      }[];
      highlight?: number;
      /** Index of the last event that has happened, -1 for none; the line after it is dashed. */
      now?: number;
      /** Row labels, a table's column headers, set left of the stages: "Slot", "What", "Output". */
      labels?: { when?: string; title?: string; text?: string };
      /** A timeline split over slides: "out" on the first, "in" on the next, "both" between. The
       *  line runs in from the slide's edge before the first event or out after the last, and stands
       *  at one height on every such slide under a headline of the same height. */
      continues?: "in" | "out" | "both";
    }
  | {
      /** @deprecated Drawn as a comparison's `before-after` with `strike: false`. */
      type: "transform";
      before: { label: string; items: string[] };
      after: { label: string; items: string[] };
    }
  | {
      type: "bars";
      /** `from` makes a bar a range, drawn from `from` to `value` on the track: a forecast's low
       *  and high end. Its default display is "from–value". */
      bars: {
        label: string;
        value: number;
        from?: number;
        display?: string;
        highlight?: boolean;
      }[];
      /** The scale's full length, such as 100 for percentages: draws the track behind each bar. */
      max?: number;
      /** Bars sort largest first; "given" keeps the order they are listed in. */
      order?: "given";
      source?: string;
    }
  | {
      type: "numbers";
      /** Up to four figures stand in a row, more wrap (five and six in three columns, smaller and
       *  without the rule). `text` is a line under the label, such as what the figure means. */
      items: { value: string; label: string; text?: string }[];
      source?: string;
    }
  | {
      type: "annotated";
      src: string;
      alt?: string;
      /** The image's own width and height in pixels; the marks and the crop are placed by them. */
      size: [number, number];
      /** Shows only this band of the image, as fractions of its height, so its lines read larger. */
      crop?: { top: number; bottom: number; right?: number };
      /** y is the marked line's centre and h its height, as fractions of the image height. */
      notes: { y: number; h?: number; text: string }[];
    }
  | {
      /** Code set as text at the type floor, its lines that matter marked: a screenshot of code
       *  shrinks below legibility in a Meet window. */
      type: "annotated-code";
      code: string;
      /** A Shiki language (lib/code-highlight.tsx); plain text without one. */
      language?: string;
      /** line is 1-based in `code`. */
      notes: { line: number; text: string }[];
    }
  | {
      /** Parallel points as cards, each the item's own text under an icon, or a number where the
       *  items are steps or questions. `items` on a card is a list under its text. */
      type: "cards";
      items: { title?: string; text?: string; icon?: IconName; items?: string[] }[];
      numbered?: boolean;
      highlight?: number;
      /** The first card's number, where one set of numbered cards runs across two slides. */
      numberFrom?: number;
      /** Columns; by default one per card up to three, two for four cards. */
      columns?: 1 | 2 | 3 | 4;
      /** Shows the cards one per arrow key instead of all on arrival. */
      reveal?: boolean;
      /** Draws the cards at the sizes of the `four-column` and `labeled-grid` blocks, the
       *  `regular` sections and the `grid` pillars they replace: no mark above a card without icon or number, a smaller
       *  title, the body in the muted card text. For cards carrying more text than a few words. */
      dense?: boolean;
    };
