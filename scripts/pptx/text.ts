import type PptxGenJS from "pptxgenjs";
import { INLINE_MARKDOWN } from "../../lib/markdown";
import { MONO } from "./faces";
import type { Palette } from "./palette";

export type TextProps = PptxGenJS.TextPropsOptions;
export type Run = { text: string; options?: TextProps };

/** A list marker in its own hue, written as a private character, which the post-processing turns
 *  into the brand marker in that hue: pptxgenjs writes no bullet colour. */
export const MARKER_CODES = { green: "E001", red: "E002" } as const;
export type MarkerHue = keyof typeof MARKER_CODES;
export const HUE_OF_MARKER = Object.fromEntries(
  Object.entries(MARKER_CODES).map(([hue, code]) => [code, hue as MarkerHue]),
);
export const MARKER_SQUARE = "25AA";

/** Runs with each `\n` as a line break inside the paragraph (`<a:br/>`). pptxgenjs, given the
 *  `\n`, splits the run into paragraphs that all end a line, so a run after it, such as a bold word,
 *  started a paragraph of its own. */
export function breaks(runs: Run[]): Run[] {
  return runs.flatMap((r) =>
    r.text
      .split(/\r?\n/)
      .map((text, i) =>
        i ? { text, options: { ...r.options, softBreakBefore: true } } : { ...r, text },
      ),
  );
}

export function md(text: string, c: Palette, base: TextProps = {}): Run[] {
  const parts = String(text).split(INLINE_MARKDOWN);
  return parts.flatMap((part, i): Run[] => {
    if (!part) return [];
    if (i % 2 === 0) return [{ text: part, options: { ...base } }];
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const url = /^(https?:|mailto:)/i.test(link[2]) ? link[2] : undefined;
      return [
        {
          text: link[1],
          options: { ...base, color: c.teal, ...(url ? { hyperlink: { url } } : {}) },
        },
      ];
    }
    if (part.startsWith("**"))
      return [{ text: part.slice(2, -2), options: { ...base, bold: true } }];
    if (part.startsWith("*")) {
      return [{ text: part.slice(1, -1), options: { ...base, bold: true, color: c.amber } }];
    }
    // brand's inline code: teal's text colour, regular, on the ink's tint.
    return [
      {
        text: part.slice(1, -1),
        options: { ...base, fontFace: MONO, color: c.tealDark, bold: false, highlight: c.chip },
      },
    ];
  });
}

export const plain = (t: string) => String(t).replace(/\*\*|`|\[([^\]]+)\]\([^)]*\)/g, "$1");

/** One paragraph of a text box: its runs and what sets it apart from the box's defaults. */
export interface Para {
  runs: Run[];
  /** Size relative to the box's size. */
  rel?: number;
  mono?: boolean;
  bold?: boolean;
  bullet?: boolean | "number";
  marker?: MarkerHue;
  indent?: number;
  after?: number;
  align?: "left" | "center" | "right";
  /** Left tab stops, in inches from the box's edge, where a tab in the runs aligns. */
  tabs?: number[];
  /** Line height as a share of the size, where it differs from the box's. */
  line?: number;
  /** Lines broken as `text-wrap: balance` breaks them. */
  balance?: boolean;
}

export interface BoxOpts {
  size: number;
  mono?: boolean;
  bold?: boolean;
  italic?: boolean;
  color: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  line?: number;
  /** The smallest share of `size` the fit may shrink to. */
  floor?: number;
  fill?: string;
  /** Letter spacing in em, as the web's headline tracking. */
  tracking?: number;
  /** Lines broken as `text-wrap: balance` breaks them, as the web's headings. */
  balance?: boolean;
  /** A share of every line height, which the fit sets. */
  lineScale?: number;
}

export type TextType = Pick<BoxOpts, "size" | "mono" | "bold" | "tracking">;

/** A run drawn in capitals whatever its case, as the web's caps labels: pptxgenjs writes no `cap`,
 *  so the run carries this language, which the post-processing turns into the deck's own and
 *  `cap="all"`. The text keeps the deck's case, which an edit in PowerPoint keeps too. */
export const CAPS = "x-caps";
export const caps = (text: string, options: TextProps = {}): Run => ({
  text,
  options: { ...options, lang: CAPS },
});

/** Text the web slide prints as typed, so a `*` or a backtick in it stays a character. */
export const literal = (text: string): Para => ({ runs: [{ text }] });

export const asParas = (p: Para[] | Para | string, c: Palette): Para[] =>
  typeof p === "string" ? [{ runs: md(p, c) }] : Array.isArray(p) ? p : [p];

export function bulletParas(
  items: (string | { text: string; children: string[] })[],
  c: Palette,
  ordered?: boolean,
): Para[] {
  return items.flatMap((item) =>
    typeof item === "string"
      ? [{ runs: md(item, c), bullet: ordered ? ("number" as const) : true, after: 6 }]
      : [
          { runs: md(item.text, c), bullet: ordered ? ("number" as const) : true, after: 4 },
          ...item.children.map((ch) => ({
            runs: md(ch, c),
            bullet: true as const,
            indent: 1,
            after: 4,
          })),
        ],
  );
}
