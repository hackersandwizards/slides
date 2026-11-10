#!/usr/bin/env bun
// slides-pptx: every text is a text box, a table a PowerPoint table, a trend or bar chart a
// PowerPoint chart, a diagram drawn shapes; only a deck's own images and the h&w logos are pictures.
// A deck on a client's template is that consumer's own exporter.
// Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { tokens } from "@hackersandwizards/brand/tokens";
import type {
  ComparisonSide,
  ContentBlock,
  MarkerTone,
  Grounded,
  Presentation,
  RoadmapItem,
  Slide,
  SectionTheme,
  TitleSlide,
} from "../types/slide";
import { trendTicks } from "../components/slides/ChartPlots";
import { groundOf } from "../components/slides/SlideShell";
import { BRAND_MARK, cornerMark, resolveSlideLogo } from "../lib/logo";
import { INLINE_MARKDOWN } from "../lib/markdown";
import {
  isDeepDive,
  isHighlightPhase,
  isOpening,
  isVideo,
  linkLabel,
  mediaAsContent,
  overviewAsPhases,
  pageLabel,
  claimParts,
  closingClaim,
  continuation,
  deckLang,
  deepDiveAsTransition,
  personAccent,
  pipelineAsFlow,
  evolutionAsProcess,
  leadingWords,
  minus,
  numbersGrid,
  profileLabel,
  qrAlt,
  speakerLine,
  contentRedrawnAs,
  gridAsContent,
  labeledGridAsCards,
  dualPillAsRoadmap,
  regularAsContent,
  teamTypesDrawn,
  companiesWithLogo,
  TWO_COLUMN_TONES,
  WORDS,
  type SideTone,
} from "../lib/slide-utils";
import { balance, checkSlide, family, longest, MONO, SANS, wrap, type Span } from "./pptx-text";

type Pptx = InstanceType<typeof PptxGenJS>;
type PSlide = ReturnType<Pptx["addSlide"]>;
type TextProps = PptxGenJS.TextPropsOptions;
type Run = { text: string; options?: TextProps };

// The print route's 1920 px stage on a 13.333 in slide: 144 px to the inch, so a CSS px is half a
// point; the route's root font size is 21.333 px.
const W = 13.333;
const H = 7.5;
const SIDE = 96 / 144;
const TOP = 117 / 144;
const BOTTOM = H - 123 / 144;
const CW = W - 2 * SIDE;

/** A list marker in its own hue, written as a private character, which the post-processing turns
 *  into the brand marker in that hue: pptxgenjs writes no bullet colour. */
const MARKER_CODES = { green: "E001", red: "E002" } as const;
type MarkerHue = keyof typeof MARKER_CODES;
const HUE_OF_MARKER = Object.fromEntries(
  Object.entries(MARKER_CODES).map(([hue, code]) => [code, hue as MarkerHue]),
);
const MARKER_SQUARE = "25AA";

const PT = {
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

function hex(name: keyof typeof tokens): string {
  const value = tokens[name];
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`brand token ${name} is not a hex colour`);
  return value.slice(1).toUpperCase();
}

/** `color-mix(in srgb, a p%, b)`, which the tokens use for their tints. */
function mix(a: string, b: string, p: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  return [0, 2, 4]
    .map((i) =>
      Math.round(ch(a, i) * p + ch(b, i) * (1 - p))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}

function palette(dark: boolean) {
  const night = hex("--color-night");
  const bg = dark ? night : hex("--color-bg");
  const teal = dark ? hex("--color-teal-night") : hex("--color-teal");
  const purple = dark ? hex("--color-purple-night") : hex("--color-purple");
  return {
    bg,
    card: dark ? hex("--color-night-2") : hex("--color-white"),
    ink: dark ? mix("FFFFFF", night, 0.92) : hex("--color-ink"),
    muted: dark ? mix("FFFFFF", night, 0.8) : hex("--color-muted"),
    border: dark ? mix("FFFFFF", night, 0.15) : hex("--color-border"),
    tint: dark ? mix("FFFFFF", night, 0.06) : hex("--color-tint"),
    teal,
    purple,
    amber: dark ? hex("--color-amber") : hex("--color-amber-dark"),
    green: dark ? hex("--color-green") : hex("--color-green-dark"),
    red: dark ? hex("--color-red-night") : hex("--color-red"),
    // The complicated-subsystem team's colour, as DecisionSlide's branch; night lightens it.
    factory: dark ? hex("--color-factory-light") : hex("--color-factory"),
    neutral: dark ? mix(hex("--color-ampersand"), "FFFFFF", 0.6) : hex("--color-ampersand"),
    // The brand's code palette: night (night-2 on a night deck), its text and its command green.
    code: dark ? hex("--color-night-2") : night,
    codeInk: mix("FFFFFF", night, 0.92),
    codeGreen: hex("--color-green"),
    chip: mix(dark ? mix("FFFFFF", night, 0.92) : hex("--color-ink"), bg, dark ? 0.08 : 0.07),
    tealDark: dark ? mix(hex("--color-teal-night"), "FFFFFF", 0.7) : hex("--color-teal-dark"),
    tealTint: mix(teal, bg, 0.12),
    purpleTint: mix(purple, bg, 0.12),
    greenTint: mix(dark ? hex("--color-green") : hex("--color-green-dark"), bg, 0.1),
    redTint: mix(dark ? hex("--color-red-night") : hex("--color-red"), bg, 0.08),
    amberTint: mix(hex("--color-amber"), bg, 0.12),
    // brand's hw-callout, teal or data-hue="purple": the hue at 10 % on white, its night tone at
    // 14 % on night, no line.
    callout: (hue: string) => (dark ? mix(hue, bg, 0.14) : mix(hue, "FFFFFF", 0.1)),
  };
}
type Palette = ReturnType<typeof palette>;

/** brand's stage scale, the slide's type table: a value it sets, as a number. */
const stageCss = readFileSync(
  createRequire(import.meta.url).resolve("@hackersandwizards/brand/stage.css"),
  "utf8",
);
function stage(name: string): number {
  const m = new RegExp(`${name}:\\s*([\\d.]+);`).exec(stageCss);
  if (!m) throw new Error(`brand's stage.css sets no ${name}`);
  return Number(m[1]);
}
/** The web's line heights: body text, a slide title, a display heading. */
const LEADING = {
  body: stage("--text-base--line-height"),
  title: stage("--slide-title-leading"),
  display: stage("--slide-display-leading"),
};

/** A card's title and a diagram's label in the brand's h3 face, as the web's card-title utility. */
const TITLE = (() => {
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

/** Runs with each `\n` as a line break inside the paragraph (`<a:br/>`). pptxgenjs, given the
 *  `\n`, splits the run into paragraphs that all end a line, so a run after it, such as a bold word,
 *  started a paragraph of its own. */
function breaks(runs: Run[]): Run[] {
  return runs.flatMap((r) =>
    r.text
      .split(/\r?\n/)
      .map((text, i) =>
        i ? { text, options: { ...r.options, softBreakBefore: true } } : { ...r, text },
      ),
  );
}

/** Inline markdown as the engine reads it. */
function md(text: string, c: Palette, base: TextProps = {}): Run[] {
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

const plain = (t: string) => String(t).replace(/\*\*|`|\[([^\]]+)\]\([^)]*\)/g, "$1");

/** One paragraph of a text box: its runs and what sets it apart from the box's defaults. */
interface Para {
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

interface BoxOpts {
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

/** A run drawn in capitals whatever its case, as the web's caps labels: pptxgenjs writes no `cap`,
 *  so the run carries this language, which the post-processing turns into the deck's own and
 *  `cap="all"`. The text keeps the deck's case, which an edit in PowerPoint keeps too. */
const CAPS = "x-caps";
const caps = (text: string, options: TextProps = {}): Run => ({
  text,
  options: { ...options, lang: CAPS },
});

/** Width in inches of `text` set in one face, with 1 % to spare: LibreOffice sets a line up to
 *  0.7 % wider than the faces' advances add up to, so a box sized to its text keeps it on a line. */
const textWidth = (text: string, size: number, mono = false, bold = false, tracking = 0) =>
  (wrap([{ text: plain(text), size, mono, bold, tracking: tracking * size }], Infinity)[0].width /
    72) *
  1.01;

/** The size a paragraph is drawn at, at scale k: pptxgenjs writes half points. */
const drawnSize = (p: Para, o: BoxOpts, k: number) => Math.round(o.size * (p.rel ?? 1) * k * 2) / 2;

/** A paragraph as the measure reads it: each run in the face and weight it is drawn in. */
function spansOf(p: Para, o: BoxOpts, k: number): Span[] {
  const size = drawnSize(p, o, k);
  return p.runs.map((r) => ({
    text: r.text,
    size: r.options?.fontSize ?? size,
    mono: (r.options?.fontFace ?? ((p.mono ?? o.mono) ? MONO : SANS)) === MONO,
    bold: !!(r.options?.bold ?? p.bold ?? o.bold),
    tracking: (o.tracking ?? 0) * size,
    caps: r.options?.lang === CAPS,
  }));
}

/** A paragraph's left margin in inches: a bullet's, as `box` writes it. */
const marginOf = (p: Para) => (p.bullet ? (BULLET_INDENT * (1 + (p.indent ?? 0))) / 72 : 0);
const BULLET_INDENT = 16;

/** A paragraph's line height in points at scale k: the web's leading for its size, exact. */
const lineOf = (p: Para, o: BoxOpts, k: number) =>
  drawnSize(p, o, k) * (p.line ?? o.line ?? LEADING.body) * (o.lineScale ?? 1);

function parasHeight(paras: Para[], o: BoxOpts, w: number, k: number) {
  return paras.reduce((sum, p, i) => {
    const n = wrap(spansOf(p, o, k), (w - marginOf(p)) * 72).length;
    const after = i < paras.length - 1 ? (p.after ?? 0) * k : 0;
    return sum + (n * lineOf(p, o, k) + after) / 72;
  }, 0);
}

/** The scale in [floor, 1] at which `paras` fit `h` inches and their longest word `w`. */
function fitScale(paras: Para[], o: BoxOpts, w: number, h: number) {
  let k = 1;
  const floor = o.floor ?? 0.6;
  const widest = (kk: number) =>
    Math.max(...paras.map((p) => longest(spansOf(p, o, kk)) / 72 + marginOf(p)));
  while (k > floor && (parasHeight(paras, o, w, k) > h + 0.005 || widest(k) > w)) k -= 0.02;
  return Math.max(k, floor);
}

/** A paragraph's runs with a forced line break (`\n`) where `text-wrap: balance` breaks it, at
 *  the drawn size, so PowerPoint sets the slide's lines rather than breaking greedily. */
function balanced(p: Para, o: BoxOpts, k: number, w: number): Run[] {
  const lines = balance(spansOf(p, o, k), (w - marginOf(p)) * 72);
  if (lines.length < 2) return p.runs;
  // Each line's end in the paragraph's text, past the spaces it broke at.
  const text = p.runs.map((r) => r.text).join("");
  const cuts: [number, number][] = [];
  let at = 0;
  for (const line of lines.slice(0, -1)) {
    at = text.indexOf(line.text, at) + line.text.length;
    // A line the text breaks itself keeps its own break.
    if (text[at] === "\n") {
      at++;
      continue;
    }
    const gap = /^[ \t]*/.exec(text.slice(at))![0].length;
    cuts.push([at, at + gap]);
    at += gap;
  }
  const out: Run[] = [];
  let pos = 0;
  for (const r of p.runs) {
    let t = "";
    for (let i = 0; i < r.text.length; i++, pos++) {
      const cut = cuts.find(([from, to]) => pos >= from && pos < to);
      if (cut) {
        if (pos === cut[0]) t += "\n";
      } else {
        if (cuts.some(([from, to]) => from === to && pos === from)) t += "\n";
        t += r.text[i];
      }
    }
    out.push({ ...r, text: t });
  }
  return out;
}

/** Text the web slide prints as typed, so a `*` or a backtick in it stays a character. */
const literal = (text: string): Para => ({ runs: [{ text }] });

const asParas = (p: Para[] | Para | string, c: Palette): Para[] =>
  typeof p === "string" ? [{ runs: md(p, c) }] : Array.isArray(p) ? p : [p];

/** A text box at x, y, w, h whose paragraphs shrink together until their measure fits. */
function box(
  s: PSlide,
  c: Palette,
  content: Para[] | Para | string,
  x: number,
  y: number,
  w: number,
  h: number,
  o: BoxOpts,
) {
  const paras = asParas(content, c).filter((p) => p.runs.some((r) => r.text));
  if (!paras.length) return;
  // A box too short for its lines keeps their size and closes their leading first, down to the
  // size itself: a box cut to a label's height on the web holds the label at its size.
  let k = fitScale(paras, o, w, h);
  if (k < 1) {
    const base = Math.min(...paras.map((p) => p.line ?? o.line ?? LEADING.body));
    for (let sc = 0.98; sc * base >= 1; sc -= 0.02)
      if (fitScale(paras, { ...o, lineScale: sc }, w, h) === 1) {
        o = { ...o, lineScale: sc };
        k = 1;
        break;
      }
  }
  const runs: Run[] = [];
  paras.forEach((p, i) => {
    const last = i === paras.length - 1;
    const size = drawnSize(p, o, k);
    breaks(o.balance || p.balance ? balanced(p, o, k, w) : p.runs).forEach((r, j, all) => {
      runs.push({
        text: r.text,
        options: {
          fontFace: (p.mono ?? o.mono) ? MONO : SANS,
          fontSize: size,
          color: o.color,
          bold: p.bold ?? o.bold,
          italic: o.italic,
          ...(o.tracking ? { charSpacing: Math.round(o.tracking * size * 10) / 10 } : {}),
          align: p.align ?? o.align ?? "left",
          // Exact points, the web's line box: a percentage would multiply the face's own line
          // height, a fifth to a third taller than the size.
          lineSpacing: lineOf(p, o, k),
          paraSpaceAfter: last ? 0 : (p.after ?? 0) * k,
          ...(p.tabs
            ? { tabStops: p.tabs.map((at) => ({ position: at * k, alignment: "l" as const })) }
            : {}),
          ...(p.bullet
            ? {
                bullet:
                  p.bullet === "number"
                    ? { type: "number" }
                    : {
                        code: p.marker ? MARKER_CODES[p.marker] : MARKER_SQUARE,
                        indent: BULLET_INDENT,
                      },
                indentLevel: p.indent ?? 0,
              }
            : {}),
          ...r.options,
          ...(j === all.length - 1 && !last ? { breakLine: true } : {}),
        },
      });
    });
  });
  // The box 1 % wider than the width its lines were measured at, on the side its text runs to:
  // LibreOffice sets a line up to 0.7 % wider than the faces' advances add up to, and would wrap
  // a line the measure fills. A filled box keeps its size.
  const spare = o.fill ? 0 : w * 0.01;
  const align = paras.some((p) => p.align === "center") ? "center" : (o.align ?? "left");
  const dx = align === "center" ? spare / 2 : align === "right" ? spare : 0;
  s.addText(runs, {
    x: x - dx,
    y,
    w: w + spare,
    h,
    margin: 0,
    valign: o.valign ?? "top",
    fit: "none",
    ...(o.fill ? { fill: { color: o.fill } } : {}),
  });
}

/** The height a box of `content` needs at full size, capped at `max`. */
function need(content: Para[] | Para | string, c: Palette, w: number, o: BoxOpts, max = H) {
  return Math.min(max, parasHeight(asParas(content, c), o, w, 1));
}

/** The brand card's corner, `--slide-radius` at 1920: 40 px at the top left and bottom right, a
 *  quarter of it at the other two, which the post-processing sets. */
const CORNER = 40 / 144;

/** A card: the brand's corners, or every corner `r` round where given, as a pill or a label box. */
function card(
  s: PSlide,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  line?: string,
  r?: number,
) {
  s.addShape(r === undefined ? "round2DiagRect" : "roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: Math.min(r ?? CORNER, w / 2, h / 2),
    fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: "none" },
  });
}

/** A process slide's footer, `SlideCaption` on the web: brand's teal callout as wide as its
 *  text, centred, at `y`; returns its height. */
function caption(s: PSlide | undefined, c: Palette, text: string, y: number) {
  const o: BoxOpts = { size: PT.base, color: c.ink, align: "center", valign: "middle" };
  const fw = Math.min(CW, 1365 / 144, textWidth(text, PT.base) + 2 * CALLOUT_PAD + 0.02);
  const th = need(text, c, fw - 2 * CALLOUT_PAD, o);
  const h = th + 2 * CALLOUT_PAD;
  if (!s) return h;
  card(s, (W - fw) / 2, y, fw, h, c.callout(c.teal));
  box(s, c, text, (W - fw) / 2 + CALLOUT_PAD, y + CALLOUT_PAD, fw - 2 * CALLOUT_PAD, th, o);
  return h;
}

function rect(s: PSlide, x: number, y: number, w: number, h: number, fill: string, line?: string) {
  s.addShape("rect", {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: "none" },
  });
}

function arrow(
  s: PSlide,
  c: Palette,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = c.muted,
) {
  s.addShape("line", {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1) || 0.001,
    h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1,
    flipV: y2 < y1,
    line: { color, width: 1.25, endArrowType: "triangle" },
  });
}

/** A chip's text width in inches per point of size, in the face a chip sets it in. */
const chipAdvance = (text: string, mono: boolean) => textWidth(text, 1, mono, mono);
const chipWidth = (text: string, size: number, mono: boolean) =>
  chipAdvance(text, mono) * size + 0.3;

/** The type size at which a row of chips in the sans face `gap` apart fits `width`: `size`, or
 *  smaller where the row would run past it, down to half of it, past which it warns. */
function rowSize(ctx: Ctx, texts: string[], size: number, gap: number, width: number) {
  const fixed = texts.length * 0.3 + (texts.length - 1) * gap;
  const per = texts.reduce((sum, t) => sum + chipAdvance(t, false), 0);
  const fit = (width - fixed) / per;
  if (fit < size / 2) ctx.warnings.push(`chips ${texts.join(", ")}: wider than the slide holds`);
  return Math.max(size / 2, Math.min(size, fit));
}

/** Each of `n` rows' share of `room`, at most `cap`; below `floor` the rows run past the slide,
 *  which warns. */
function rowShare(ctx: Ctx, what: string, room: number, n: number, cap: number, floor = 0.15) {
  const share = Math.min(cap, room / n);
  if (share < floor) ctx.warnings.push(`${what}: ${n} rows taller than the slide holds`);
  return Math.max(floor, share);
}

function chip(
  s: PSlide,
  c: Palette,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  color: string,
  mono = true,
  /** A label box instead of a pill: its line and the small corner (`--slide-radius-sm`, 0.46875
   *  of the stage's 90 rem). */
  line?: string,
) {
  const w = chipWidth(text, size, mono);
  card(s, x, y, w, (size * 1.9) / 72, fill, line, line ? (0.46875 * W) / 90 : (size * 1.9) / 144);
  box(s, c, { runs: [{ text: plain(text) }] }, x, y, w, (size * 1.9) / 72, {
    size,
    mono,
    bold: mono,
    color,
    align: "center",
    valign: "middle",
    floor: 0.8,
  });
  return w;
}

function imageSize(buf: Buffer): [number, number] | undefined {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.toString("ascii", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf.toString("ascii", 8, 12) === "WEBP") {
    const kind = buf.toString("ascii", 12, 16);
    if (kind === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (kind === "VP8L") {
      const b = buf.readUInt32LE(21);
      return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
    }
    return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      i += 2 + len;
    }
  }
  return undefined;
}

function brandLogo(name: string): string {
  return createRequire(import.meta.url).resolve(`@hackersandwizards/brand/logos/${name}.png`);
}

/** A brand logo's path and its width over its height, read from the file, since each cut has its
 *  own (the night lockup is wider than the day one). */
const cuts = new Map<string, [string, number]>();
function brandCut(name: string): [string, number] {
  const known = cuts.get(name);
  if (known) return known;
  const path = brandLogo(name);
  const [w, h] = imageSize(readFileSync(path))!;
  cuts.set(name, [path, w / h]);
  return [path, w / h];
}

/** A trend's marked point, -1 for none, and the series its legend leaves out, or whether a bar's
 *  names stay level. */
type ChartFix = { now: number; unnamed: number[] } | { level: boolean };

interface Ctx {
  pptx: Pptx;
  c: Palette;
  assets: string;
  dark: boolean;
  warnings: string[];
  /** Per chart number, what `finishChart` sets on it. */
  charts: Map<number, ChartFix>;
  /** The words the engine prints itself, in the deck's language. */
  words: (typeof WORDS)["en" | "de"];
}

/** A deck file's path: a root path under the consumer's public directory, else a file path as it
 *  stands, which is what Bun gives an imported image, the specimen's among them. Vite's dev URL
 *  for one keeps its query. */
const assetFile = (ctx: Ctx, src: string) => {
  const path = src.replace(/\?.*$/, "");
  const inAssets = join(ctx.assets, path.replace(/^\//, ""));
  return existsSync(inAssets) || !existsSync(path) ? inAssets : path;
};

/** A deck image, from the consumer's public directory, contained in the box. The engine's own
 *  logo paths take the brand package's PNG cut, since PowerPoint shows an SVG without a raster
 *  fallback as a broken picture in older viewers. */
function picture(
  s: PSlide,
  ctx: Ctx,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  o: {
    alt?: string;
    href?: string;
    /** Cropped to a circle that it fills, as a portrait. */
    round?: boolean;
    align?: "center" | "left";
    /** Never drawn larger than the file at 144 px to the inch, as the slide never scales one up. */
    native?: boolean;
  } = {},
) {
  const logo = BRAND_MARK.exec(src);
  const path = logo ? brandLogo(logo[1]) : assetFile(ctx, src);
  const size = existsSync(path) ? imageSize(readFileSync(path)) : undefined;
  if (!size) {
    ctx.warnings.push(
      `image ${src}: ${existsSync(path) ? "unreadable format" : `not found under ${ctx.assets}`}`,
    );
    card(s, x, y, w, h, ctx.c.tint, ctx.c.border);
    box(s, ctx.c, o.alt || src, x + 0.1, y + 0.1, w - 0.2, h - 0.2, {
      size: PT.sm,
      color: ctx.c.muted,
      align: "center",
      valign: "middle",
    });
    return { x, y, w, h };
  }
  const [iw, ih] = size;
  if (o.round) {
    // Filled and anchored at the top, as the web's hw-avatar (object-position: top).
    const d = Math.min(w, h);
    const k = d / Math.min(iw, ih);
    const [px, py] = [x + (w - d) / 2, y + (h - d) / 2];
    s.addImage({
      path,
      x: px,
      y: py,
      w: iw * k,
      h: ih * k,
      sizing: { type: "crop", x: (iw * k - d) / 2, y: 0, w: d, h: d },
      rounding: true,
      altText: altText(o.alt),
      ...pictureLink(o.href),
    });
    return { x: px, y: py, w: d, h: d };
  }
  const k = Math.min(w / iw, h / ih, o.native ? 1 / 144 : Infinity);
  const pw = iw * k;
  const ph = ih * k;
  const px = o.align === "left" ? x : x + (w - pw) / 2;
  const py = y + (h - ph) / 2;
  s.addImage({
    path,
    x: px,
    y: py,
    w: pw,
    h: ph,
    altText: altText(o.alt),
    ...pictureLink(o.href),
  });
  return { x: px, y: py, w: pw, h: ph };
}

/** A picture's description. pptxgenjs describes a picture without one by its file path, which
 *  names the exporting machine's user and folders: a space describes it as nothing. */
const altText = (alt?: string) => alt || " ";

/** A picture's link. pptxgenjs escapes a text run's link, never a picture's, which it writes into
 *  the slide's relationships as it stands: a raw `&` there leaves the part malformed. */
const pictureLink = (href?: string) =>
  href
    ? {
        hyperlink: {
          url: href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
        },
      }
    : {};

const THEME: Record<SectionTheme, keyof Palette> = {
  primary: "teal",
  secondary: "purple",
  accent: "amber",
  warning: "amber",
  success: "green",
  deepdive: "purple",
};

/** A contact closing slide without portraits carries the lockup in its centre column and none in
 *  the corner, as the web's `.slide-closing-mark` does. */
/** Whether a closing stands the h&w mark centred in place of its speakers' companies. */
export const centredMark = (d: Extract<Slide, { type: "closing" }>) =>
  d.variant !== "discussion" && !d.speakers?.some((sp) => sp.imageSrc);

/** The brand strip, the page counter, the corner mark and a client's logo on the left. */
function frame(s: PSlide, ctx: Ctx, deck: Presentation, index: number) {
  const { c } = ctx;
  s.background = { color: c.bg };
  // The strip's teal-to-purple gradient as twenty-four steps, since a pptxgenjs shape takes no
  // gradient fill.
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    // Each step overlaps the next by a hundredth, so no seam shows; the last ends at the edge.
    const x = (W / steps) * i;
    rect(
      s,
      x,
      0,
      Math.min(W / steps + 0.01, W - x),
      16 / 144,
      mix(c.purple, c.teal, i / (steps - 1)),
    );
  }
  const slide = deck.slides[index];
  const mark = cornerMark(deck, index);
  const closingCentred = slide.type === "closing" && centredMark(slide);
  const markH = 42 / 144;
  const lockupH = 65 / 144;
  const right = W - 96 / 144;
  const baseY = 1024 / 144;
  let x = right;
  if (!closingCentred) {
    const [path, ratio] = brandCut(`${mark}${ctx.dark ? "-night" : ""}`);
    const h = mark === "lockup" ? lockupH : markH;
    x = right - h * ratio;
    s.addImage({
      path,
      x,
      y: baseY - h / 2,
      w: h * ratio,
      h,
      altText: "hackers&wizards",
    });
  }
  const page = pageLabel(deck.slides, index);
  if (page) {
    box(s, c, { runs: [{ text: page }] }, x - 1.8, baseY - 0.14, 1.6, 0.28, {
      size: PT.label,
      mono: true,
      bold: true,
      color: c.muted,
      align: "right",
      valign: "middle",
    });
  }
  const logo = resolveSlideLogo(deck, index);
  const first = Array.isArray(logo) ? logo[0] : logo;
  if (first && !BRAND_MARK.test(first.src)) {
    picture(s, ctx, first.src, 24 / 144, H - 24 / 144 - 36 / 144, 1.4, 36 / 144, {
      alt: first.alt,
      align: "left",
    });
  }
  if (slide.notes) s.addNotes(slide.notes);
}

interface Head {
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline?: string;
  subtitle?: string;
  preText?: string;
}

/** A timeline event's title, text and result in the figure face, as `EventBody` sets them on the
 *  web: one list, so the measured height is the drawn one. */
function eventParas(
  e: Extract<ContentBlock, { type: "timeline" }>["events"][number],
  c: Palette,
  hi: boolean,
): Para[] {
  return [
    { runs: md(e.title, c, { color: hi ? c.teal : c.ink }), ...TITLE, after: 4 },
    { runs: md(e.text ?? "", c, { color: c.muted }), rel: 0.9, after: e.text ? 16 : 8 },
    ...(e.figure
      ? [
          {
            runs: [{ text: e.figure, options: { color: hi ? c.teal : c.ink } }],
            mono: true,
            bold: true,
            rel: PT.s6 / PT.base,
          },
        ]
      : []),
  ];
}

/** A person's LinkedIn address in muted ink, linked: `LinkCaption`'s linkedin variant. */
const profileLink = (url: string, c: Palette): Para => ({
  runs: [{ text: profileLabel(url), options: { color: c.muted, hyperlink: { url } } }],
});

/** The height a slide's footer takes above the bottom edge: its line under a rule. */
function footerHeight(ctx: Ctx, text?: string): number {
  return text ? need(text, ctx.c, CW, { size: PT.base, color: ctx.c.ink }, 0.6) + 0.25 : 0;
}

/** The slide's footer (`SlideFooter` on the web): one line under a rule, at the bottom or at
 *  `top`, where it follows the body. */
function footer(
  s: PSlide,
  ctx: Ctx,
  text: string | undefined,
  h: number,
  centered = false,
  top = BOTTOM - h,
) {
  if (!text) return;
  s.addShape("line", {
    x: SIDE,
    y: top + 0.05,
    w: CW,
    h: 0.001,
    line: { color: ctx.c.border, width: 0.75 },
  });
  box(s, ctx.c, text, SIDE, top + 0.15, CW, h - 0.15, {
    size: PT.base,
    color: ctx.c.ink,
    align: centered ? "center" : "left",
  });
}

/** Kicker, principle pill, title and subtitle; returns where the body starts. */
function header(s: PSlide, ctx: Ctx, h: Head, centered = false): number {
  const { c } = ctx;
  let y = 58 / 144;
  // The kicker band's second row, where the principle pill wraps as on the web.
  let wrapped = 0;
  const kicker = h.sectionLabel ?? h.preText;
  if (kicker || h.principle) {
    let x = SIDE;
    // Teal in every section, the website's mono caps.
    if (kicker) {
      // The web's label line, 1.4 of its size, as wide as its capitals.
      const kw = textWidth(kicker.toUpperCase(), PT.base, true, false, 0.06) + 0.02;
      box(s, c, { runs: [caps(kicker)] }, x, 0.38, Math.min(kw, CW), 0.35, {
        size: PT.base,
        mono: true,
        color: c.teal,
        tracking: 0.06,
        valign: "middle",
        line: 1.4,
      });
      x += kw + 0.18;
    }
    if (h.principle) {
      if (x + chipWidth(h.principle, PT.sm, false) > W - SIDE) {
        wrapped = (45 + 20) / 144;
        x = SIDE;
      }
      chip(s, c, h.principle, x, y + wrapped + 0.02, PT.sm, c.tint, c.ink, false);
    }
  }
  y = TOP + wrapped;
  if (h.headline) {
    const o: BoxOpts = {
      size: PT.title,
      mono: true,
      bold: true,
      color: c.ink,
      line: LEADING.title,
      floor: 0.7,
      tracking: -0.035,
      balance: true,
      align: centered ? "center" : "left",
    };
    const hh = need(h.headline, c, CW, o, 1.1);
    box(s, c, h.headline, SIDE, y, CW, Math.max(hh, 0.45), o);
    y += Math.max(hh, 0.45) + 0.08;
  }
  if (h.subtitle) {
    const o: BoxOpts = { size: PT.base, color: c.muted, align: centered ? "center" : "left" };
    const sh = need(h.subtitle, c, CW, o, 0.7);
    box(s, c, h.subtitle, SIDE, y, CW, sh, o);
    y += sh;
  }
  return y + 0.3;
}

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

const bodyO = (c: Palette, k: number, extra: Partial<BoxOpts> = {}): BoxOpts => ({
  size: PT.base * k,
  color: c.ink,
  ...extra,
});

function bulletParas(
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

/** A card with a title and items or text, as two-column, four-column and comparison sides draw. */
function itemCard(
  s: PSlide,
  ctx: Ctx,
  a: Area,
  k: number,
  o: {
    title?: string;
    subtitle?: string;
    items?: string[];
    text?: string;
    tone?: string;
    marker?: MarkerHue;
  },
) {
  const { c } = ctx;
  card(s, a.x, a.y, a.w, a.h, c.card, o.tone ?? c.border);
  const pad = 0.2;
  const paras: Para[] = [];
  if (o.title)
    paras.push({
      runs: md(o.title, c, { color: o.tone ?? c.ink }),
      ...TITLE,
      rel: PT.h4 / PT.base,
      after: 6,
    });
  if (o.subtitle) paras.push({ runs: md(o.subtitle, c, { color: c.muted }), rel: 0.9, after: 6 });
  if (o.text) paras.push({ runs: md(o.text, c), after: 6 });
  for (const it of o.items ?? []) {
    paras.push({ runs: md(it, c), bullet: true, marker: o.marker, after: 5 });
  }
  box(s, c, paras, a.x + pad, a.y + pad, a.w - 2 * pad, a.h - 2 * pad, bodyO(c, k));
}

/** The web's circle-x or circle-check icon at x, y in diameter d, drawn in lines. */
function circleMark(s: PSlide, x: number, y: number, d: number, color: string, check: boolean) {
  const line = { color, width: 1.5 };
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { type: "none" }, line });
  const strokes = check
    ? [
        [0.3, 0.52, 0.45, 0.67],
        [0.45, 0.67, 0.72, 0.36],
      ]
    : [
        [0.35, 0.35, 0.65, 0.65],
        [0.65, 0.35, 0.35, 0.65],
      ];
  for (const [x1, y1, x2, y2] of strokes)
    s.addShape("line", {
      x: x + d * Math.min(x1, x2),
      y: y + d * Math.min(y1, y2),
      w: d * Math.abs(x2 - x1),
      h: d * Math.abs(y2 - y1),
      flipV: (x2 - x1) * (y2 - y1) < 0,
      line,
    });
}

type BeforeAfterSide = { label: string; items: string[]; highlight?: string };

/** A two-sided comparison side's highlight, as the web's caps label under the side's title. */
const highlightPara = (text: string, color: string): Para => ({
  runs: [caps(text, { color })],
  mono: true,
  bold: true,
  rel: 0.8,
  after: 8,
});

/** Side i of a before-after in width w: its label row, with the web's circle icon on an after
 *  side that does not add and on a struck before side, and its highlight and plain items under it, struck through
 *  on a struck before side, with the heights both need. */
function beforeAfterSide(
  c: Palette,
  sd: BeforeAfterSide,
  i: number,
  strike: boolean,
  w: number,
  o: BoxOpts,
  k: number,
  adds: boolean,
) {
  const tone = i ? c.teal : c.muted;
  const icon = (i && !adds) || (!i && strike) ? (o.size * 1.3) / 72 : 0;
  const indent = icon && icon + 0.12;
  const item = !i && strike ? { color: c.muted, strike: "sngStrike" as const } : {};
  // The web prints a before-after label as typed.
  const label: Para = {
    runs: [{ text: sd.label, options: { color: tone } }],
    ...TITLE,
    rel: PT.h4 / PT.base,
  };
  const rest = [
    ...(sd.highlight ? [highlightPara(sd.highlight, tone)] : []),
    ...sd.items.map((it) => ({ runs: md(it, c, item), after: 6 })),
  ];
  const inner = w - 2 * BA_PAD * k;
  return {
    tone,
    icon,
    indent,
    label,
    rest,
    labelH: Math.max(icon, need(label, c, inner - indent, o)),
    restH: need(rest, c, inner, o),
  };
}

const BA_PAD = 0.25;
const BA_GAP = 0.7;

/** The height beforeAfter needs in width w. */
function beforeAfterHeight(
  c: Palette,
  sides: BeforeAfterSide[],
  strike: boolean,
  w: number,
  o: BoxOpts,
  k = 1,
  adds = false,
) {
  return Math.max(
    ...sides.map((sd, i) => {
      const l = beforeAfterSide(c, sd, i, strike, (w - BA_GAP * k) / 2, o, k, adds);
      return (2 * BA_PAD + 0.15 + 0.1) * k + l.labelH + l.restH;
    }),
  );
}

/** The before and the after side by side with an arrow between, as the web's BeforeAfterSides
 *  draws a comparison's `before-after` and the transform block: plain items, the before side
 *  muted on white and, with `strike`, crossed out, struck through and greyed. */
function beforeAfter(
  s: PSlide,
  ctx: Ctx,
  a: Area,
  o: BoxOpts,
  sides: BeforeAfterSide[],
  strike: boolean,
  k = 1,
  adds = false,
) {
  const { c } = ctx;
  // The web shrinks a block whole: its paddings and gap with its text.
  const pad = BA_PAD * k;
  const gap = BA_GAP * k;
  const half = (a.w - gap) / 2;
  sides.forEach((sd, i) => {
    const x = a.x + i * (half + gap);
    const l = beforeAfterSide(c, sd, i, strike, half, o, k, adds);
    if (i) card(s, x, a.y, half, a.h, c.tealTint, c.teal);
    else card(s, x, a.y, half, a.h, strike ? mix(c.muted, c.bg, 0.07) : c.card, c.border);
    const top = a.y + pad;
    if (l.icon) circleMark(s, x + pad, top + (l.labelH - l.icon) / 2, l.icon, l.tone, i === 1);
    box(s, c, l.label, x + pad + l.indent, top, half - 2 * pad - l.indent, l.labelH, {
      ...o,
      valign: "middle",
    });
    const ry = top + l.labelH + 0.15 * k;
    box(s, c, l.rest, x + pad, ry, half - 2 * pad, a.y + a.h - pad - ry, o);
  });
  const ay = a.y + a.h / 2;
  if (adds)
    box(s, c, "+", a.x + half, ay - gap / 2, gap, gap, {
      size: PT.title * k,
      bold: true,
      color: c.teal,
      align: "center",
      valign: "middle",
    });
  else arrow(s, c, a.x + half + 0.12 * k, ay, a.x + half + gap - 0.12 * k, ay, c.teal);
}

/** A two-sided comparison's punchline and footnotes under its sides from y, as the web sets them:
 *  the punchline 2.5 rem under in a 48 rem column, balanced, the footnotes 1.5 rem under that in a
 *  56 rem column. Draws where `s` is given; returns the height. */
function comparisonFoot(
  s: PSlide | undefined,
  c: Palette,
  d: { punchline?: string; footnotes?: string[] },
  y: number,
) {
  const punchO: BoxOpts = {
    size: PT.h4,
    mono: true,
    bold: true,
    color: c.teal,
    align: "center",
    line: 1.35,
  };
  const noteO: BoxOpts = { size: 13.33, color: c.muted, line: 1.4 };
  const pw = Math.min(CW, 48 * REM);
  // The footnotes' column shrinks to their longest line, centred, as the web's.
  const nw = Math.min(
    CW,
    56 * REM,
    Math.max(0, ...(d.footnotes ?? []).map((f) => textWidth(f, 13.33) + 0.02)),
  );
  const punch: Para = { runs: md(d.punchline ?? "", c), balance: true };
  const notes = (d.footnotes ?? []).map((f) => ({ runs: md(f, c) }));
  const ph = d.punchline ? need(punch, c, pw, punchO) : 0;
  const nh = notes.length ? need(notes, c, nw, noteO) : 0;
  let h = 0;
  if (ph) {
    h += 2.5 * REM;
    if (s) box(s, c, punch, (W - pw) / 2, y + h, pw, ph, punchO);
    h += ph;
  }
  if (nh) {
    h += 1.5 * REM;
    if (s) box(s, c, notes, (W - nw) / 2, y + h, nw, nh, noteO);
    h += nh;
  }
  return h;
}

/** The hue a two-column side's tone (`TWO_COLUMN_TONES`) takes. */
const SIDE_HUES: Record<SideTone, MarkerHue | "muted"> = {
  success: "green",
  error: "red",
  neutral: "muted",
};

/** The height of each row of a table at scale k in width w, its header first. */
function tableRows(b: Extract<ContentBlock, { type: "table" }>, c: Palette, w: number, k: number) {
  const cols = Math.max(b.headers?.length ?? 0, ...b.rows.map((r) => r.length));
  const o = bodyO(c, k);
  const row = (r: string[]) =>
    Math.max(...r.map((t) => need(t, c, w / cols - 0.2, { ...o, size: PT.base * 0.875 * k }))) +
    0.3;
  return [...(b.headers ? [row(b.headers)] : []), ...b.rows.map(row)];
}

/** A code block's lines without their common indent, as the web shows them. */
function codeLines(code: string) {
  const lines = code.split("\n");
  const cut = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  );
  return lines.map((l) => l.slice(Number.isFinite(cut) ? cut : 0));
}

/** The rule and its gap before a quote's words: brand's 2 px and 1.25 rem on the 1920 stage. */
const QUOTE_INDENT = (2 + 20) / 144;

/** A quote block's paragraphs, each with its type size: the words, then the source in grey. */
function quoteParas(b: Extract<ContentBlock, { type: "quote" }>, c: Palette, k: number) {
  const words: [Para, number] = [{ runs: md(b.text, c), after: 8 }, PT.h3 * k];
  return b.source
    ? [words, [{ runs: md(b.source, c, { color: c.muted }) }, PT.lead * k] as [Para, number]]
    : [words];
}

function blockHeight(b: ContentBlock, c: Palette, w: number, k: number): number {
  // Drawn as the cards block the web draws it as, columns included.
  if (b.type === "labeled-grid") return blockHeight(labeledGridAsCards(b), c, w, k);
  const o = bodyO(c, k);
  switch (b.type) {
    case "paragraph":
      return need(b.text, c, w, o);
    case "bullets":
      return need(bulletParas(b.items, c, b.ordered), c, w, o);
    case "quote":
      return quoteParas(b, c, k).reduce(
        (h, [p, size]) => h + need(p, c, w - QUOTE_INDENT, { ...o, size }) + 0.1,
        0,
      );
    case "callout":
      return need(b.text, c, w - 2 * CALLOUT_PAD * k, o) + 2 * CALLOUT_PAD * k;
    case "table":
      return tableRows(b, c, w, k).reduce((x, y) => x + y, 0);
    case "terminal":
      return (b.commands.length * PT.sm * k * 1.5) / 72 + 0.45;
    case "code":
    case "annotated-code": {
      const codeW = b.type === "annotated-code" && b.notes.length ? w * 0.62 : w;
      const lines = codeLines(b.code).map((l) => ({ runs: [{ text: l || " " }] }));
      return (
        need(lines, c, codeW - 0.4, { size: PT.sm * k, mono: true, line: 1.08, color: c.codeInk }) *
          1.2 +
        0.4
      );
    }
    case "transform":
      return beforeAfterHeight(c, [b.before, b.after], false, w, o, k);
    case "positions":
      return positions(undefined, c, b, { x: 0, y: 0, w }, k);
    case "two-column": {
      const sides = [b.left, b.right];
      return (
        Math.max(
          ...sides.map((sd) =>
            need(
              [
                { runs: [{ text: "x" }], rel: 1.2, after: 6 },
                ...(sd.items ?? []).map((i) => ({
                  runs: md(i, c),
                  bullet: true as const,
                  after: 5,
                })),
                ...(sd.text ? [{ runs: md(sd.text, c) }] : []),
              ],
              c,
              w / 2 - 0.6,
              o,
            ),
          ),
        ) + 0.45
      );
    }
    case "four-column":
      return (
        Math.max(
          ...b.columns.map((col) =>
            need(
              [
                { runs: [{ text: col.title }], rel: 1.2, after: 6 },
                ...col.items.map((i) => ({ runs: md(i, c), bullet: true as const, after: 5 })),
              ],
              c,
              w / b.columns.length - 0.5,
              o,
            ),
          ),
        ) + 0.5
      );
    case "hooks":
      return b.items.length * ((PT.base * k * 1.9) / 72 + 0.12);
    case "cards":
      return cardsLayout(b, c, w, k).h;
    case "pipeline":
      return blockHeight(pipelineAsFlow(b), c, w, k);
    case "flow":
      return flowBlock(undefined, c, b, { x: 0, y: 0, w }, k);
    case "layers":
      return b.layers.length * (0.5 * k + 0.1);
    case "timeline":
      return (
        0.6 +
        Math.max(
          ...b.events.map((e) => need(eventParas(e, c, false), c, w / b.events.length - 0.15, o)),
        )
      );
    case "bars":
      return barsLayout(b, { c, words: WORDS.en } as Ctx, w, k).h;
    case "numbers":
      return numbersLayout(b, c, w, k).h;
    case "image":
    case "gallery":
    case "linked-image":
    case "video":
    case "annotated":
    case "image-and-grid":
      return 99;
    case "code-and-text":
      return Math.max(
        (b.code.split("\n").length * PT.sm * k * 1.3) / 72 + 0.4,
        need(
          b.sections.flatMap((sc) => [
            { runs: [{ text: sc.title }], after: 4 },
            { runs: md(sc.text, c), after: 8 },
          ]),
          c,
          w / 2 - 0.2,
          o,
        ),
      );
  }
}

const GROWS = new Set(["image", "gallery", "linked-image", "video", "annotated", "image-and-grid"]);

/** A gallery: its pictures and videos in a row or grid of equal cells, each over its caption, and
 *  its tags as chips under them. */
function gallery(s: PSlide, ctx: Ctx, b: Extract<ContentBlock, { type: "gallery" }>, area: Area) {
  const { c } = ctx;
  const tagH = b.tags?.length ? 0.4 : 0;
  const a = { ...area, h: area.h - tagH };
  const n = b.items.length;
  const cols = b.layout === "row" ? n : Math.min(n, 3);
  const rows = Math.ceil(n / cols);
  const cw = (a.w - (cols - 1) * 0.25) / cols;
  const rh = (a.h - (rows - 1) * 0.25) / rows;
  b.items.forEach((src, i) => {
    const x = a.x + (i % cols) * (cw + 0.25);
    const yy = a.y + Math.floor(i / cols) * (rh + 0.25);
    const capH = src.caption ? 0.3 : 0;
    if (isVideo(src)) {
      drawBlock(
        s,
        ctx,
        { type: "video", src: src.src, alt: src.alt, caption: src.caption, poster: src.poster },
        { x, y: yy, w: cw, h: rh },
        1,
        false,
      );
      return;
    }
    picture(s, ctx, src.src, x, yy, cw, rh - capH, { alt: src.alt });
    if (src.caption)
      box(s, c, src.caption, x, yy + rh - capH + 0.05, cw, capH - 0.05, {
        size: PT.sm,
        color: c.muted,
        align: "center",
      });
  });
  if (!b.tags?.length) return;
  const row = b.tags.reduce((sum, t) => sum + chipWidth(t, PT.label, false) + 0.1, -0.1);
  let x = a.x + (a.w - row) / 2;
  for (const t of b.tags)
    x += chip(s, c, t, x, a.y + a.h + 0.1, PT.label, c.card, c.ink, false) + 0.1;
}

function drawBlock(s: PSlide, ctx: Ctx, b: ContentBlock, a: Area, k: number, centered: boolean) {
  if (b.type === "labeled-grid") return drawBlock(s, ctx, labeledGridAsCards(b), a, k, centered);
  const { c } = ctx;
  const o = bodyO(c, k, centered ? { align: "center" } : {});
  switch (b.type) {
    case "paragraph":
      return box(
        s,
        c,
        { runs: md(b.text, c), align: b.centered || centered ? "center" : "left" },
        a.x,
        a.y,
        a.w,
        a.h,
        o,
      );
    case "bullets":
      return box(s, c, bulletParas(b.items, c, b.ordered), a.x, a.y, a.w, a.h, {
        ...o,
        align: "left",
      });
    case "quote": {
      // Brand's quote: a purple rule, the words in ink behind it, the source under them.
      rect(s, a.x, a.y, 2 / 144, a.h, c.purple);
      return box(
        s,
        c,
        quoteParas(b, c, k).map(([p, size]) => ({ ...p, rel: size / (PT.base * k) })),
        a.x + QUOTE_INDENT,
        a.y,
        a.w - QUOTE_INDENT,
        a.h,
        { ...o, align: "left" },
      );
    }
    case "callout": {
      if (centered) {
        const w = Math.min(a.w, 7.5);
        card(s, a.x + (a.w - w) / 2, a.y, w, a.h, c.card, c.border);
        return box(s, c, b.text, a.x + (a.w - w) / 2 + 0.3, a.y + 0.15, w - 0.6, a.h - 0.3, {
          ...o,
          size: PT.lead * k,
          color: c.muted,
          align: "center",
          valign: "middle",
        });
      }
      // The web's callouts: the info one brand's purple one, in ink; a warning or success the tone at 7 % on
      // the ground with its border at 25 %, the text the tone mixed 60 % with ink.
      const tone =
        b.variant === "warning" ? c.amber : b.variant === "success" ? c.green : undefined;
      const ink = tone ? mix(tone, c.ink, 0.6) : c.ink;
      // As wide as its text, at the body size, brand's callout padding round it.
      const pad = CALLOUT_PAD * k;
      const w = b.fullWidth ? a.w : Math.min(a.w, textWidth(b.text, o.size) + 2 * pad + 0.02);
      const fill = tone ? mix(tone, c.bg, 0.07) : c.callout(c.purple);
      card(s, a.x, a.y, w, a.h, fill, tone && mix(tone, c.bg, 0.25));
      return box(s, c, b.text, a.x + pad, a.y + pad, w - 2 * pad, a.h - 2 * pad, {
        ...o,
        color: ink,
        align: "left",
        valign: "middle",
      });
    }
    case "table": {
      const cols = Math.max(b.headers?.length ?? 0, ...b.rows.map((r) => r.length));
      const total = b.widths?.reduce((x, y) => x + y, 0);
      const colW = Array.from({ length: cols }, (_, i) =>
        b.widths && total ? (b.widths[i] / total) * a.w : a.w / cols,
      );
      // The web's table: body and headers at the small step, headers as mono capitals.
      const size = Math.max(7, Math.round(PT.base * 0.875 * k * 2) / 2);
      const cell = (t: string, head: boolean): PptxGenJS.TableCell => ({
        text: breaks(
          md(
            t,
            c,
            head ? { bold: true, fontFace: MONO, color: c.ink, fontSize: size, lang: CAPS } : {},
          ),
        ) as PptxGenJS.TableCell[],
        options: { fill: { color: head ? c.tint : c.card } },
      });
      const rows = [
        ...(b.headers ? [b.headers.map((t) => cell(t, true))] : []),
        // The web sets a table's first column in bold, as the row's name.
        ...b.rows.map((r) =>
          r.map((t, j) => {
            const td = cell(t, false);
            return j === 0 ? { ...td, options: { ...td.options, bold: true } } : td;
          }),
        ),
      ];
      s.addTable(rows, {
        x: a.x,
        y: a.y,
        w: a.w,
        colW,
        // The planned row heights, so the table fills the area the layout gave it.
        rowH: tableRows(b, c, a.w, k),
        fontFace: SANS,
        fontSize: size,
        color: c.ink,
        border: { type: "solid", pt: 0.75, color: c.border },
        // Inches, as pptxgenjs reads a table's margin.
        margin: [0.1, 0.1, 0.1, 0.1],
        valign: "middle",
        autoPage: false,
      });
      return;
    }
    case "code":
    case "annotated-code": {
      card(s, a.x, a.y, a.w, a.h, c.code, undefined, 0.06);
      const lines = codeLines(b.code);
      const notes = b.type === "annotated-code" ? b.notes : [];
      const codeW = notes.length ? a.w * 0.62 : a.w;
      const lh = (PT.sm * k * 1.3) / 72;
      for (const n of notes)
        rect(s, a.x, a.y + 0.2 + (n.line - 1) * lh, codeW, lh, mix(c.teal, c.code, 0.35));
      box(
        s,
        c,
        lines.map((l) => ({ runs: [{ text: l || " " }] })),
        a.x + 0.25,
        a.y + 0.2,
        codeW - 0.4,
        a.h - 0.3,
        // Single spacing is about 1.2 em, so 1.08 gives the web's 1.3 em code leading.
        { size: PT.sm * k, mono: true, color: c.codeInk, line: 1.08, floor: 0.5 },
      );
      notes.forEach((n, i) => {
        const y = a.y + 0.2 + (n.line - 1) * lh;
        box(
          s,
          c,
          {
            runs: [
              { text: `${i + 1}  `, options: { bold: true, color: c.teal } },
              ...md(n.text, c),
            ],
          },
          a.x + a.w * 0.64 + 0.2,
          y - 0.02,
          a.w * 0.36 - 0.3,
          Math.max(lh * 2, 0.4),
          { size: PT.sm * k, color: c.codeInk, floor: 0.7 },
        );
      });
      return;
    }
    case "terminal": {
      card(s, a.x, a.y, a.w, a.h, c.code, undefined, 0.06);
      box(
        s,
        c,
        b.commands.map((cmd) => ({
          runs: [{ text: `${cmd.prefix} `, options: { color: c.codeGreen } }, { text: cmd.text }],
          after: 4,
        })),
        a.x + 0.25,
        a.y + 0.2,
        a.w - 0.5,
        a.h - 0.3,
        { size: PT.sm * k, mono: true, color: c.codeInk, line: 1.3 },
      );
      return;
    }
    case "code-and-text": {
      const half = a.w / 2 - 0.15;
      drawBlock(
        s,
        ctx,
        { type: "code", language: b.language ?? "", code: b.code },
        { ...a, w: half },
        k,
        false,
      );
      box(
        s,
        c,
        b.sections.flatMap((sc) => [
          {
            runs: md(sc.title, c, { color: c.amber, lang: CAPS }),
            mono: true,
            bold: true,
            after: 4,
          },
          { runs: md(sc.text, c), after: 10 },
        ]),
        a.x + half + 0.3,
        a.y,
        half,
        a.h,
        o,
      );
      return;
    }
    case "two-column": {
      // A deck's JSON is read unchecked: a variant the map lacks draws neutral, as on the web.
      const [lt, rt] = (TWO_COLUMN_TONES[b.variant ?? "neutral"] ?? TWO_COLUMN_TONES.neutral).map(
        (tone) => {
          const hue = SIDE_HUES[tone];
          return hue === "muted" ? {} : { tone: c[hue], marker: hue };
        },
      );
      const half = a.w / 2 - 0.15;
      itemCard(s, ctx, { ...a, w: half }, k, { ...b.left, ...lt });
      itemCard(s, ctx, { ...a, x: a.x + half + 0.3, w: half }, k, { ...b.right, ...rt });
      return;
    }
    case "four-column": {
      const n = b.columns.length;
      const cw = (a.w - (n - 1) * 0.2) / n;
      b.columns.forEach((col, i) =>
        itemCard(s, ctx, { ...a, x: a.x + i * (cw + 0.2), w: cw }, k, col),
      );
      return;
    }
    case "transform":
      return beforeAfter(s, ctx, a, bodyO(c, k), [b.before, b.after], false, k);
    case "positions":
      positions(s, c, b, a, k);
      return;
    case "hooks": {
      // The web's hook list: one row per event, its name as a mono chip before the description.
      const rh = Math.min(
        (PT.base * k * 1.9) / 72,
        (a.h - (b.items.length - 1) * 0.12) / b.items.length,
      );
      b.items.forEach((it, i) => {
        const y = a.y + i * (rh + 0.12);
        card(s, a.x, y, a.w, rh, c.card, c.border, rh / 2);
        const w = chip(
          s,
          c,
          it.name,
          a.x + 0.1,
          y + rh / 2 - (PT.sm * k * 1.9) / 144,
          PT.sm * k,
          c.tint,
          c.ink,
        );
        box(s, c, { runs: md(it.description, c) }, a.x + w + 0.25, y, a.w - w - 0.4, rh, {
          ...o,
          size: PT.sm * k,
          color: c.muted,
          valign: "middle",
        });
      });
      return;
    }
    case "cards": {
      const L = cardsLayout(b, c, a.w, k);
      let rowY = a.y;
      L.cells.forEach((cell, i) => {
        const [r, col] = [Math.floor(i / L.cols), i % L.cols];
        if (col === 0 && r) rowY += L.rowH[r - 1] + L.gap;
        const x = a.x + col * (L.cw + L.gap);
        card(
          s,
          x,
          rowY,
          L.cw,
          L.rowH[r],
          cell.hi ? c.tealTint : c.card,
          cell.hi ? c.teal : c.border,
        );
        const ix = x + L.padX;
        let y = rowY + L.padY;
        if (b.numbered || cell.it.icon) {
          // `NumberTile` lg: the number white on teal, or an icon's soft tile.
          const solid = b.numbered || cell.hi;
          card(
            s,
            ix,
            y,
            cell.mark,
            cell.mark,
            solid ? c.teal : mix(c.teal, c.card, 0.07),
            undefined,
            10 / 144,
          );
          if (b.numbered)
            box(
              s,
              c,
              { runs: [{ text: String(i + (b.numberFrom ?? 1)) }] },
              ix,
              y,
              cell.mark,
              cell.mark,
              {
                size: PT.lead * k,
                mono: true,
                bold: true,
                color: c.card,
                align: "center",
                valign: "middle",
                line: 1,
              },
            );
        } else if (cell.mark) rect(s, ix, y, 4 * REM * k, cell.mark, c.teal);
        if (cell.mark) y += cell.mark + L.inGap;
        if (cell.title) {
          box(s, c, cell.title, ix, y, L.inner, cell.th, L.titleO);
          y += cell.th + L.inGap;
        }
        if (cell.body.length) box(s, c, cell.body, ix, y, L.inner, cell.bh, L.textO);
      });
      return;
    }
    case "pipeline":
      return drawBlock(s, ctx, pipelineAsFlow(b), a, k, centered);
    case "flow":
      flowBlock(s, c, b, a, k);
      return;
    case "layers": {
      const n = b.layers.length;
      const lh = (a.h - (n - 1) * 0.1) / n;
      b.layers.forEach((l, i) => {
        const y = a.y + i * (lh + 0.1);
        const hi = i === b.highlight;
        card(s, a.x, y, a.w, lh, hi ? c.tealTint : c.card, hi ? c.teal : c.border, 0.05);
        box(
          s,
          c,
          {
            runs: [
              ...(b.ordered
                ? [{ text: `${i + 1}  `, options: { color: c.teal, bold: true } }]
                : []),
              { text: l.title, options: { bold: true, fontFace: MONO } },
              ...(l.text ? [{ text: "   " }, ...md(l.text, c, { color: c.muted })] : []),
            ],
          },
          a.x + 0.25,
          y,
          a.w - 0.5,
          lh,
          { ...o, valign: "middle", align: "left" },
        );
      });
      return;
    }
    case "timeline": {
      if (b.labels) {
        const lw = 1.2;
        const rows: [string | undefined, number, number][] = [
          [b.labels.when, a.y, PT.label],
          [b.labels.title, a.y + 0.55, PT.base],
          [b.labels.text, a.y + 0.8, PT.base * 0.9],
        ];
        for (const [label, ly, size] of rows) {
          if (label)
            box(s, c, { runs: [{ text: label }] }, a.x, ly, lw - 0.1, 0.25, {
              size: size * k,
              mono: true,
              bold: true,
              color: c.muted,
              align: "right",
            });
        }
        return drawBlock(
          s,
          ctx,
          { ...b, labels: undefined },
          { ...a, x: a.x + lw, w: a.w - lw },
          k,
          centered,
        );
      }
      const n = b.events.length;
      const ew = a.w / n;
      const ly = a.y + 0.35;
      // A timeline continued over slides runs its line in from the slide's edge or out to it.
      const { into, onward } = continuation(b);
      const from = into ? 0 : a.x + ew / 2;
      const to = onward ? W : a.x + a.w - ew / 2;
      s.addShape("line", {
        x: from,
        y: ly,
        w: to - from,
        h: 0.001,
        line: { color: c.border, width: 2 },
      });
      // The line after `now` is dashed, as is a run-out past the last event (`now` defaults to it)
      // and a run-in where no event has happened (`now` -1).
      const now = b.now ?? n - 1;
      if (now < n - 1 || onward) {
        const dx = now < 0 ? from : a.x + ew / 2 + now * ew;
        for (const color of [c.bg, c.muted])
          s.addShape("line", {
            x: dx,
            y: ly,
            w: to - dx,
            h: 0.001,
            line: { color, width: 2, dashType: "dash" },
          });
      }
      b.events.forEach((e, i) => {
        const cx = a.x + ew * i + ew / 2;
        const hi = i === b.highlight;
        s.addShape("ellipse", {
          x: cx - 0.09,
          y: ly - 0.09,
          w: 0.18,
          h: 0.18,
          fill: { color: hi ? c.teal : c.card },
          line: { color: hi ? c.teal : c.muted, width: 1.5 },
        });
        // A segment's label breaks the middle of the line that leads to its event, as on the web.
        if (e.segment && i > 0) {
          const tw = textWidth(e.segment, PT.label * k, true) + 0.16;
          box(s, c, { runs: [{ text: e.segment }] }, cx - ew / 2 - tw / 2, ly - 0.11, tw, 0.22, {
            size: PT.label * k,
            mono: true,
            bold: true,
            color: c.muted,
            align: "center",
            valign: "middle",
            fill: c.bg,
          });
        }
        if (e.when)
          box(s, c, { runs: [{ text: e.when }] }, cx - ew / 2 + 0.05, a.y, ew - 0.1, 0.22, {
            size: PT.label * k,
            mono: true,
            bold: true,
            color: c.muted,
            align: "center",
          });
        box(s, c, eventParas(e, c, hi), cx - ew / 2 + 0.07, ly + 0.2, ew - 0.14, a.h - 0.55, {
          ...o,
          align: "center",
        });
      });
      return;
    }
    case "bars": {
      const L = barsLayout(b, ctx, a.w, k);
      for (const r of L.rows) {
        const y = a.y + r.y;
        box(s, c, r.label, a.x, y + r.labelY, L.labelW, r.labelH, L.labelO);
        const ty = y + r.barY;
        if (b.max != null) {
          // The track ends on a rule and marks its quarters in the ground, under the bar.
          rect(s, a.x + L.trackX, ty, L.trackW, L.barH, mix(c.ink, c.bg, 0.07));
          rect(s, a.x + L.trackX + L.trackW - 4 / 144, ty, 4 / 144, L.barH, mix(c.ink, c.bg, 0.25));
          for (const q of [0.25, 0.5, 0.75])
            rect(s, a.x + L.trackX + q * L.trackW - 1 / 144, ty, 2 / 144, L.barH, c.bg);
        }
        // A range starts at its low end, as on the web slide.
        rect(s, a.x + L.trackX + r.from, ty, r.barW, L.barH, r.fill);
        box(s, c, r.value, a.x + r.valueX, ty, L.valueW, L.barH, r.valueO);
      }
      if (b.max != null)
        for (const t of L.ticks) {
          const tw = 4 * REM * k;
          const x = a.x + L.trackX + (t.q / 100) * L.trackW - tw / 2;
          box(s, c, literal(t.text), x, a.y + L.scaleY, tw, L.h - L.sourceH - L.scaleY, L.scaleO);
        }
      if (b.source)
        box(
          s,
          c,
          b.source,
          a.x,
          a.y + L.h - L.sourceH + 2.5 * REM * k,
          a.w,
          L.sourceH - 2.5 * REM * k,
          {
            ...o,
            size: PT.sm * k,
            color: c.muted,
          },
        );
      return;
    }
    case "numbers": {
      const L = numbersLayout(b, c, a.w, k);
      L.cells.forEach((cell) => {
        const [x, y] = [a.x + cell.x, a.y + cell.y];
        box(s, c, cell.figure, x, y, L.cw, L.fig, L.figO);
        if (L.rule)
          s.addShape("line", {
            x,
            y: y + L.fig + 1.5 * REM * k,
            w: L.cw,
            h: 0,
            line: { color: c.border, width: 2 * k },
          });
        box(s, c, cell.paras, x, y + L.fig + L.over, L.cw, cell.h, L.o);
      });
      if (b.source)
        box(
          s,
          c,
          b.source,
          a.x,
          a.y + L.h - L.sourceH + L.sourceGap,
          a.w,
          L.sourceH - L.sourceGap,
          {
            ...o,
            size: PT.sm * k,
            color: c.muted,
          },
        );
      return;
    }
    case "image":
      picture(s, ctx, b.src, a.x, a.y, a.w, a.h, { alt: b.alt, native: true });
      return;
    case "gallery":
      return gallery(s, ctx, b, a);
    case "linked-image": {
      // The link spelled out under the picture, as on the slide.
      const line = b.href ? 0.42 : 0;
      const p = picture(s, ctx, b.src, a.x, a.y, a.w, a.h - line, {
        alt: b.alt,
        href: b.href,
        native: true,
      });
      if (b.href)
        box(
          s,
          c,
          { runs: [{ text: `↗ ${linkLabel(b.href)}`, options: { hyperlink: { url: b.href } } }] },
          a.x,
          p.y + p.h + 0.08,
          a.w,
          0.32,
          { ...o, size: PT.base, mono: true, color: c.teal, align: "center" },
        );
      return;
    }
    case "video": {
      const path = assetFile(ctx, b.src);
      const h = a.h - (b.caption ? 0.35 : 0);
      if (existsSync(path)) {
        const w = Math.min(a.w, (h * 16) / 9);
        // pptxgenjs stores the cover as a PNG part whatever its bytes: anything else stays out.
        const poster = b.poster && assetFile(ctx, b.poster);
        const cover = poster && existsSync(poster) ? readFileSync(poster) : undefined;
        const png = cover?.toString("latin1", 1, 4) === "PNG";
        if (b.poster && !png)
          ctx.warnings.push(`video ${b.src}: poster ${b.poster} is no PNG under ${ctx.assets}`);
        s.addMedia({
          type: "video",
          path,
          x: a.x + (a.w - w) / 2,
          y: a.y,
          w,
          h,
          ...(png ? { cover: `data:image/png;base64,${cover!.toString("base64")}` } : {}),
        });
      } else {
        ctx.warnings.push(`video ${b.src}: not found under ${ctx.assets}`);
        card(s, a.x, a.y, a.w, h, c.tint, c.border);
        box(s, c, b.alt || b.src, a.x, a.y, a.w, h, {
          ...o,
          align: "center",
          valign: "middle",
          color: c.muted,
        });
      }
      if (b.caption)
        box(s, c, b.caption, a.x, a.y + h + 0.08, a.w, 0.27, {
          ...o,
          size: PT.sm,
          color: c.muted,
          align: "center",
        });
      return;
    }
    case "annotated": {
      const iw = a.w * 0.62;
      const [w0, h0] = b.size;
      const top = b.crop?.top ?? 0;
      const bottom = b.crop?.bottom ?? 1;
      const right = b.crop?.right ?? 1;
      const srcW = w0 * right;
      const srcH = h0 * (bottom - top);
      const k2 = Math.min(iw / srcW, a.h / srcH);
      const pw = srcW * k2;
      const ph = srcH * k2;
      const path = assetFile(ctx, b.src);
      if (existsSync(path)) {
        s.addImage({
          path,
          // pptxgenjs crops a picture of this whole size to the box below, as the portrait does.
          x: a.x,
          y: a.y,
          w: w0 * k2,
          h: h0 * k2,
          altText: altText(b.alt),
          sizing: {
            type: "crop",
            x: 0,
            y: top * h0 * k2,
            w: pw,
            h: ph,
          } as unknown as PptxGenJS.ImageProps["sizing"],
        });
      } else ctx.warnings.push(`image ${b.src}: not found under ${ctx.assets}`);
      b.notes.forEach((n, i) => {
        const y = a.y + ((n.y - top) / (bottom - top)) * ph;
        s.addShape("ellipse", {
          x: a.x + pw - 0.14,
          y: y - 0.14,
          w: 0.28,
          h: 0.28,
          fill: { color: c.teal },
          line: { type: "none" },
        });
        box(s, c, { runs: [{ text: String(i + 1) }] }, a.x + pw - 0.14, y - 0.14, 0.28, 0.28, {
          size: PT.label,
          mono: true,
          bold: true,
          color: c.card,
          align: "center",
          valign: "middle",
        });
        box(
          s,
          c,
          {
            runs: [
              { text: `${i + 1}  `, options: { bold: true, color: c.teal } },
              ...md(n.text, c),
            ],
          },
          a.x + iw + 0.35,
          y - 0.2,
          a.w - iw - 0.35,
          0.6,
          { ...o, size: PT.sm * k },
        );
      });
      return;
    }
    case "image-and-grid": {
      const iw = a.w * 0.42;
      picture(s, ctx, b.image.src, a.x, a.y, iw, a.h, { alt: b.image.alt });
      let y = a.y;
      if (b.gridTitle) {
        box(s, c, b.gridTitle, a.x + iw + 0.3, y, a.w - iw - 0.3, 0.3, {
          ...o,
          mono: true,
          bold: true,
        });
        y += 0.4;
      }
      drawBlock(
        s,
        ctx,
        { type: "labeled-grid", columns: 1, items: b.items },
        {
          x: a.x + iw + 0.3,
          y,
          w: a.w - iw - 0.3,
          h: Math.max(0, Math.min(a.y + a.h - y, b.items.length * 1.2)),
        },
        k,
        false,
      );
      return;
    }
  }
}

/** A rem of the print route's stage, 21.333 px at 1920, in inches. */
const REM = 21.333 / 144;

/** A bars block as `Bars` sets it: four bars and more one row each, the label left of its track,
 *  fewer with the label above; a highlight in teal and bold, the other bars context in grey; without
 *  a named scale each figure follows its bar's end. */
function barsLayout(b: Extract<ContentBlock, { type: "bars" }>, ctx: Ctx, w: number, k: number) {
  const { c } = ctx;
  const bars = b.order === "given" ? b.bars : [...b.bars].sort((p, q) => q.value - p.value);
  const max = b.max ?? (Math.max(...bars.map((x) => x.value), 0) || 1);
  const inline = bars.length > 3;
  const anyHighlight = bars.some((x) => x.highlight);
  const follow = b.max == null && bars.every((x) => x.from == null);
  const gap = 2 * REM * k;
  const barH = (inline ? 3 : 5) * REM * k;
  const labelW = inline ? 18 * REM * k : w;
  const valueW = 14 * REM * k;
  const trackX = inline ? labelW + gap : 0;
  // Without a scale the longest bar ends where the value column would start.
  const trackW = w - trackX - (follow ? 16 * REM * k : valueW + gap);
  const labelO: BoxOpts = {
    size: (inline ? PT.lead : PT.h3) * k,
    color: c.ink,
    line: 1.25,
    valign: inline ? "middle" : "top",
    ...(inline ? {} : { tracking: -0.025 }),
  };
  let y = 0;
  const rows = bars.map((bar) => {
    const context = anyHighlight && !bar.highlight;
    const tone = context ? c.muted : bar.highlight ? c.teal : c.ink;
    const label: Para = { runs: md(bar.label, c, { color: tone }), bold: !context, balance: true };
    const lh = need(label, c, labelW, labelO);
    const rowH = inline ? Math.max(lh, barH) : lh + 0.75 * REM * k + barH;
    const from = ((bar.from ?? 0) / max) * trackW;
    const barW = Math.max(4 / 144, ((bar.value - (bar.from ?? 0)) / max) * trackW);
    const text =
      bar.display ??
      (bar.from != null
        ? `${ctx.words.figure(bar.from)}–${ctx.words.figure(bar.value)}`
        : ctx.words.figure(bar.value));
    const row = {
      y,
      label,
      labelY: inline ? (rowH - lh) / 2 : 0,
      labelH: lh,
      barY: inline ? (rowH - barH) / 2 : lh + 0.75 * REM * k,
      from,
      barW,
      fill: bar.highlight || !anyHighlight ? c.teal : mix(c.ink, c.bg, 0.4),
      value: { runs: [{ text }], bold: !context } as Para,
      valueO: {
        size: (inline ? PT.h3 : PT.title) * k,
        mono: true,
        color: tone,
        valign: "middle",
        line: 1,
      } as BoxOpts,
      valueX: trackX + (follow ? from + barW + gap : trackW + gap),
    };
    y += rowH + (inline ? 1.25 : 3) * REM * k;
    return row;
  });
  const sourceH = b.source
    ? 2.5 * REM * k + need(b.source, c, w, { size: PT.sm * k, color: c.muted })
    : 0;
  // A named scale is numbered under the last track at its ends and quarters.
  const scaleO: BoxOpts = { size: PT.h4 * k, color: c.muted, line: 1.375, align: "center" };
  const scaleY = y - (inline ? 1.25 : 3) * REM * k + 0.75 * REM * k;
  const scaleH = b.max == null ? 0 : 0.75 * REM * k + need("0", c, w, scaleO);
  const h = y - (inline ? 1.25 : 3) * REM * k + scaleH + sourceH;
  const ticks = [0, 25, 50, 75, 100].map((q) => ({
    q,
    text: ctx.words.figure((max * q) / 100),
  }));
  return { rows, barH, labelW, labelO, trackX, trackW, valueW, sourceH, h, scaleO, scaleY, ticks };
}

/** A step of `FlowSteps`: the flow block's, a pipeline's or a process slide's node. */
interface FlowStep {
  title: string;
  text?: string;
  label?: string;
  subtitle?: string;
  badge?: string;
  dim?: boolean;
  numbered?: false;
  tone?: "red" | "green";
}

/** A team-topology slide's body as `TeamTopologySlide` draws it, the Team Shape Templates in brand
 *  colours: the enabling teams in a row of columns on the left, the stream teams beside them one
 *  per row with their roles after the name where they fit, the complicated subsystems as octagons
 *  under them, the platform teams side by side in a dotted frame, then the legend and caption.
 *  Draws where `s` is given; returns the height at scale k. */
function topology(
  s: PSlide | undefined,
  ctx: Ctx,
  d: Extract<Slide, { type: "team-topology" }>,
  a: Area,
  k: number,
): number {
  const { c } = ctx;
  const sp = (v: number) => v * 0.25 * REM * k;
  const bd = (3 / 144) * k;
  // Sizes as drawn, in the half points pptxgenjs writes, so a box sized to its text holds it.
  const pt = (v: number) => Math.round(v * k * 2) / 2;
  const titleO: BoxOpts = { size: pt(PT.h4), ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: pt(PT.h4), color: c.ink, line: 1.375 };
  const hue = { enabling: c.purple, stream: c.teal, platform: c.teal, subsystem: c.neutral };
  const shape = (
    type: keyof typeof hue,
    x: number,
    y: number,
    w: number,
    h: number,
    r = CORNER * k,
  ) =>
    s?.addShape(
      type === "subsystem" ? "octagon" : r === CORNER * k ? "round2DiagRect" : "roundRect",
      {
        x,
        y,
        w,
        h,
        rectRadius:
          type === "subsystem" ? Math.min(0.9 * REM * k, h / 2) : Math.min(r, w / 2, h / 2),
        fill: type === "platform" ? { type: "none" } : { color: mix(hue[type], c.bg, 0.07) },
        line: {
          color: hue[type],
          width: 1.5 * k,
          ...(type === "platform" ? { dashType: "sysDot" as const } : {}),
        },
      },
    );
  // A column of paragraphs in width w, drawn at x, y where both are given; returns its height.
  const column = (parts: [Para, BoxOpts, number][], w: number, x?: number, y = 0) => {
    let h = 0;
    for (const [p, o, gap] of parts) {
      const ph = need(p, c, w, o);
      h += gap;
      if (s && x !== undefined) box(s, c, p, x, y + h, w, ph, o);
      h += ph;
    }
    return h;
  };
  const name = (text: string, color: string): Para => ({ runs: md(text, c, { color }) });
  // A team's roles as one line, each whole behind its own bullet, so a wrap falls between roles.
  const roles = (labels: string[]): Para => ({
    runs: labels.flatMap((l, i) => [
      { text: `${i ? "   " : ""}\u2022\u00a0`, options: { color: c.muted, bold: true } },
      { text: l.replace(/ /g, "\u00a0"), options: { color: c.tealDark, bold: true } },
    ]),
    balance: true,
  });

  // The enabling columns: 14 rem wide, wider where a word needs it, as `md:w-56 md:min-w-min`.
  const enW = d.enabling.map((t) => {
    const words = [
      ...t.name.split(/\s+/).map((w) => textWidth(w, titleO.size, TITLE.mono, TITLE.bold, -0.015)),
      ...t.experts.flatMap((e) => e.split(/\s+/).map((w) => textWidth(w, textO.size))),
    ];
    return Math.max(sp(56), Math.max(...words) + 0.02 + 2 * sp(4) + 2 * bd);
  });
  const enParts = (t: (typeof d.enabling)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.purple), titleO, 0],
    ...t.experts.map((e, i): [Para, BoxOpts, number] => [
      name(e, c.ink),
      { ...textO, line: 1.25 },
      sp(i ? 2 : 1),
    ]),
  ];
  const enH = d.enabling.map(
    (t, i) => column(enParts(t), enW[i] - 2 * sp(4) - 2 * bd) + 2 * sp(3) + 2 * bd,
  );
  const mx = a.x + enW.reduce((sum, w) => sum + w + sp(4), 0);
  const mw = a.x + a.w - mx;

  // The stream teams, a row each: the roles after the name where both fit one line.
  const sIn = mw - 2 * sp(5) - 2 * bd;
  const streams = d.streamAligned.map((t) => {
    const nw = textWidth(t.name, titleO.size, TITLE.mono, TITLE.bold, -0.015) + 0.02;
    const r = roles(t.roles);
    const rw = textWidth(r.runs.map((x) => x.text).join(""), textO.size, false, true);
    const beside = t.roles.length > 0 && nw + sp(6) + rw <= sIn;
    const nh = need(name(t.name, c.ink), c, sIn, titleO);
    const rh = t.roles.length ? need(r, c, beside ? rw + 0.02 : sIn, textO) : 0;
    return {
      t,
      r,
      nw,
      rw,
      beside,
      nh,
      rh,
      h: 2 * sp(3) + 2 * bd + (beside ? Math.max(nh, rh) : nh + (rh && sp(2) + rh)),
    };
  });
  const subs = d.complicatedSubsystem ?? [];
  const subW = subs.length ? (mw - (subs.length - 1) * sp(4)) / subs.length : 0;
  const subParts = (t: (typeof subs)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.ink), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(0.5)] as [Para, BoxOpts, number]]
      : []),
  ];
  const subIn = subW - 2 * sp(7) - 2 * bd;
  const subH = subs.length
    ? Math.max(...subs.map((t) => column(subParts(t), subIn))) + 2 * sp(3) + 2 * bd
    : 0;
  const mainH = [...streams.map((st) => st.h), ...(subs.length ? [subH] : [])].reduce(
    (sum, h, i) => sum + h + (i ? sp(3) : 0),
    0,
  );
  const rowH = d.enabling.length || streams.length || subs.length ? Math.max(mainH, ...enH) : 0;

  // The platform teams side by side in one dotted frame.
  const pw = d.platform.length
    ? (a.w - 2 * sp(3) - 2 * bd - (d.platform.length - 1) * sp(4)) / d.platform.length
    : 0;
  const platParts = (t: (typeof d.platform)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.tealDark), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(1.5)] as [Para, BoxOpts, number]]
      : []),
    ...(t.roles?.length ? [[roles(t.roles), textO, sp(1.5)] as [Para, BoxOpts, number]] : []),
  ];
  const platH = d.platform.length
    ? Math.max(...d.platform.map((t) => column(platParts(t), pw - 2 * sp(2)))) +
      2 * sp(1) +
      2 * sp(3) +
      2 * bd
    : 0;

  const words = ctx.words.teams;
  const legO: BoxOpts = { size: pt(17.33), color: c.muted, line: 1.4, valign: "middle" };
  // The legend's items in rows as `flex-wrap` sets them: x and row of each.
  const legRow = Math.max(sp(8), (legO.size * 1.4) / 72);
  const legend: {
    type: ReturnType<typeof teamTypesDrawn>[number];
    x: number;
    row: number;
    tw: number;
  }[] = [];
  if (d.legend)
    for (const type of teamTypesDrawn(d)) {
      const tw = textWidth(words[type], legO.size) + 0.02;
      const last = legend.at(-1);
      let lx = last ? last.x + sp(17) + last.tw + sp(10) : 0;
      let row = last?.row ?? 0;
      if (last && lx + sp(17) + tw > a.w) [lx, row] = [0, row + 1];
      legend.push({ type, x: lx, row, tw });
    }
  const legRows = legend.length ? legend.at(-1)!.row + 1 : 0;
  const legH = legRows && sp(4) + legRows * legRow + (legRows - 1) * sp(3);
  const capO: BoxOpts = { size: pt(PT.h4), color: c.muted, line: 1.4 };
  const capH = d.caption ? sp(2) + need(d.caption, c, a.w, capO) : 0;
  const rows = [rowH, platH, legH, capH].filter(Boolean);
  const total = rows.reduce((sum, h) => sum + h, 0) + (rows.length - 1) * sp(4);
  if (!s) return total;

  let y = a.y;
  let x = a.x;
  d.enabling.forEach((t, i) => {
    shape("enabling", x, y, enW[i], rowH);
    const inner = enW[i] - 2 * sp(4) - 2 * bd;
    column(enParts(t), inner, x + bd + sp(4), y + (rowH - enH[i]) / 2 + bd + sp(3));
    x += enW[i] + sp(4);
  });
  let sy = y;
  for (const st of streams) {
    shape("stream", mx, sy, mw, st.h);
    const tx = mx + bd + sp(5);
    const ty = sy + bd + sp(3);
    const line = st.beside ? Math.max(st.nh, st.rh) : st.nh;
    box(
      s,
      c,
      name(st.t.name, c.ink),
      tx,
      ty + (line - st.nh) / 2,
      st.beside ? st.nw : sIn,
      st.nh,
      titleO,
    );
    if (st.t.roles.length)
      box(
        s,
        c,
        st.r,
        st.beside ? tx + st.nw + sp(6) : tx,
        st.beside ? ty + (line - st.rh) / 2 : ty + st.nh + sp(2),
        st.beside ? st.rw + 0.02 : sIn,
        st.rh,
        textO,
      );
    sy += st.h + sp(3);
  }
  subs.forEach((t, i) => {
    const ox = mx + i * (subW + sp(4));
    shape("subsystem", ox, sy, subW, subH);
    column(subParts(t), subIn, ox + bd + sp(7), sy + (subH - column(subParts(t), subIn)) / 2);
  });
  if (rowH) y += rowH + sp(4);
  if (platH) {
    shape("platform", a.x, y, a.w, platH);
    d.platform.forEach((t, i) =>
      column(
        platParts(t),
        pw - 2 * sp(2),
        a.x + bd + sp(3) + i * (pw + sp(4)) + sp(2),
        y + bd + sp(3) + sp(1),
      ),
    );
    y += platH + sp(4);
  }
  if (legRows) {
    // Each type drawn here, in the order drawn, a swatch before its name.
    for (const it of legend) {
      const ly = y + sp(4) + it.row * (legRow + sp(3));
      shape(it.type, a.x + it.x, ly + (legRow - sp(8)) / 2, sp(14), sp(8), (10 / 144) * k);
      box(s, c, words[it.type], a.x + it.x + sp(17), ly, it.tw, legRow, legO);
    }
    y += legH + sp(4);
  }
  if (d.caption) box(s, c, d.caption, a.x, y + sp(2), a.w, capH - sp(2), capO);
  return total;
}

/** Two stances and their resolution as the web's `Positions`: in a 72 rem column, each stance on
 *  a card under its holder's name, its quote under it, then the middle word and the resolution as
 *  a display line, centred. Draws where `s` is given; returns the height at scale k. */
function positions(
  s: PSlide | undefined,
  c: Palette,
  b: Extract<ContentBlock, { type: "positions" }>,
  a: { x: number; y: number; w: number },
  k: number,
): number {
  const rem = REM * k;
  const w = Math.min(a.w, 72 * rem);
  const x0 = a.x + (a.w - w) / 2;
  const [gap, pad] = [2 * rem, 2 * rem];
  const cw = (w - gap) / 2;
  const inner = cw - 2 * pad;
  const nameO: BoxOpts = { size: PT.sm * k, mono: true, color: c.muted, tracking: 0.06, line: 1.4 };
  const stanceO: BoxOpts = { size: 32 * k, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const quoteO: BoxOpts = { size: PT.h4 * k, color: c.muted, line: 1.375 };
  const parts = (sd: typeof b.left): [Para, BoxOpts, number][] => [
    [{ runs: [caps(sd.name)] }, nameO, 0],
    [{ runs: [{ text: sd.stance }] }, stanceO, rem],
    [{ runs: md(`“${sd.quote}”`, c) }, quoteO, 1.5 * rem],
  ];
  // A column of paragraphs in width pw, drawn at x, y where both are given; returns its height.
  const stack = (list: [Para, BoxOpts, number][], pw: number, x?: number, y = 0) =>
    list.reduce((h, [p, o, g]) => {
      const ph = need(p, c, pw, o);
      if (s && x !== undefined) box(s, c, p, x, y + h + g, pw, ph, o);
      return h + g + ph;
    }, 0);
  const ch = Math.max(...[b.left, b.right].map((sd) => stack(parts(sd), inner))) + 2 * pad;
  const resO: BoxOpts = {
    size: 32 * k,
    mono: true,
    bold: true,
    color: c.ink,
    line: LEADING.display,
    tracking: -0.04,
    align: "center",
  };
  const res: [Para, BoxOpts, number][] = [
    ...(b.middle
      ? [
          [{ runs: [caps(b.middle)] }, { ...nameO, align: "center" as const }, 0] as [
            Para,
            BoxOpts,
            number,
          ],
        ]
      : []),
    [{ runs: md(b.resolution, c), balance: true }, resO, b.middle ? rem : 0],
  ];
  const resH = stack(res, w);
  if (s) {
    [b.left, b.right].forEach((sd, i) => {
      const x = x0 + i * (cw + gap);
      card(s, x, a.y, cw, ch, c.card, c.border);
      stack(parts(sd), inner, x + pad, a.y + pad);
    });
    stack(res, w, x0, a.y + ch + 3 * rem);
  }
  return ch + 3 * rem + resH;
}

/** Steps on one line as the web's `FlowSteps` draws them: a tile each, numbered unless a label
 *  counts already, a grey line with an arrowhead from tile to tile, the title, subtitle, text and
 *  badge centred under the tile, and a `loop` back above, labelled when non-empty. Draws where `s`
 *  is given; returns the height either way. */
function flowSteps(
  s: PSlide | undefined,
  c: Palette,
  steps: FlowStep[],
  a: { x: number; y: number; w: number },
  o: { highlight?: number; loop?: string; dense?: boolean; k: number },
): number {
  const { k } = o;
  const n = steps.length;
  const sp = (v: number) => v * 0.25 * REM * k;
  const narrow = n >= 6;
  const colW = a.w / n;
  const inner = colW - 2 * sp(narrow ? 2 : 5);
  const tile = o.dense ? sp(10) : sp(24);
  const inTile = steps.every((st) => (st.label?.length ?? 0) <= 4);
  const counted = !steps.some((st) => /\d/.test(st.label ?? ""));
  let count = 0;
  const numbers = steps.map((st) => (st.numbered === false ? undefined : ++count));
  const loopH = o.loop === undefined ? 0 : sp(o.loop ? 24 : 16) + sp(2);
  const centre = (i: number) => a.x + (i + 0.5) * colW;
  const tileY = a.y + loopH;
  const titleO: BoxOpts = {
    size: (o.dense || narrow ? PT.h4 : PT.h3) * k,
    ...TITLE,
    color: c.ink,
    line: 1.25,
    tracking: -0.015,
    align: "center",
    balance: true,
  };
  const textO: BoxOpts = { size: PT.base * k, color: c.ink, line: 1.375, align: "center" };
  let h = 0;
  steps.forEach((st, i) => {
    const on = o.highlight === i;
    const tone = st.dim ? c.muted : st.tone ? c[st.tone] : c.ink;
    const accent = st.dim ? c.muted : c.teal;
    let y = tileY + tile;
    const parts: [Para, BoxOpts, number][] = [];
    if (st.label && !inTile)
      parts.push([
        { runs: [caps(st.label, { color: accent })] },
        { ...textO, size: PT.h4 * k, mono: true, tracking: 0.06, line: 1.4 },
        sp(5),
      ]);
    parts.push([
      { runs: md(st.title, c, { color: on ? c.teal : tone }) },
      titleO,
      sp(o.dense ? 2 : st.label && !inTile ? 3 : 7),
    ]);
    if (st.subtitle)
      parts.push([
        { runs: md(st.subtitle, c, { color: accent }), bold: true, balance: true },
        textO,
        sp(2),
      ]);
    if (st.text)
      parts.push([{ runs: md(st.text, c, { color: st.dim ? c.muted : c.ink }) }, textO, sp(3)]);
    if (st.badge)
      parts.push([{ runs: md(st.badge, c, { color: accent }), bold: true }, textO, sp(3)]);
    for (const [p, po, gap] of parts) {
      // A word wider than the text column, such as a path in a chip, stands past it into the
      // step's padding, as the web's chip does.
      const pw = Math.min(colW, Math.max(inner, longest(spansOf(p, po, 1)) / 72 + 0.02));
      const ph = need(p, c, pw, po);
      y += gap;
      if (s) box(s, c, p, centre(i) - pw / 2, y, pw, ph, po);
      y += ph;
    }
    h = Math.max(h, y - a.y);
    if (!s) return;
    const tx = centre(i) - tile / 2;
    s.addShape("roundRect", {
      x: tx,
      y: tileY,
      w: tile,
      h: tile,
      rectRadius: 10 / 144,
      fill: { color: on ? c.teal : c.bg },
      line: on ? { type: "none" } : { color: c.muted, width: 2 * k },
    });
    const mark = st.label && inTile ? st.label : counted ? numbers[i] : undefined;
    if (mark !== undefined)
      box(s, c, { runs: [{ text: String(mark) }] }, tx, tileY, tile, tile, {
        size: (o.dense ? 17.33 : PT.h3) * k,
        mono: true,
        bold: true,
        color: on ? c.card : tone,
        align: "center",
        valign: "middle",
        line: 1,
        floor: 0.5,
      });
    if (i < n - 1) {
      // The line from this tile to the arrowhead, which stops `--slide-arrow-inset` short of the
      // next tile's centre.
      const head = { w: sp(6), h: sp(7) };
      const end = centre(i + 1) - 4 * REM * k;
      const mid = tileY + tile / 2;
      s.addShape("line", {
        x: centre(i) + tile / 2,
        y: mid,
        w: Math.max(0.01, end - head.w - centre(i) - tile / 2),
        h: 0,
        line: { color: c.muted, width: 2 * k },
      });
      s.addShape("triangle", {
        x: end - head.w / 2 - head.h / 2,
        y: mid - head.w / 2,
        w: head.h,
        h: head.w,
        rotate: 90,
        fill: { color: c.muted },
        line: { type: "none" },
      });
    }
  });
  if (s && o.loop !== undefined) {
    // Out of the last tile, back along the top and down into the first, with its arrowhead.
    const top = a.y + (o.loop ? sp(6) : sp(2));
    const [x0, x1] = [centre(0), centre(n - 1)];
    const line = { color: c.muted, width: 2 * k };
    s.addShape("line", { x: x0, y: top, w: x1 - x0, h: 0, line });
    s.addShape("line", { x: x1, y: top, w: 0, h: tileY - sp(2) - top, line });
    s.addShape("line", { x: x0, y: top, w: 0, h: tileY - sp(6) - top, line });
    s.addShape("triangle", {
      x: x0 - sp(3.5),
      y: tileY - sp(6) - sp(2),
      w: sp(7),
      h: sp(6),
      rotate: 180,
      fill: { color: c.muted },
      line: { type: "none" },
    });
    if (o.loop) {
      const lw = textWidth(o.loop, PT.h4 * k, false, true) + sp(12);
      // At least a line high, so the fit keeps the label at its size.
      const lh = Math.max(sp(7), (PT.h4 * k * 1.4) / 72);
      box(
        s,
        c,
        { runs: [{ text: o.loop }], bold: true },
        (x0 + x1) / 2 - lw / 2,
        top - lh / 2,
        lw,
        lh,
        {
          size: PT.h4 * k,
          color: c.ink,
          align: "center",
          valign: "middle",
          fill: c.bg,
          line: 1.4,
        },
      );
    }
  }
  return h;
}

/** A flow block as `Flow` draws it: its steps, framed as `Framed` frames them where it names a
 *  frame: the teal dashed frame, its label over the steps, its notes beside them under a rule, its
 *  footer under a line. Draws where `s` is given; returns the height. */
function flowBlock(
  s: PSlide | undefined,
  c: Palette,
  b: Extract<ContentBlock, { type: "flow" }>,
  a: { x: number; y: number; w: number },
  k: number,
): number {
  const opts = { highlight: b.highlight, loop: b.loop, dense: b.dense, k };
  if (!b.frame) return flowSteps(s, c, b.steps, a, opts);
  const sp = (v: number) => v * 0.25 * REM * k;
  const { label, notes = [], footer } = b.frame;
  const pad = sp(6);
  const labelH = label ? (13.33 * 1.4 * k) / 72 : 0;
  const noteO: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const noteParas: Para[] = notes.map((t) => ({
    runs: md(t, c),
    bullet: true,
    after: sp(1.5) * 72,
  }));
  const notesW = notes.length
    ? Math.max(...notes.map((t) => textWidth(t, 16 * k))) + BULLET_INDENT / 72 + 0.05
    : 0;
  const stepsW = a.w - 2 * pad - (notes.length ? notesW + 2 * sp(6) : 0);
  const stepsH = flowSteps(undefined, c, b.steps, { x: 0, y: 0, w: stepsW }, opts);
  const notesH = notes.length ? need(noteParas, c, notesW, noteO) : 0;
  const rowH = Math.max(stepsH, notesH, notes.length ? sp(16) : 0);
  const footO: BoxOpts = { size: 16 * k, color: c.muted, line: 1.45 };
  const footH = footer ? need(footer, c, a.w - 2 * pad, footO) : 0;
  const h = pad + (label ? labelH + sp(4) : 0) + rowH + (footer ? sp(4) + sp(3) + footH : 0) + pad;
  if (!s) return h;
  const tint = mix(c.teal, c.bg, 0.25);
  s.addShape("round2DiagRect", {
    x: a.x,
    y: a.y,
    w: a.w,
    h,
    rectRadius: Math.min(CORNER, h / 2),
    fill: { color: label ? mix(c.teal, c.bg, 0.07) : c.card },
    line: { color: label ? c.teal : tint, width: 1, dashType: "dash" },
  });
  let y = a.y + pad;
  if (label) {
    const m = 10 / 144;
    rect(s, a.x + pad, y + (labelH - m) / 2, m, m, c.teal);
    box(s, c, { runs: [caps(label)] }, a.x + pad + m + sp(2), y, a.w - 2 * pad, labelH, {
      size: 13.33 * k,
      mono: true,
      color: c.teal,
      tracking: 0.06,
      line: 1.4,
      valign: "middle",
    });
    y += labelH + sp(4);
  }
  flowSteps(s, c, b.steps, { x: a.x + pad, y: y + (rowH - stepsH) / 2, w: stepsW }, opts);
  if (notes.length) {
    const rx = a.x + pad + stepsW + sp(6);
    s.addShape("line", {
      x: rx,
      y: y + (rowH - sp(16)) / 2,
      w: 0,
      h: sp(16),
      line: { color: tint, width: 0.75 },
    });
    box(s, c, noteParas, rx + sp(6), y + (rowH - notesH) / 2, notesW, notesH, noteO);
  }
  y += rowH;
  if (footer) {
    y += sp(4);
    s.addShape("line", {
      x: a.x + pad,
      y,
      w: a.w - 2 * pad,
      h: 0,
      line: { color: tint, width: 0.75 },
    });
    y += sp(3);
    box(s, c, footer, a.x + pad, y, a.w - 2 * pad, footH, footO);
  }
  return h;
}

/** brand's callout padding at 1920, 1.75 rem. */
const CALLOUT_PAD = 1.75 * REM;

/** A cards block as `Cards` sets it: the grid, the padding and gaps of each size, a short teal
 *  rule over the title or a number tile, every card in a row as tall as the tallest. */
function cardsLayout(
  b: Extract<ContentBlock, { type: "cards" }>,
  c: Palette,
  w: number,
  k: number,
) {
  const n = b.items.length;
  const cols = b.columns ?? (n === 4 ? 2 : Math.min(n, 3));
  const wide = cols >= 4;
  const dense = !!b.dense;
  const sp = (v: number) => v * 0.25 * REM * k;
  const gap = sp(dense ? 5 : 6);
  const [padY, padX] = dense ? (wide ? [5, 5] : [6, 6]) : wide ? [6, 6] : [8, 9];
  const cw = (w - gap * (cols - 1)) / cols;
  const inner = cw - 2 * sp(padX);
  const inGap = sp(dense ? 1 : 5);
  const titleO: BoxOpts = {
    size: (dense ? (wide ? 17.33 : PT.h4) : wide ? PT.lead : PT.h3) * k,
    ...TITLE,
    color: c.ink,
    line: dense ? 1.4 : 1.25,
    tracking: -0.015,
    balance: !dense,
  };
  const textO: BoxOpts = {
    size: PT.base * k,
    color: dense ? c.muted : c.ink,
    line: dense ? 1.5 : 1.375,
  };
  const cells = b.items.map((it, i) => {
    const hi = b.highlight === i;
    const mark = b.numbered || it.icon ? sp(16) : dense ? 0 : sp(1.5);
    const title: Para | undefined = it.title
      ? { runs: md(it.title, c, { color: hi ? c.teal : c.ink }) }
      : undefined;
    const body: Para[] = [
      ...(it.text
        ? [{ runs: md(it.text, c), after: it.items?.length ? sp(dense ? 2 : 3) * 72 : 0 }]
        : []),
      ...(it.items ?? []).map((line) => ({
        runs: md(line, c),
        bullet: true,
        after: sp(dense ? 2 : 3) * 72,
      })),
    ];
    const th = title ? need(title, c, inner, titleO) : 0;
    const bh = body.length ? need(body, c, inner, textO) : 0;
    const parts = [mark, th, bh].filter(Boolean);
    return {
      it,
      hi,
      mark,
      title,
      body,
      th,
      bh,
      h: parts.reduce((x, y) => x + y, 0) + inGap * (parts.length - 1) + 2 * sp(padY),
    };
  });
  const rows = Math.ceil(n / cols);
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(...cells.slice(r * cols, r * cols + cols).map((x) => x.h)),
  );
  const h = rowH.reduce((x, y) => x + y, 0) + gap * (rows - 1);
  return {
    cols,
    cw,
    gap,
    padX: sp(padX),
    padY: sp(padY),
    inner,
    inGap,
    titleO,
    textO,
    cells,
    rowH,
    h,
  };
}

/** A numbers block as `Numbers` sets it: the grid `numbersGrid` picks, each figure at its one size
 *  with any leading words small, a rule over the label in one row, the label, its note. */
function numbersLayout(
  b: Extract<ContentBlock, { type: "numbers" }>,
  c: Palette,
  w: number,
  k: number,
) {
  const { cols, wrapped, size } = numbersGrid(b.items.map((i) => i.value));
  const gapX = (wrapped ? 4 : 3.5) * REM * k;
  const gapY = (wrapped ? (cols === 3 ? 7 : 4) : 3) * REM * k;
  const cw = (w - gapX * (cols - 1)) / cols;
  const pt = size * REM * 72 * k;
  const fig = pt / 72;
  // Above the label: the rule between two gaps in one row, a small gap where the figures wrap.
  const over = (wrapped ? 1 : 3) * REM * k + (wrapped ? 0 : 4 / 144);
  const figO: BoxOpts = {
    size: pt,
    mono: true,
    bold: true,
    color: c.teal,
    line: 1,
    tracking: -0.025,
    floor: 1,
  };
  const o = bodyO(c, k, { line: wrapped ? 1.25 : 1.375 });
  const cells = b.items.map((it) => {
    const lead = leadingWords(it.value);
    const value = minus(it.value.slice(lead.length));
    const figure: Para = {
      runs: [
        ...(lead
          ? [
              wrapped
                ? {
                    text: `${lead.trim()} `,
                    options: {
                      fontFace: SANS,
                      bold: false,
                      color: c.muted,
                      fontSize: Math.round(PT.lead * k * 2) / 2,
                    },
                  }
                : { text: `${lead.trim()} `, options: { fontSize: Math.round(pt * 0.55 * 2) / 2 } },
            ]
          : []),
        { text: value },
      ],
    };
    const paras: Para[] = [
      {
        runs: md(it.label, c),
        rel: PT.lead / PT.base,
        bold: wrapped,
        after: (wrapped ? 0.25 : 0.75) * REM * 72 * k,
      },
      ...(it.text ? [{ runs: md(it.text, c, { color: c.muted }), line: 1.375 }] : []),
    ];
    return { figure, paras, h: need(paras, c, cw, o) };
  });
  const rows = Math.ceil(cells.length / cols);
  const rowH = Array.from(
    { length: rows },
    (_, r) =>
      fig + over + Math.max(...cells.slice(r * cols, r * cols + cols).map((cell) => cell.h)),
  );
  const sourceGap = (wrapped ? 4 : 2.5) * REM * k;
  const sourceH = b.source ? sourceGap + need(b.source, c, w, { ...o, size: PT.sm * k }) : 0;
  let y = 0;
  const placed = cells.map((cell, i) => {
    const [r, col] = [Math.floor(i / cols), i % cols];
    if (col === 0 && r) y += rowH[r - 1] + gapY;
    return { ...cell, x: col * (cw + gapX), y };
  });
  const h = rowH.reduce((sum, rh) => sum + rh, 0) + gapY * (rows - 1) + sourceH;
  return { cells: placed, cw, fig, over, figO, o, rule: !wrapped, sourceGap, sourceH, h };
}

/** Stacks blocks in the area, shrinking them together until they fit, and returns where they end.
 *  Image blocks take the space the others leave. Blocks that leave space stand as the web's body
 *  does, two spacers sharing it 1 to 1.25, so a little above the middle; `tail` is the height of
 *  what follows them in that body, a footer. */
function blocks(
  s: PSlide,
  ctx: Ctx,
  list: ContentBlock[],
  a: Area,
  centered = false,
  tail = 0,
): number {
  const gap = 0.25;
  let k = 1;
  const fixed = (kk: number) =>
    list
      .filter((b) => !GROWS.has(b.type))
      .reduce((sum, b) => sum + blockHeight(b, ctx.c, a.w, kk), 0);
  const grows = list.filter((b) => GROWS.has(b.type)).length;
  const room = a.h - tail - gap * (list.length - 1) - grows * 1.5;
  while (k > 0.62 && fixed(k) > room) k -= 0.04;
  if (fixed(k) > room)
    ctx.warnings.push(
      `blocks ${list.map((b) => b.type).join(", ")}: ${(fixed(k) - room).toFixed(2)} in taller than the slide holds`,
    );
  const extra = grows ? (a.h - tail - gap * (list.length - 1) - fixed(k)) / grows : 0;
  const total = fixed(k) + grows * extra + gap * (list.length - 1);
  const free = Math.max(0, a.h - total - tail);
  let y = a.y + (centered ? free / 2 : free / 2.25);
  for (const b of list) {
    const h = GROWS.has(b.type)
      ? Math.max(1, extra)
      : Math.max(0, Math.min(blockHeight(b, ctx.c, a.w, k), a.y + a.h - tail - y));
    drawBlock(s, ctx, b, { x: a.x, y, w: a.w, h }, k, centered);
    y += h + gap;
  }
  return y - gap;
}

const BODY = (y: number): Area => ({ x: SIDE, y, w: CW, h: BOTTOM - y });
/** A trend or bar chart as the print route draws it (`ChartFrame`, `Axes` and recharts' margins in
 *  `ChartPlots`): the card, its padding, a 16 pt label's line and the gaps round it, the legend's
 *  row over the card, the annotation under it, and the plot's edges inside its container. */
const CHART = {
  w: 1365 / 144,
  h: 560 / 144,
  pad: 42.67 / 144,
  line: 46 / 144,
  underHead: 10.67 / 144,
  overFoot: 5.33 / 144,
  legend: (46 + 21.33) / 144,
  note: 32 / 144,
  noteLine: 49 / 144,
  left: (8 + 64) / 144,
  right: 30 / 144,
  top: 12 / 144,
  /** recharts' `tickMargin`, `TICK_GAP` in `ChartPlots`. */
  tick: 12 / 144,
  bottom: (8 + 56) / 144,
};
/** A bar's name sizes, `TICK_STEPS` in `ChartPlots`: the web's text-base, text-sm and text-xs. */
const TICK_STEPS = [PT.sm, 13.33, 12];

function row<T>(items: T[], a: Area, gap: number, draw: (it: T, r: Area, i: number) => void) {
  const w = (a.w - (items.length - 1) * gap) / items.length;
  items.forEach((it, i) => draw(it, { x: a.x + i * (w + gap), y: a.y, w, h: a.h }, i));
}

function portrait(
  s: PSlide,
  ctx: Ctx,
  src: string | undefined,
  name: string,
  x: number,
  y: number,
  d: number,
  tone: string,
) {
  // Round, as the web's hw-avatar.
  if (src) picture(s, ctx, src, x, y, d, d, { round: true, alt: name });
  else {
    s.addShape("ellipse", { x, y, w: d, h: d, fill: { color: tone }, line: { type: "none" } });
    box(
      s,
      ctx.c,
      {
        runs: [
          {
            text: name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2),
          },
        ],
      },
      x,
      y,
      d,
      d,
      {
        size: d * 24,
        mono: true,
        bold: true,
        color: hex("--color-white"),
        align: "center",
        valign: "middle",
      },
    );
  }
}

type Render = (s: PSlide, ctx: Ctx, slide: never, deck: Presentation) => void;

/** A talk's opening as TitleSlide draws it, measured off the print route: kicker, name and title on
 *  the left, centred above the bottom row and kept 2rem clear of it, where speakers and event stand
 *  beside the QR code and its link. */
function opening(s: PSlide, ctx: Ctx, d: TitleSlide, deck: Presentation) {
  const lang = d.lang ?? deckLang(deck);
  const { c } = ctx;
  const qr = 256 / 144;
  const rowH = d.qr ? 324 / 144 : 119 / 144;
  const rowY = BOTTOM - rowH;
  const headEnd = rowY - 43 / 144;
  // Each line of the heading with its options and the gap above it.
  const lines: [Para, BoxOpts, number][] = [
    ...(d.kicker
      ? [
          [
            { runs: [caps(d.kicker)] },
            { size: PT.base, mono: true, color: c.teal, tracking: 0.06 },
            0,
          ],
        ]
      : []),
    ...(d.name
      ? [
          [
            literal(d.name),
            { size: 32, mono: true, bold: true, color: c.teal, tracking: -0.025 },
            22 / 144,
          ],
        ]
      : []),
    [
      literal(d.title),
      {
        size: PT.s8,
        mono: true,
        bold: true,
        color: c.ink,
        line: LEADING.display,
        floor: 0.5,
        tracking: -0.04,
        balance: true,
      },
      d.name ? 34 / 144 : 22 / 144,
    ],
    ...(d.subtitle ? [[literal(d.subtitle), { size: PT.lead, color: c.muted }, 43 / 144]] : []),
  ] as [Para, BoxOpts, number][];
  // A heading taller than the space above the bottom row shrinks to fit it, as the fit guard does.
  const full = lines.map(([text, o]) => need(text, c, CW, o, 3));
  const total = lines.reduce((sum, [, , gap], i) => sum + gap + full[i], 0) - lines[0][2];
  const k = Math.min(1, (headEnd - TOP) / total);
  const heights = full.map((h) => h * k);
  let y = TOP + (headEnd - TOP - total * k) / 2;
  lines.forEach(([text, o, gap], i) => {
    if (i) y += gap * k;
    box(s, c, text, SIDE, y, CW, heights[i], o);
    y += heights[i];
  });
  const mid = rowY + rowH / 2;
  const label = d.qr && `↗ ${linkLabel(d.qr.href)}`;
  const colW = label ? Math.max(qr, textWidth(label, PT.base, true) + 0.1) : 0;
  const textW = CW - (colW && colW + 0.5);
  const speakers = d.speakers?.length ? literal(speakerLine(d, lang)) : undefined;
  const left = (speakers ? 53 / 144 : 0) + (d.event ? (speakers ? 17 / 144 : 0) + 49 / 144 : 0);
  let ly = mid - left / 2;
  if (speakers) {
    box(s, c, speakers, SIDE, ly, textW, 53 / 144, {
      size: PT.h3,
      mono: true,
      bold: true,
      color: c.ink,
    });
    ly += 70 / 144;
  }
  if (d.event)
    box(s, c, literal(d.event), SIDE, ly, textW, 49 / 144, { size: PT.base, color: c.muted });
  if (d.qr && label) {
    const colX = W - SIDE - colW;
    picture(s, ctx, d.qr.src, colX + (colW - qr) / 2, rowY, qr, qr, {
      alt: qrAlt(d.qr.href, lang),
      href: d.qr.href,
    });
    box(
      s,
      c,
      { runs: [{ text: label, options: { hyperlink: { url: d.qr.href } } }] },
      colX,
      rowY + qr + 12 / 144,
      colW,
      52 / 144,
      { size: PT.base, mono: true, color: c.teal, align: "center" },
    );
  }
}

/** A slide that draws nothing, to measure a layout drawn top-down before placing it. */
const DRY = new Proxy({}, { get: () => () => undefined }) as PSlide;

const RENDER: {
  [K in Slide["type"]]: (
    s: PSlide,
    ctx: Ctx,
    slide: Extract<Slide, { type: K }>,
    deck: Presentation,
  ) => void;
} = {
  title(s, ctx, d, deck) {
    if (isOpening(d)) return opening(s, ctx, d, deck);
    const { c } = ctx;
    const o: BoxOpts = {
      size: PT.display,
      mono: true,
      bold: true,
      color: c.ink,
      align: "center",
      line: LEADING.display,
      floor: 0.5,
      tracking: -0.03,
      balance: true,
    };
    const title = literal(d.title);
    const subtitle = d.subtitle ? literal(d.subtitle) : undefined;
    const th = need(title, c, CW - 1, o, 3);
    const sh = subtitle ? need(subtitle, c, CW - 2, { size: PT.lead, color: c.ink }, 1.2) : 0;
    const y = (H - th - sh - 0.5) / 2;
    box(s, c, title, SIDE + 0.5, y, CW - 1, th, o);
    if (subtitle)
      box(s, c, subtitle, SIDE + 1, y + th + 0.5, CW - 2, sh, {
        size: PT.lead,
        color: c.ink,
        align: "center",
      });
  },

  content(s, ctx, d, deck) {
    const redrawn = contentRedrawnAs(d);
    if (redrawn?.type === "comparison") return RENDER.comparison(s, ctx, redrawn, deck);
    if (redrawn) return RENDER.statement(s, ctx, redrawn, deck);
    const centered = d.layout === "centered";
    let y = header(s, ctx, d, centered);
    if (d.badge)
      chip(
        s,
        ctx.c,
        d.badge,
        W - SIDE - (d.badge.length * PT.label * 0.62) / 72 - 0.24,
        TOP - 0.32,
        PT.label,
        ctx.c.tealTint,
        ctx.c.teal,
      );
    if (d.stageMarker?.length) {
      let x = SIDE;
      if (d.stagePrefix) {
        box(s, ctx.c, d.stagePrefix, x, y - 0.15, 1.5, 0.25, {
          size: PT.label,
          mono: true,
          bold: true,
          color: ctx.c.muted,
          valign: "middle",
        });
        x += (d.stagePrefix.length * PT.label * 0.62) / 72 + 0.15;
      }
      for (const m of d.stageMarker)
        x += chip(s, ctx.c, m, x, y - 0.15, PT.label, ctx.c.tealTint, ctx.c.teal) + 0.1;
      y += 0.25;
    }
    const footH = footerHeight(ctx, d.footer);
    const end = blocks(s, ctx, d.content, BODY(y), centered, footH && footH + 0.1);
    footer(s, ctx, d.footer, footH, centered, end + 0.1);
  },

  regular(s, ctx, d, deck) {
    // As on the web, a regular slide is the content or agenda slide that replaces it
    // (`regularAsContent`); one with a profile keeps its sidebar.
    const replaced = regularAsContent(d);
    if (replaced?.type === "agenda") return RENDER.agenda(s, ctx, replaced, deck);
    if (replaced) return RENDER.content(s, ctx, replaced, deck);
    const { c } = ctx;
    const y = header(s, ctx, d);
    let a = BODY(y);
    if (d.profile) {
      const pw = 2.6;
      portrait(
        s,
        ctx,
        d.profile.imageSrc,
        d.profile.name,
        a.x + (pw - 1.4) / 2,
        a.y + 0.2,
        1.4,
        c.teal,
      );
      const who: Para[] = [
        { runs: [{ text: d.profile.name }], ...TITLE, after: 4 },
        { runs: [{ text: d.profile.title, options: { color: c.teal } }], rel: 0.9 },
        ...(d.profile.linkedIn ? [{ ...profileLink(d.profile.linkedIn, c), rel: 0.9 }] : []),
      ];
      const o: BoxOpts = { size: PT.base, color: c.ink, align: "center" };
      box(s, c, who, a.x, a.y + 1.75, pw, Math.max(0.9, need(who, c, pw, o)), o);
      a = { ...a, x: a.x + pw + 0.5, w: a.w - pw - 0.5 };
    }
    const secs = d.sections;
    const paras = (sec: (typeof secs)[number]): Para[] => [
      ...(sec.title
        ? [
            {
              runs: md(sec.title, c, { color: c.teal }),
              mono: true,
              bold: true,
              rel: PT.h4 / PT.base,
              after: 6,
            },
          ]
        : []),
      ...(sec.text ? [{ runs: md(sec.text, c), after: 6 }] : []),
      ...(sec.items ?? []).map((it) => ({ runs: md(it, c), bullet: true as const, after: 5 })),
      ...(sec.link
        ? [
            {
              runs: [
                {
                  text: sec.link.label,
                  options: { color: c.teal, hyperlink: { url: sec.link.url } },
                },
              ],
              after: 6,
            },
          ]
        : []),
    ];
    box(
      s,
      c,
      secs.flatMap((sec) =>
        paras(sec).map((p, j, arr) => (j === arr.length - 1 ? { ...p, after: 14 } : p)),
      ),
      a.x,
      a.y,
      a.w,
      a.h,
      { size: PT.base, color: c.ink },
    );
  },

  statement(s, ctx, d, deck) {
    const { c } = ctx;
    // The picture beside the statement, as the slide picks it: a quotation keeps its portrait and
    // drops a QR code, and a screenshot's or QR code's link is on the picture.
    const qr = !d.attribution && d.qr;
    const side = qr
      ? { src: qr.src, alt: qrAlt(qr.href, deckLang(deck)), href: qr.href }
      : d.imageSrc
        ? { src: d.imageSrc, alt: d.imageAlt, href: undefined, round: !!d.attribution }
        : d.linkedImage;
    const imgW = side ? CW * 0.38 : 0;
    const w = CW - imgW - (imgW ? 0.4 : 0);
    const lineRuns = (line: string): Run[] => {
      const out: Run[] = [];
      const marks = [d.highlighted, d.crossedOut].filter(Boolean) as string[];
      let rest = line;
      while (rest) {
        const hits = marks
          .map((m) => [rest.indexOf(m), m] as const)
          .filter(([i]) => i >= 0)
          .sort((p, q) => p[0] - q[0]);
        if (!hits.length) {
          out.push(...md(rest, c));
          break;
        }
        const [i, m] = hits[0];
        if (i) out.push(...md(rest.slice(0, i), c));
        out.push({
          text: m,
          options:
            m === d.highlighted ? { color: c.teal } : { strike: "sngStrike", color: c.muted },
        });
        rest = rest.slice(i + m.length);
      }
      return out;
    };
    if (!side && !d.attribution) {
      // As the web's centred statement: the kicker, each line a display heading balanced on its
      // own, 64 pt where nothing else stands, 48 pt otherwise, the subtitle in its narrower column,
      // the points and closing under it, all centred in the slide or above its footer.
      const footH = footerHeight(ctx, d.footer);
      const simple =
        !d.points?.length && !d.closing && !d.subtitle && !d.highlighted && !d.crossedOut;
      const w = d.footer ? CW : W - 2 * 4 * REM;
      const parts: [Para[], BoxOpts, number, number][] = [];
      if (d.kicker)
        parts.push([
          [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
          {
            size: PT.sm,
            mono: true,
            color: c.tealDark,
            tracking: 0.06,
            line: 1.4,
            align: "center",
          },
          w,
          0,
        ]);
      if (d.crossedOut && !d.lines.some((l) => l.includes(d.crossedOut!)))
        parts.push([
          [{ runs: [{ text: d.crossedOut, options: { strike: "sngStrike", color: c.muted } }] }],
          { size: PT.h3, mono: true, bold: true, color: c.muted, align: "center", line: 1.25 },
          w,
          parts.length ? 2 * REM : 0,
        ]);
      parts.push([
        d.lines.map((l) => ({ runs: lineRuns(l), balance: true })),
        {
          size: simple ? 64 : PT.s8,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
          align: "center",
        },
        w,
        parts.length ? 2 * REM : 0,
      ]);
      if (d.subtitle)
        parts.push([
          [{ runs: md(d.subtitle, c, { color: c.muted }), balance: true }],
          { size: PT.h3, color: c.muted, line: 1.375, align: "center" },
          Math.min(w, 64 * REM),
          2 * REM,
        ]);
      const support: Para[] = [
        ...(d.points ?? []).map((pt, i) => ({
          runs: [
            {
              text: `${String(i + 1).padStart(2, "0")}  `,
              options: { color: c.teal, bold: true, fontFace: MONO },
            },
            ...md(pt, c, { color: c.muted }),
          ],
          after: 1.25 * REM * 72,
        })),
        ...(d.closing
          ? [
              {
                runs: md(
                  d.closingStyle === "quote" ? `“${d.closing}”` : d.closing,
                  c,
                  d.closingStyle === "quote" ? { italic: true } : {},
                ),
                bold: d.closingStyle !== "quote",
                align: "center" as const,
                balance: true,
              },
            ]
          : []),
      ];
      if (support.length)
        parts.push([
          support,
          { size: PT.h3, color: c.ink, line: 1.375, align: d.points?.length ? "left" : "center" },
          Math.min(w, 56 * REM),
          2.5 * REM,
        ]);
      const heights = parts.map(([p, o, pw]) => need(p, c, pw, o));
      const total = heights.reduce((sum, h, i) => sum + h + parts[i][3], 0);
      const [top, bottom] = d.footer ? [TOP, BOTTOM - footH - 0.1] : [0, BOTTOM];
      let y = top + Math.max(0, (bottom - top - total) / 2);
      parts.forEach(([p, o, pw, gap], i) => {
        y += gap;
        box(s, c, p, (W - pw) / 2, y, pw, heights[i], o);
        y += heights[i];
      });
      footer(s, ctx, d.footer, footH);
      return;
    }
    if (qr) {
      // As QrStatement: the words at the left, the code on the right in a white card whose padding
      // is its quiet zone, its address under it, the row top-aligned and centred above the footer.
      const footH = footerHeight(ctx, d.footer);
      const q = (0.45 * 1.15 * 1080) / 144;
      const label = `↗ ${linkLabel(qr.href)}`;
      const colW = Math.max(q, textWidth(label, PT.base, true) + 0.1);
      const w = CW - colW - 5 * REM;
      const parts: [Para[], BoxOpts, number][] = [];
      const support: BoxOpts = { size: PT.h3, color: c.ink, line: 1.375 };
      if (d.kicker)
        parts.push([
          [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
          { size: PT.sm, mono: true, color: c.tealDark, tracking: 0.06, line: 1.4 },
          0,
        ]);
      parts.push([
        d.lines.map((l) => ({ runs: lineRuns(l), balance: true })),
        {
          size: PT.s8,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
        },
        parts.length ? 1.5 * REM : 0,
      ]);
      if (d.subtitle) parts.push([[{ runs: md(d.subtitle, c) }], support, 1.5 * REM]);
      if (d.points?.length)
        parts.push([
          d.points.map((pt, i) => ({
            runs: [
              {
                text: `${String(i + 1).padStart(2, "0")}  `,
                options: { color: c.teal, bold: true, fontFace: MONO },
              },
              ...md(pt, c, { color: c.muted }),
            ],
            after: 1.25 * REM * 72,
          })),
          { size: PT.base, color: c.muted, line: 1.375 },
          2 * REM,
        ]);
      if (d.closing) {
        const quoted = d.closingStyle === "quote";
        parts.push([
          [{ runs: md(quoted ? `“${d.closing}”` : d.closing, c), bold: true }],
          support,
          1.5 * REM,
        ]);
      }
      const heights = parts.map(([p, o]) => need(p, c, w, o));
      const textH = heights.reduce((sum, h, i) => sum + h + parts[i][2], 0);
      const labelH = need(label, c, colW, { size: PT.base, mono: true, color: c.teal });
      const figH = q + REM + labelH;
      const bottom = BOTTOM - footH - (d.footer ? 0.1 : 0);
      const top = TOP + Math.max(0, (bottom - TOP - Math.max(textH, figH)) / 2);
      let y = top;
      parts.forEach(([p, o, gap], i) => {
        y += gap;
        box(s, c, p, SIDE, y, w, heights[i], o);
        y += heights[i];
      });
      const x = W - SIDE - colW + (colW - q) / 2;
      const pad = 2.5 * REM;
      card(s, x, top, q, q, "FFFFFF", c.border, CORNER);
      picture(s, ctx, qr.src, x + pad, top + pad, q - 2 * pad, q - 2 * pad, {
        alt: qrAlt(qr.href, deckLang(deck)),
        href: qr.href,
      });
      box(
        s,
        c,
        { runs: [{ text: label, options: { hyperlink: { url: qr.href } } }] },
        W - SIDE - colW,
        top + q + REM,
        colW,
        labelH,
        { size: PT.base, mono: true, color: c.teal, align: "center" },
      );
      footer(s, ctx, d.footer, footH);
      return;
    }
    const paras: Para[] = d.lines.map((l) => ({
      runs: lineRuns(l),
      mono: true,
      bold: true,
      rel: PT.s8 / PT.base,
      after: 0,
    }));
    // The crossed-out claim stands above the statement, as the kicker of the web slide.
    const crossed = d.crossedOut && !d.lines.some((l) => l.includes(d.crossedOut!)) ? 1 : 0;
    if (crossed) {
      paras.unshift({
        runs: [{ text: d.crossedOut!, options: { strike: "sngStrike", color: c.muted } }],
        mono: true,
        bold: true,
        rel: PT.h3 / PT.base,
      });
    }
    paras.forEach((p, i) => (p.after = i >= crossed && i < crossed + d.lines.length - 1 ? 0 : 16));
    if (d.kicker)
      paras.unshift({
        runs: [caps(d.kicker, { color: c.teal })],
        mono: true,
        bold: true,
        rel: PT.label / PT.base,
        after: 16,
      });
    const support: Para[] = [];
    if (d.subtitle)
      support.push({
        runs: md(d.subtitle, c, { color: c.muted }),
        rel: PT.lead / PT.base,
        after: 16,
      });
    for (const [i, pt] of (d.points ?? []).entries()) {
      support.push({
        runs: [
          {
            text: `${String(i + 1).padStart(2, "0")}  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(pt, c),
        ],
        rel: PT.lead / PT.base,
        after: 6,
      });
    }
    const quoted = d.closingStyle === "quote";
    const closing: Para[] = d.closing
      ? [
          {
            runs: md(quoted ? `“${d.closing}”` : d.closing, c, quoted ? { italic: true } : {}),
            bold: !quoted,
            rel: PT.lead / PT.base,
            after: 4,
          },
        ]
      : [];
    if (d.attribution) {
      // The name follows the words said, the lines and a quoted closing; the slide's own words
      // come after it.
      const name = d.attribution.split(",")[0];
      const attribution: Para = {
        runs: [
          { text: name, options: { bold: true } },
          { text: d.attribution.slice(name.length), options: { color: c.muted } },
        ],
      };
      const own = [...support, ...(quoted ? [] : closing)];
      if (own.length) attribution.after = 16;
      paras.push(...(quoted ? closing : []), attribution, ...own);
    } else paras.push(...support, ...closing);
    const o: BoxOpts = {
      size: PT.base,
      color: c.ink,
      // A quotation and a closing with a QR code stand at the left edge, as on the slide.
      align: d.attribution || qr ? "left" : "center",
      valign: "middle",
      line: 1.2,
      floor: 0.5,
    };
    const footH = footerHeight(ctx, d.footer);
    box(s, c, paras, SIDE, TOP, w, BOTTOM - TOP - footH, o);
    footer(s, ctx, d.footer, footH);
    if (side) {
      // A quotation's portrait is round at the web's size, 384 px at 1920, centred in the side.
      const [x, h] = [SIDE + w + 0.4, BOTTOM - TOP - footH];
      const r = "round" in side && side.round ? 384 / 144 : 0;
      picture(
        s,
        ctx,
        side.src,
        r ? x + (imgW - r) / 2 : x,
        r ? TOP + (h - r) / 2 : TOP,
        r || imgW,
        r || h,
        { alt: side.alt, href: side.href, round: !!r },
      );
    }
  },

  evolution(s, ctx, d, deck) {
    return RENDER.process(s, ctx, evolutionAsProcess(d), deck);
  },

  grid(s, ctx, d, deck) {
    // Pillars and stats are a content slide's cards or numbers, as on the web (`gridAsContent`).
    if (d.variant !== "quotes") return RENDER.content(s, ctx, gridAsContent(d), deck);
    // Quotes as the web's QuoteCard: the brand quote, upright ink behind a purple rule with no
    // card, and under it the author in teal, a round portrait beside, in the web's columns.
    const { c } = ctx;
    const y = header(s, ctx, d);
    const cols = d.columns === 2 ? 2 : d.columns === 4 ? 4 : 3;
    const rows = Math.ceil(d.cards.length / cols);
    const a = BODY(y);
    const gap = 42.67 / 144;
    const w = Math.min(a.w, 1365 / 144);
    const cw = (w - (cols - 1) * gap) / cols;
    const rule = 2 / 144;
    const indent = rule + 26.67 / 144;
    const who = 74.67 / 144;
    const o: BoxOpts = { size: PT.lead, color: c.ink };
    const quote = (cd: (typeof d.cards)[number]) => ({ runs: md(cd.description ?? cd.title, c) });
    const qh = Math.max(...d.cards.map((cd) => need(quote(cd), c, cw - indent, o)));
    const ch = Math.min((a.h - (rows - 1) * gap) / rows, qh + 0.25 + who);
    const left = a.x + (a.w - w) / 2;
    const top = a.y + Math.max(0, (a.h - rows * ch - (rows - 1) * gap) / 2);
    d.cards.forEach((cd, i) => {
      const x = left + (i % cols) * (cw + gap);
      const yy = top + Math.floor(i / cols) * (ch + gap);
      const h = ch - 0.25 - who;
      rect(s, x, yy, rule, h, c.purple);
      box(s, c, quote(cd), x + indent, yy, cw - indent, h, o);
      let ax = x;
      if (cd.imageSrc) {
        portrait(s, ctx, cd.imageSrc, cd.author ?? "", x, yy + ch - who, who, c.teal);
        ax += who + 0.11;
      }
      if (cd.author)
        box(s, c, cd.author, ax, yy + ch - who, cw - (ax - x), who, {
          size: PT.base,
          bold: true,
          color: c.teal,
          valign: "middle",
        });
    });
  },

  comparison(s, ctx, d, deck) {
    if (d.variant === "guidance") return RENDER.guidance(s, ctx, { ...d, type: "guidance" }, deck);
    if (d.variant === "positions") {
      const { left, right, middle, resolution } = d;
      return RENDER.content(
        s,
        ctx,
        {
          type: "content",
          sectionLabel: d.sectionLabel,
          headline: d.headline ?? "",
          subtitle: d.subtitle,
          content: [{ type: "positions", left, right, middle, resolution }],
        },
        deck,
      );
    }
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = comparisonFoot(undefined, c, d, 0);
    const area = BODY(y);
    const sides = [d.left, d.right];
    const variant = d.variant ?? "vs";
    const o = { size: PT.base, color: c.ink };
    // The sides, punchline and footnotes stand as one group where the web's slide body puts it.
    const place = (ch: number) => area.y + Math.max(0, area.h - ch - footH) / 2.25;
    if (variant === "before-after") {
      const strike = d.strike !== false;
      const adds = !strike && d.adds;
      const ch = Math.min(area.h - footH, beforeAfterHeight(c, sides, strike, area.w, o, 1, adds));
      const top = place(ch);
      beforeAfter(s, ctx, { ...area, y: top, h: ch }, o, sides, strike, 1, adds);
      comparisonFoot(s, c, d, top + ch);
      return;
    }
    // The print route shows both sides of a `vs` slide active, as its last reveal step does: a vs
    // side lists its plus points, then the items starting with "-" as its minus points. A `split`
    // slide draws two plain cards of listed items, its labels read as markdown. Each card as the
    // web's: 2 rem padding, its title 1.5 rem over the items, the items 0.75 rem apart.
    const vs = variant === "vs";
    const pad = 2 * REM;
    const gap = 2 * REM;
    const cw = (area.w - gap) / 2;
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.35, tracking: -0.015 };
    const itemO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.4 };
    const items = (sd: ComparisonSide): Para[] => [
      ...(sd.highlight ? [highlightPara(sd.highlight, c.teal)] : []),
      ...(vs
        ? [
            ...sd.items.filter((it) => !it.startsWith("-")),
            ...sd.items.filter((it) => it.startsWith("-")),
          ].map((it) => {
            const minus = it.startsWith("-");
            return {
              runs: [
                {
                  text: minus ? "−  " : "+  ",
                  options: { color: minus ? c.red : c.green, bold: true },
                },
                ...md(it.replace(/^[-+]\s*/, ""), c),
              ],
              after: 0.75 * REM * 72,
            };
          })
        : sd.items.map((it) => ({
            runs: md(it, c),
            bullet: true as const,
            after: 0.75 * REM * 72,
          }))),
    ];
    const label = (sd: ComparisonSide): Para => ({
      runs: vs ? [{ text: sd.label }] : md(sd.label, c),
    });
    const logoH = 48 / 144 + REM;
    const parts = sides.map((sd) => {
      const th = need(label(sd), c, cw - 2 * pad, titleO);
      const ih = need(items(sd), c, cw - 2 * pad, itemO);
      return { th, ih, h: 2 * pad + (sd.logo ? logoH : 0) + th + 1.5 * REM + ih };
    });
    const ch = Math.min(area.h - footH, Math.max(...parts.map((p) => p.h)));
    const top = place(ch);
    sides.forEach((sd, i) => {
      const x = area.x + i * (cw + gap);
      card(s, x, top, cw, ch, vs ? c.tealTint : c.card, vs ? c.teal : c.border);
      let ty = top + pad;
      if (sd.logo) {
        picture(s, ctx, sd.logo, x + pad, ty, 1.4, 48 / 144, {
          align: "left",
          alt: plain(sd.label),
        });
        ty += logoH;
      }
      box(s, c, label(sd), x + pad, ty, cw - 2 * pad, parts[i].th, titleO);
      ty += parts[i].th + 1.5 * REM;
      box(s, c, items(sd), x + pad, ty, cw - 2 * pad, top + ch - pad - ty, itemO);
    });
    comparisonFoot(s, c, d, top + ch);
  },

  guidance(s, ctx, d) {
    const { c } = ctx;
    let y = header(s, ctx, d);
    const intro: Para[] = [
      ...(d.intro ? [{ runs: md(d.intro, c), after: 6 }] : []),
      ...bulletParas(d.points ?? [], c),
    ];
    // The intro, the points and the examples in the muted grey, as on the web.
    if (intro.length) {
      const ih = need(intro, c, CW, { size: PT.base, color: c.muted }, 1.6);
      box(s, c, intro, SIDE, y, CW, ih, { size: PT.base, color: c.muted });
      y += ih + 0.2;
    }
    const a = BODY(y);
    const lines = Math.max(
      ...d.examples.flatMap((ex) => [ex.bad, ex.good].map((t) => t.split("\n").length)),
    );
    const eh = Math.min(
      (a.h - (d.examples.length - 1) * 0.2) / d.examples.length,
      0.9 + (lines * PT.sm * 1.3) / 72,
    );
    d.examples.forEach((ex, i) => {
      const ey = a.y + i * (eh + 0.2);
      box(s, c, { runs: md(ex.title, c) }, SIDE, ey, CW, 0.3, {
        size: PT.base,
        mono: true,
        bold: true,
        color: c.ink,
      });
      row(
        [
          [ctx.words.bad, ex.bad, c.red, c.redTint],
          [ctx.words.good, ex.good, c.green, c.greenTint],
        ] as const,
        { x: SIDE, y: ey + 0.35, w: CW, h: eh - 0.35 },
        0.25,
        ([label, text, tone, tint], r) => {
          card(s, r.x, r.y, r.w, r.h, tint, tone);
          box(
            s,
            c,
            [
              {
                runs: [caps(label, { color: tone })],
                bold: true,
                rel: 0.75,
                after: 4,
              },
              ...text.split("\n").map((l) => ({ runs: [{ text: l || " " }] })),
            ],
            r.x + 0.2,
            r.y + 0.15,
            r.w - 0.4,
            r.h - 0.25,
            { size: PT.sm, mono: true, color: c.muted, line: 1.3 },
          );
        },
      );
    });
  },

  media(s, ctx, d, deck) {
    return RENDER.content(s, ctx, mediaAsContent(d), deck);
  },

  profiles(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = footerHeight(ctx, d.footer);
    const a = { ...BODY(y), h: BOTTOM - y - footH };
    const body = (p: (typeof d.profiles)[number]): Para[] => [
      ...bulletParas(p.bullets ?? [], c),
      ...(p.linkedIn ? [profileLink(p.linkedIn, c)] : []),
    ];
    const ch = Math.min(
      a.h,
      1.6 +
        Math.max(
          ...d.profiles.map((p) =>
            need(body(p), c, a.w / d.profiles.length - 0.6, {
              size: PT.base,
              color: c.ink,
            }),
          ),
        ),
    );
    row(d.profiles, { ...a, h: ch }, 0.3, (p, r, i) => {
      const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
      card(s, r.x, r.y, r.w, r.h, c.card, c.border);
      portrait(s, ctx, p.imageSrc, p.name, r.x + 0.25, r.y + 0.25, 0.9, tone);
      box(
        s,
        c,
        [
          { runs: [{ text: p.name }], ...TITLE, rel: PT.h4 / PT.base, after: 2 },
          { runs: [{ text: p.title, options: { color: tone } }], after: 2 },
          { runs: [{ text: p.company, options: { color: c.muted } }] },
        ],
        r.x + 1.35,
        r.y + 0.25,
        r.w - 1.6,
        1.1,
        { size: PT.base, color: c.ink, valign: "middle" },
      );
      box(s, c, body(p), r.x + 0.25, r.y + 1.45, r.w - 0.5, r.h - 1.6, {
        size: PT.base,
        color: c.ink,
      });
    });
    footer(s, ctx, d.footer, footH);
  },

  "phased-pills"(s, ctx, d) {
    const y = d.title ? header(s, ctx, { headline: d.title }) : TOP;
    pillPhases(s, ctx, d.phases, { x: SIDE + CW * 0.2, y, w: CW * 0.6, h: BOTTOM - y });
  },

  overview(s, ctx, d, deck) {
    return RENDER["phased-pills"](s, ctx, overviewAsPhases(d), deck);
  },

  process(s, ctx, d) {
    // `ProcessSlide` on a desktop and in print: the nodes as the flow block's steps, the loop back
    // above unless `loop: false`, the named phase lit, the footer as the caption under them.
    const { c } = ctx;
    const y = header(s, ctx, d);
    const steps: FlowStep[] = d.nodes.map((n) => ({
      title: n.title,
      text: n.description || undefined,
      label: n.label,
      subtitle: n.subtitle || undefined,
      badge: n.badge,
      dim: n.dimmed,
      numbered: n.numbered,
    }));
    const named = d.nodes.findIndex((n) => isHighlightPhase(n.title, d.highlightPhase));
    const o = {
      highlight: named < 0 ? undefined : named,
      loop: d.loop === false ? undefined : "",
      k: 1,
    };
    const a = BODY(y);
    const sh = flowSteps(undefined, c, steps, a, o);
    const capH = d.footer ? caption(undefined, c, d.footer, 0) + 0.37 : 0;
    const top = a.y + Math.max(0, a.h - sh - capH) / 2.25;
    flowSteps(s, c, steps, { ...a, y: top }, o);
    if (d.footer) caption(s, c, d.footer, top + sh + 0.37);
  },

  lanes(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const codeH = d.codeSnippet
      ? (d.codeSnippet.code.split("\n").length * PT.sm * 1.3) / 72 + 0.45
      : 0;
    const footH = footerHeight(ctx, d.footer);
    const lh =
      rowShare(ctx, "lanes", BOTTOM - y - codeH - footH - 0.3, d.lanes.length, 0.87, 0.27) - 0.12;
    let yy = y;
    if (d.codeSnippet) {
      drawBlock(
        s,
        ctx,
        { type: "code", ...d.codeSnippet },
        { x: SIDE, y: yy, w: CW, h: codeH - 0.1 },
        1,
        false,
      );
      yy += codeH + 0.1;
    }
    d.lanes.forEach((lane, i) => {
      const ly = yy + i * (lh + 0.12);
      const first = i === 0;
      card(s, SIDE, ly, CW, lh, first ? c.purpleTint : c.card, first ? c.purple : c.border, 0.08);
      box(s, c, { runs: [{ text: lane.label }] }, SIDE + 0.25, ly, 1.6, lh, {
        size: PT.sm,
        mono: true,
        bold: true,
        color: first ? c.purple : c.muted,
        valign: "middle",
      });
      let x = SIDE + 2;
      const size = rowSize(ctx, lane.stages, PT.sm, 0.3, SIDE + CW - 0.25 - x);
      lane.stages.forEach((st, j) => {
        const w = chip(s, c, st, x, ly + lh / 2 - (size * 1.9) / 144, size, c.card, c.ink, false);
        x += w;
        if (j < lane.stages.length - 1) {
          arrow(s, c, x + 0.05, ly + lh / 2, x + 0.25, ly + lh / 2, c.purple);
          x += 0.3;
        }
      });
    });
    footer(s, ctx, d.footer, footH);
  },

  chart(s, ctx, d) {
    const { c, pptx } = ctx;
    const y = header(s, ctx, d);
    // The web's `Annotation`, under the card or the drawing.
    const annotate = (x: number, top: number, w: number, h: number) =>
      d.annotation &&
      box(s, c, d.annotation, x, top, w, h, {
        size: PT.base,
        color: c.purple,
        align: "center",
      });
    if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) {
      const data = d.data;
      const trend = d.variant === "trend";
      const labels = data.map((p) => p.name);
      // A marked trend is measured up to the point and planned from it, both holding the point,
      // as on the web slide; `finishChart` dashes the planned half once the chart is written.
      const now = trend ? data.findIndex((p) => p.name === d.currentMarker) : -1;
      const halves = (name: string, pick: (p: (typeof data)[number]) => number | null) => [
        { name, labels, values: data.map((p, i) => (now < 0 || i <= now ? pick(p) : null)) },
        ...(now < 0
          ? []
          : [
              {
                name: `${name} (${ctx.words.planned})`,
                labels,
                values: data.map((p, i) => (i >= now ? pick(p) : null)),
              },
            ]),
      ];
      const two = data.some((p) => p.value2 !== undefined);
      const series = [
        ...halves(d.seriesLabel ?? d.yLabel ?? "", (p) => p.value),
        // A point without a second value is a gap, as on the web, never a zero.
        ...(two ? halves(d.series2Label ?? "", (p) => p.value2 ?? null) : []),
      ] as { name: string; labels: string[]; values: number[] }[];
      const hues = two ? [c.teal, c.purple] : [c.teal];
      // The card as `ChartFrame` draws it, the legend above it and the annotation below, centred
      // in the body as the web centres them; a long annotation may take two lines.
      const a = BODY(y);
      const legend = trend && !!(d.seriesLabel || d.series2Label);
      const above = legend ? CHART.legend : 0;
      const below = d.annotation ? CHART.note + CHART.noteLine : 0;
      const h = Math.min(CHART.h, a.h - above - below - (d.annotation ? CHART.noteLine : 0));
      const f = {
        x: (W - CHART.w) / 2,
        y: a.y + above + Math.max(0, (a.h - above - h - below) / 2),
        w: CHART.w,
        h,
      };
      card(s, f.x, f.y, f.w, f.h, c.card, c.border);
      annotate(f.x, f.y + f.h + CHART.note, f.w, 2 * CHART.noteLine);
      // `Axes`: the y label and the note over the plot, the x label under it.
      const inner = {
        x: f.x + CHART.pad,
        y: f.y + CHART.pad,
        w: f.w - 2 * CHART.pad,
        h: f.h - 2 * CHART.pad,
      };
      const labelO: BoxOpts = { size: PT.sm, color: c.muted };
      const label = (
        text: string | undefined,
        x: number,
        top: number,
        w: number,
        align: BoxOpts["align"],
        h = CHART.line,
      ) => text && box(s, c, text, x, top, w, h, { ...labelO, align });
      const note = trend ? d.futureNote : undefined;
      // The y label and the note in one row 2 rem apart, each shrinking by its share of the
      // overflow and wrapping, as the web's flex row sets them.
      const gapX = 2 * REM;
      const basis = [d.yLabel, note].map((t) => (t ? textWidth(t, PT.sm) + 0.02 : 0));
      const over = Math.max(0, basis[0] + basis[1] + gapX - inner.w);
      const sum = basis[0] + basis[1] || 1;
      const [yw, nw] = basis.map((b) => b - (over * b) / sum);
      const lineH = (n: number) => Math.max(1, n) * CHART.line;
      const lines = (t: string | undefined, w: number) =>
        t ? Math.round(need(t, c, w, labelO) / ((PT.sm * LEADING.body) / 72)) : 0;
      const headH = lineH(Math.max(lines(d.yLabel, yw), lines(note, nw)));
      const head = d.yLabel || note ? headH + CHART.underHead : 0;
      label(d.yLabel, inner.x, inner.y, yw, "left", headH);
      label(note, inner.x + inner.w - nw, inner.y, nw, "right", headH);
      const foot = d.xLabel ? CHART.line + CHART.overFoot : 0;
      label(d.xLabel, inner.x, inner.y + inner.h - CHART.line, inner.w, "center");
      // The chart reaches up over the card for its legend, which PowerPoint sets at its top.
      const plot = { x: inner.x, y: inner.y + head, w: inner.w, h: inner.h - head - foot };
      const top = legend ? f.y - CHART.legend : plot.y;
      const r = { ...plot, y: top, h: plot.y + plot.h - top };
      let scale = {};
      // A marked trend's names, set under its points once the chart is drawn.
      let names = () => {};
      if (trend) {
        // The plot where recharts draws it, less its x axis's padding, which a chart's categories
        // cannot take; the value axis on the web's ticks.
        const ticks = trendTicks(data);
        const lo = ticks[0];
        const hi = ticks[ticks.length - 1];
        // A point's name centres on it, so the axis pads each end by what the first and last
        // names overhang the margin beside them, as `TrendPlot` does.
        const edge = (i: number) => textWidth(labels[i], PT.sm, false, i === now) / 2;
        const padL = Math.max(24 / 144, edge(0) - CHART.left);
        const padR = Math.max(8 / 144, edge(labels.length - 1) - CHART.right);
        const g = {
          x: plot.x + CHART.left + padL,
          y: plot.y + CHART.top,
          w: plot.w - CHART.left - CHART.right - padL - padR,
          h: plot.h - CHART.top - CHART.bottom,
        };
        const xAt = (i: number) => (i / Math.max(1, data.length - 1)) * g.w;
        const yAt = (v: number) => ((hi - v) / (hi - lo)) * g.h;
        scale = {
          layout: { x: (g.x - r.x) / r.w, y: (g.y - r.y) / r.h, w: g.w / r.w, h: g.h / r.h },
          valAxisMinVal: lo,
          valAxisMaxVal: hi,
          valAxisMajorUnit: ticks[1] - lo,
        };
        // recharts fills a lone series' measured part down to 0; a chart's area series would
        // fall to zero after its last value, so the fill is a shape under the chart's plot.
        // A chart's category names take one style, so a marked trend sets each as text under its
        // point, the marked one in teal and bold as the web's tick, and a dashed guide from the dot
        // down to the axis.
        if (now >= 0)
          names = () => {
            const wide = g.w / Math.max(1, data.length - 1);
            // From under the dot, a marker of 11 pt, so the guide stays behind it as on the web.
            const dot = g.y + yAt(data[now].value) + 11 / 72 / 2;
            s.addShape("line", {
              x: g.x + xAt(now),
              y: dot,
              w: 0.001,
              h: Math.max(0, g.y + g.h - dot),
              line: { color: c.teal, width: 1.5, dashType: "dash" },
            });
            labels.forEach((name, i) => {
              const lw = Math.min(wide, 2 * edge(i) + 0.1);
              box(s, c, name, g.x + xAt(i) - lw / 2, g.y + g.h + CHART.tick, lw, CHART.line, {
                size: PT.sm,
                color: i === now ? c.teal : c.muted,
                bold: i === now,
                align: "center",
              });
            });
          };
        const filled = now < 0 ? data.length : now + 1;
        if (!two && filled > 1) {
          s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
            ...g,
            fill: { color: mix(c.teal, c.card, 0.07) },
            line: { type: "none" },
            points: [
              { x: 0, y: yAt(0), moveTo: true },
              ...data.slice(0, filled).map((p, i) => ({ x: xAt(i), y: yAt(p.value) })),
              { x: xAt(filled - 1), y: yAt(0) },
              { close: true },
            ],
          });
        }
      }
      // A bar's names wrap level at their band in the first of the web's steps where every word
      // fits it, else tilt at the last, as `tickLayout` sets them.
      const band = (plot.w / data.length) * 0.9;
      const step = TICK_STEPS.find(
        (pt) =>
          Math.max(...labels.flatMap((l) => l.split(" ").map((w) => textWidth(w, pt)))) <= band,
      );
      // The web's legend has an entry for a named series only.
      const perSeries = now < 0 ? 1 : 2;
      const unnamed = [d.seriesLabel, ...(two ? [d.series2Label] : [])].flatMap((name, i) =>
        name ? [] : [i * perSeries],
      );
      ctx.charts.set(ctx.charts.size + 1, trend ? { now, unnamed } : { level: step !== undefined });
      s.addChart(trend ? pptx.ChartType.line : pptx.ChartType.bar, series, {
        ...r,
        chartColors: now < 0 ? hues : hues.flatMap((hue) => [hue, hue]),
        lineSize: 2.5,
        lineDataSymbol: "none",
        barDir: "col",
        showLegend: legend,
        legendPos: "t",
        legendFontFace: SANS,
        legendFontSize: PT.sm,
        legendColor: c.ink,
        catAxisLabelFontFace: SANS,
        valAxisLabelFontFace: SANS,
        catAxisLabelColor: c.muted,
        valAxisLabelColor: c.muted,
        catAxisLabelFontSize: trend ? PT.sm : (step ?? TICK_STEPS[TICK_STEPS.length - 1]),
        valAxisLabelFontSize: PT.sm,
        valGridLine: { color: c.border, size: 0.5 },
        catAxisLineShow: true,
        valAxisLineShow: false,
        ...scale,
        // Bars carry their value on top instead of a value axis, as on the web slide.
        ...(!trend && {
          showValue: true,
          dataLabelPosition: "outEnd",
          dataLabelFontFace: MONO,
          dataLabelFontSize: PT.base,
          dataLabelFontBold: true,
          dataLabelColor: c.ink,
          valAxisHidden: true,
          valGridLine: { style: "none" },
        }),
      });
      names();
      return;
    }
    const a = { ...BODY(y), h: BOTTOM - y - (d.annotation ? 0.4 : 0) };
    if (d.variant === "cycle") {
      // The adoption curve as the web draws it: a bell curve, its area split into the segments'
      // shares, each segment's label and share under it.
      const segs = d.segments ?? [];
      const g = { x: a.x + 1, y: a.y + 0.3, w: a.w - 2, h: a.h - 1.1 };
      const bell = (t: number) => Math.exp(-0.5 * ((t - 0.5) / 0.18) ** 2);
      curve(s, ctx, g, bell, true);
      let acc = 0;
      segs.forEach((seg, i) => {
        const from = acc;
        acc += seg.percentage / 100;
        if (i < segs.length - 1) {
          const h = bell(acc) * g.h;
          s.addShape("line", {
            x: g.x + acc * g.w,
            y: g.y + g.h - h,
            w: 0.001,
            h,
            line: { color: c.bg, width: 1.5, dashType: "dash" },
          });
        }
        const cur = i === d.currentSegmentIndex;
        box(
          s,
          c,
          [
            { runs: [{ text: seg.label }], bold: cur },
            { runs: [{ text: `${seg.percentage}%`, options: { color: c.muted } }] },
          ],
          g.x + from * g.w,
          g.y + g.h + 0.1,
          (acc - from) * g.w,
          0.6,
          { size: PT.sm, color: cur ? c.teal : c.ink, align: "center" },
        );
      });
    } else {
      // The graph variant as the web draws it: a curve rising to the right, a marked point at 60 of
      // its 100 steps, the axis labels beside it.
      const g = { x: a.x + 1.5, y: a.y + 0.2, w: a.w - 3, h: a.h - 0.8 };
      curve(s, ctx, g, (t) => Math.exp(t * 3) / Math.exp(3), true);
      s.addShape("line", {
        x: g.x,
        y: g.y + g.h,
        w: g.w,
        h: 0.001,
        line: { color: c.muted, width: 1 },
      });
      s.addShape("line", { x: g.x, y: g.y, w: 0.001, h: g.h, line: { color: c.muted, width: 1 } });
      if (d.xLabel)
        box(s, c, d.xLabel, g.x, g.y + g.h + 0.1, g.w, 0.3, {
          size: PT.sm,
          color: c.muted,
          align: "center",
        });
      if (d.yLabel)
        box(s, c, d.yLabel, a.x, g.y + g.h / 2 - 0.3, 1.4, 0.6, {
          size: PT.sm,
          color: c.muted,
          align: "right",
          valign: "middle",
        });
      if (d.futureNote)
        box(s, c, d.futureNote, g.x + 0.1, g.y, g.w / 2, 0.3, { size: PT.sm, color: c.muted });
      if (d.currentMarker) {
        const t = 60 / 99;
        const mx = g.x + t * g.w;
        const my = g.y + g.h - (Math.exp(t * 3) / Math.exp(3)) * g.h;
        s.addShape("ellipse", {
          x: mx - 0.09,
          y: my - 0.09,
          w: 0.18,
          h: 0.18,
          fill: { color: c.teal },
          line: { color: c.card, width: 1.5 },
        });
        box(s, c, d.currentMarker, mx - 1.6, my - 0.4, 1.5, 0.3, {
          size: PT.sm,
          mono: true,
          bold: true,
          color: c.teal,
          align: "right",
        });
      }
    }
    annotate(SIDE, BOTTOM - 0.35, CW, 0.35);
  },

  question(s, ctx, d) {
    // As QuestionSlide in print: the headline as a display heading, under it the options as white
    // cards in a 56 rem column, each its letter, its text and its count, centred above the footer band.
    const { c } = ctx;
    const head: BoxOpts = {
      size: PT.s6,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
      align: "center",
    };
    const hp: Para = { ...literal(d.headline), balance: true };
    const hh = need(hp, c, CW, head);
    const w = Math.min(CW, 56 * REM);
    const oh = 2.5 * REM + (PT.h4 * 1.4) / 72;
    const total = hh + 3.5 * REM + d.options.length * (oh + REM) - REM;
    const top = Math.max(TOP, (BOTTOM - total) / 2);
    box(s, c, hp, SIDE, top, CW, hh, head);
    const x = (W - w) / 2;
    d.options.forEach((op, i) => {
      const oy = top + hh + 3.5 * REM + i * (oh + REM);
      card(s, x, oy, w, oh, c.card, c.border);
      const mid = { valign: "middle" } as const;
      box(s, c, literal(op.label), x + 1.5 * REM, oy, 2 * REM, oh, {
        size: 14,
        mono: true,
        bold: true,
        color: c.muted,
        ...mid,
      });
      box(s, c, op.text, x + 4.5 * REM, oy, w - 10 * REM, oh, {
        size: 17.5,
        color: c.ink,
        line: 1.4,
        ...mid,
      });
      box(s, c, literal("0"), x + w - 5.5 * REM, oy, 4 * REM, oh, {
        size: PT.h4,
        mono: true,
        bold: true,
        color: c.teal,
        align: "right",
        ...mid,
      });
    });
  },

  transition(s, ctx, d) {
    const { c } = ctx;
    const paras: Para[] = [];
    if (d.preText)
      paras.push({
        runs: [caps(d.preText, { color: c.teal })],
        mono: true,
        bold: true,
        rel: PT.lead / PT.display,
        after: 14,
      });
    paras.push({ ...literal(d.headline), mono: true, bold: true, after: 14 });
    if (d.subtitle) paras.push({ ...literal(d.subtitle), rel: PT.lead / PT.display });
    const speakerH = d.speakerName ? 1.1 : 0;
    const o: BoxOpts = {
      size: PT.display,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.1,
      floor: 0.5,
    };
    const th = Math.min(BOTTOM - TOP - speakerH, need(paras, c, CW - 1, o) + 0.2);
    const ty = TOP + (BOTTOM - TOP - th - speakerH) / 2;
    box(s, c, paras, SIDE + 0.5, ty, CW - 1, th, o);
    if (d.speakerName) {
      const sw = Math.max(2.6, (d.speakerName.length * PT.h3 * 0.62) / 72 + 0.8);
      card(s, (W - sw) / 2, ty + th + 0.2, sw, 0.85, c.card, c.border);
      box(
        s,
        c,
        [
          {
            runs: [{ text: d.speakerName, options: { color: c.teal } }],
            mono: true,
            bold: true,
            after: 2,
          },
          ...(d.speakerCompany ? [{ runs: [{ text: d.speakerCompany }], rel: 0.65 }] : []),
        ],
        (W - sw) / 2,
        ty + th + 0.2,
        sw,
        0.85,
        { size: PT.h3, color: c.ink, align: "center", valign: "middle" },
      );
    }
  },

  closing(s, ctx, d, deck) {
    const { c } = ctx;
    if (d.variant === "discussion") {
      // A titled slide, as on the web.
      const y = header(s, ctx, { headline: d.headline ?? d.line1 ?? ctx.words.discussion });
      // Each seed question on its own card, as the web's: 1.25 rem over and under it, 2 rem
      // beside, 1.5 rem between the cards, the question muted.
      const a = BODY(y);
      const [padY, padX, gap] = [1.25 * REM, 2 * REM, 1.5 * REM];
      const o: BoxOpts = { size: PT.h4, color: c.muted, line: 1.35 };
      const qs = d.seedQuestions ?? [];
      const hs = qs.map((q) => need(literal(q), c, a.w - 2 * padX, o));
      const total = hs.reduce((sum, h) => sum + h + 2 * padY, 0) + Math.max(0, qs.length - 1) * gap;
      let qy = a.y + Math.max(0, a.h - total) / 2.25;
      qs.forEach((q, i) => {
        card(s, a.x, qy, a.w, hs[i] + 2 * padY, c.card, c.border);
        box(s, c, literal(q), a.x + padX, qy + padY, a.w - 2 * padX, hs[i], o);
        qy += hs[i] + 2 * padY + gap;
      });
      return;
    }
    // As ContactVariant: the line, the mark row, the speakers and the closing lines 3.5 rem apart,
    // the column centred in the slide; drawn once on DRY to measure it.
    const gap = 3.5 * REM;
    const column = (s: PSlide, y: number) => {
      const head = d.line1;
      if (head) {
        const o: BoxOpts = {
          size: PT.display,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
          align: "center",
        };
        const hh = need(literal(head), c, CW, o);
        box(s, c, { ...literal(head), balance: true }, SIDE, y, CW, hh, o);
        y += hh + gap;
      }
      const speakers = d.speakers ?? [];
      if (centredMark(d)) {
        // The web's contact slide without portraits: the lockup in the centre column, each speaker's
        // name and contact lines under it.
        const lockH = 91.7 / 144;
        const [path, ratio] = brandCut(`lockup${ctx.dark ? "-night" : ""}`);
        const lockW = lockH * ratio;
        // As on the web: each partner's logo at the lockup's height, a × after it.
        const partners = d.partners ?? [];
        const times = 0.5;
        const pad = 0.35;
        const partnerW = partners.map((p) => (lockH * p.width) / p.height);
        let x = (W - lockW - partnerW.reduce((sum, w) => sum + w + 2 * pad + times, 0)) / 2;
        partners.forEach((p, i) => {
          picture(s, ctx, p.src, x, y, partnerW[i], lockH, { alt: p.alt ?? p.company });
          box(s, c, "×", x + partnerW[i] + pad, y, times, lockH, {
            size: PT.s6,
            color: c.muted,
            align: "center",
            valign: "middle",
          });
          x += partnerW[i] + 2 * pad + times;
        });
        s.addImage({
          path,
          x,
          y,
          w: lockW,
          h: lockH,
          altText: "hackers&wizards",
        });
        y += lockH + gap;
        const shown = companiesWithLogo(d);
        for (const sp of speakers) {
          const paras: Para[] = [
            { runs: [{ text: sp.name }], mono: true, bold: true, rel: PT.h4 / 17.5, after: 2 },
            ...(shown.has(sp.company.toLowerCase())
              ? []
              : [
                  {
                    runs: [caps(sp.company, { color: c.muted })],
                    rel: 0.8,
                    after: 2,
                  },
                ]),
            ...(sp.contact
              ? [
                  {
                    runs: [
                      {
                        text: sp.contact,
                        options: {
                          color: c.teal,
                          ...(sp.contact.includes("@")
                            ? { hyperlink: { url: `mailto:${sp.contact}` } }
                            : {}),
                        },
                      },
                    ],
                  },
                ]
              : []),
            ...(sp.linkedIn
              ? [
                  {
                    runs: [
                      {
                        text: linkLabel(sp.linkedIn),
                        options: { color: c.teal, hyperlink: { url: sp.linkedIn } },
                      },
                    ],
                  },
                ]
              : []),
          ];
          const po: BoxOpts = { size: 17.5, color: c.ink, line: 1.4, align: "center" };
          const ph = need(paras, c, CW, po);
          box(s, c, paras, SIDE, y, CW, ph, po);
          y += ph + 2 * REM;
        }
        y += gap - 2 * REM;
      } else if (speakers.length) {
        const sw = Math.min(3.2, CW / speakers.length);
        // The LinkedIn address under the contact, a line at 0.8 of the size.
        const linked = speakers.some((sp) => sp.linkedIn) ? 0.3 : 0;
        const sx = (W - sw * speakers.length) / 2;
        speakers.forEach((sp, i) => {
          const x = sx + i * sw;
          const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
          portrait(s, ctx, sp.imageSrc, sp.name, x + sw / 2 - 0.55, y, 1.1, tone);
          box(
            s,
            c,
            [
              { runs: [{ text: sp.name }], mono: true, bold: true, after: 2 },
              {
                runs: [caps(sp.company, { color: tone })],
                mono: true,
                bold: true,
                rel: 0.7,
                after: 6,
              },
              ...(sp.contact
                ? [
                    {
                      runs: [
                        {
                          text: sp.contact,
                          options: {
                            color: tone,
                            ...(sp.contact.includes("@")
                              ? { hyperlink: { url: `mailto:${sp.contact}` } }
                              : {}),
                          },
                        },
                      ],
                      rel: 0.8,
                    },
                  ]
                : []),
              ...(sp.linkedIn ? [{ ...profileLink(sp.linkedIn, c), rel: 0.8 }] : []),
            ],
            x,
            y + 1.2,
            sw,
            1 + linked,
            { size: PT.h4, color: c.ink, align: "center" },
          );
        });
        y += 2.35 + linked + gap;
      }
      const tail: Para[] = [];
      const claim = closingClaim(d, deckLang(deck));
      if (claim) {
        // The claim in muted ink, the word brand names for it in teal, as ClosingSlide draws it.
        const [before, word, after] = claimParts(claim);
        tail.push({
          runs: [
            { text: before, options: { color: c.muted } },
            { text: word, options: { color: c.teal } },
            { text: after, options: { color: c.muted } },
          ].filter((r) => r.text),
          mono: true,
          bold: true,
          after: gap * 72,
          align: "center",
          balance: true,
        });
      }
      if (d.closingQuote) {
        const mark = { color: mix(c.teal, c.bg, 0.7) };
        tail.push({
          runs: [
            { text: "“", options: mark },
            ...md(d.closingQuote, c, { color: c.muted }),
            { text: "”", options: mark },
          ],
          mono: true,
          bold: true,
          align: "center",
          balance: true,
        });
      }
      if (tail.length) {
        const o: BoxOpts = { size: PT.lead, color: c.muted, line: 1.25, tracking: -0.025 };
        const tw = Math.min(CW, 80 * REM);
        const th = need(tail, c, tw, o);
        box(s, c, tail, (W - tw) / 2, y, tw, th, o);
        return y + th;
      }
      return y - gap;
    };
    column(s, (H - column(DRY, 0)) / 2);
  },

  // As the web's RoadmapSlide: each column a card holding its items, or its phases as groups of
  // rows under a caps label.
  roadmap(s, ctx, d) {
    const { c } = ctx;
    // A row's own marker colour: `tone`, or the class its deprecated `dotColor` names.
    const marker = (it: Pick<RoadmapItem, "tone" | "dotColor">) => {
      const t = it.tone ?? it.dotColor?.slice(3);
      return t ? (c[THEME[t as MarkerTone]] as string) : undefined;
    };
    const y = header(s, ctx, d);
    row(d.columns, BODY(y), 0.35, (col, r) => {
      const tone = col.accent === "deepdive" ? c.purple : c.teal;
      const groups: {
        label?: string;
        hue: string;
        items: (RoadmapItem & { number?: number })[];
      }[] = col.phases
        ? col.phases.map((p) => ({
            label: p.label,
            hue: c[THEME[p.theme ?? "secondary"]] as string,
            items: p.items,
          }))
        : [{ hue: tone, items: col.items ?? [] }];
      card(s, r.x, r.y, r.w, r.h, mix(tone, c.bg, 0.05), c.border);
      rect(s, r.x + 0.15, r.y, r.w - 0.3, 0.05, tone);
      chip(s, c, col.label, r.x + 0.25, r.y + 0.25, PT.label * 0.85, mix(tone, c.bg, 0.15), tone);
      box(
        s,
        c,
        [
          { runs: md(col.title, c), mono: true, bold: true, rel: PT.h3 / PT.base, after: 4 },
          ...(col.subtitle ? [{ runs: md(col.subtitle, c, { color: c.muted }), after: 10 }] : []),
          ...groups.flatMap((g) => [
            ...(g.label
              ? [
                  {
                    runs: [caps(g.label, { color: g.hue })],
                    mono: true,
                    bold: true,
                    rel: 0.8,
                    after: 4,
                  },
                ]
              : []),
            ...g.items.flatMap((it) => [
              {
                runs: [
                  it.number === undefined
                    ? { text: "•  ", options: { color: marker(it) ?? g.hue } }
                    : {
                        text: `${it.number}  `,
                        options: { color: g.hue, bold: true, fontFace: MONO },
                      },
                  { text: it.title, options: { bold: true, fontFace: MONO } },
                ],
                after: 2,
              },
              ...(it.description
                ? [{ runs: md(it.description, c, { color: c.muted }), after: 8 }]
                : []),
            ]),
          ]),
        ],
        r.x + 0.25,
        r.y + 0.65,
        r.w - 0.5,
        r.h - 0.8,
        { size: PT.base, color: c.ink },
      );
    });
  },

  // Drawn as the night transition that replaces it, as on the web; `isDeepDive` gives it night.
  "deep-dive-divider"(s, ctx, d, deck) {
    RENDER.transition(s, ctx, deepDiveAsTransition(d), deck);
  },

  "dual-pill-overview"(s, ctx, d, deck) {
    RENDER.roadmap(s, ctx, dualPillAsRoadmap(d), deck);
  },

  gantt(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = footerHeight(ctx, d.footer);
    const msH = d.milestones?.length ? 0.5 : 0;
    const lw = 2;
    const gx = SIDE + lw;
    const gw = CW - lw;
    const colW = gw / d.columns.length;
    d.columns.forEach((col, i) =>
      box(s, c, { runs: [{ text: col }] }, gx + i * colW, y, colW, 0.25, {
        size: PT.label,
        mono: true,
        bold: true,
        color: c.muted,
        align: "center",
      }),
    );
    const rh = rowShare(ctx, "gantt", BOTTOM - y - 0.35 - footH - msH, d.rows.length, 0.75);
    d.rows.forEach((r, i) => {
      const ry = y + 0.35 + i * rh;
      box(
        s,
        c,
        [
          { runs: [{ text: r.label }] },
          ...(r.sublabel
            ? [{ runs: [{ text: r.sublabel, options: { color: c.muted } }], rel: 0.8 }]
            : []),
        ],
        SIDE,
        ry,
        lw - 0.15,
        rh - 0.1,
        { size: PT.sm, color: c.ink, align: "right", valign: "middle" },
      );
      rect(s, gx, ry, gw, rh - 0.1, c.card, c.border);
      for (const bar of r.bars) {
        // One data hue, as on the web slide; continuous work at the ladder's 40 % with a 70 % edge.
        const tone = c.teal;
        const bx = gx + (bar.start - 1) * colW;
        rect(
          s,
          bx,
          ry,
          bar.span * colW,
          rh - 0.1,
          bar.continuous ? mix(tone, c.card, 0.4) : tone,
          bar.continuous ? mix(tone, c.card, 0.7) : undefined,
        );
        box(s, c, bar.label, bx + 0.05, ry - 0.2, bar.span * colW, 0.2, {
          size: PT.label * 0.9,
          bold: true,
          color: tone,
        });
      }
    });
    if (d.milestones?.length) {
      const my = y + 0.35 + d.rows.length * rh + 0.1;
      box(
        s,
        c,
        { runs: [caps(d.milestonesLabel ?? ctx.words.milestones)] },
        SIDE,
        my,
        lw - 0.15,
        0.3,
        {
          size: PT.label,
          mono: true,
          bold: true,
          color: c.muted,
          align: "right",
        },
      );
      // Milestones of one column stack under one rule, as on the web.
      for (const [column, ms] of Map.groupBy(d.milestones, (m) => m.column)) {
        const mx = gx + (column - 1) * colW;
        rect(s, mx, my + 0.02, colW * 0.9, 0.025, c.purple);
        ms.forEach((m, k) =>
          box(s, c, m.label, mx, my + 0.08 + k * 0.25, Math.min(colW * 1.5, W - SIDE - mx), 0.25, {
            size: PT.label,
            color: c.purple,
          }),
        );
      }
    }
    footer(s, ctx, d.footer, footH);
  },

  "team-topology"(s, ctx, d) {
    const y = header(s, ctx, d);
    const a = BODY(y);
    // The web's fit guard: the whole body shrinks until it fits.
    let k = 1;
    while (k > 0.6 && topology(undefined, ctx, d, a, k) > a.h) k -= 0.02;
    const h = topology(undefined, ctx, d, a, k);
    topology(s, ctx, d, { ...a, y: a.y + Math.max(0, a.h - h) / 2.25 }, k);
  },

  agenda(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const items = d.items.map((it) => (typeof it === "string" ? { title: it } : it));
    const timed = items.some((it) => it.when);
    // A title stands after the widest time, its line under it after the tab too: the stop is the
    // widest time's, or the widest number's where no item names a time.
    const lead = timed ? items.map((it) => it.when ?? "") : [`${items.length}.  `];
    const tabs = [Math.max(...lead.map((t) => chipAdvance(t, true))) * PT.h3 + (timed ? 0.3 : 0)];
    const paras: Para[] = items.flatMap((it, i) => [
      {
        runs: [
          {
            text: timed
              ? `${it.when !== items[i - 1]?.when ? (it.when ?? "") : ""}\t`
              : `${i + 1}.  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(it.title, c),
        ],
        after: it.text ? 2 : 10,
        tabs,
      },
      ...(it.text
        ? [
            {
              runs: [{ text: "\t" }, ...md(it.text, c, { color: c.muted })],
              rel: 0.75,
              after: 10,
              tabs,
            },
          ]
        : []),
    ]);
    const footH = footerHeight(ctx, d.footer);
    box(s, c, paras, SIDE, y + 0.2, CW * 0.8, BOTTOM - y - 0.2 - footH, {
      size: PT.h3,
      color: c.ink,
    });
    footer(s, ctx, d.footer, footH);
  },

  activity(s, ctx, d) {
    const { c } = ctx;
    const label =
      d.label ?? { exercise: "Hands-on", demo: "Live demo", debrief: "Debrief" }[d.kind];
    const y = header(s, ctx, { sectionLabel: label, headline: d.headline, subtitle: d.task });
    const frame = [d.duration, d.mode, d.outcome].filter((t): t is string => !!t);
    const fw = frame.length ? CW * 0.34 : 0;
    let top = y + 0.3;
    if (d.prompt) {
      const ph = need(d.prompt, c, CW - 0.6, { size: PT.lead, color: c.ink }) + 0.3;
      card(s, SIDE, top, CW, ph, c.tealTint, c.teal);
      box(s, c, d.prompt, SIDE + 0.3, top + 0.15, CW - 0.6, ph - 0.3, {
        size: PT.lead,
        color: c.ink,
      });
      top += ph + 0.3;
    }
    const paras: Para[] = d.items.map((it, i) => ({
      runs: [
        ...(d.kind === "demo"
          ? []
          : [{ text: `${i + 1}.  `, options: { color: c.teal, bold: true, fontFace: MONO } }]),
        ...md(it, c),
      ],
      bullet: d.kind === "demo",
      after: 10,
    }));
    box(s, c, paras, SIDE, top, CW - fw - (fw ? 0.5 : 0), BOTTOM - top, {
      size: PT.lead,
      color: c.ink,
    });
    if (!frame.length) return;
    const fx = SIDE + CW - fw;
    const fh = 0.5 + frame.length * 0.55;
    card(s, fx, top, fw, fh, c.card, c.border);
    box(
      s,
      c,
      frame.map((t, i) => ({
        runs: md(t, c, i === 0 && d.duration ? {} : { color: c.muted }),
        mono: i === 0 && !!d.duration,
        bold: i === 0 && !!d.duration,
        rel: i === 0 && d.duration ? 1.4 : 1,
        after: 8,
      })),
      fx + 0.3,
      top + 0.25,
      fw - 0.6,
      fh - 0.5,
      { size: PT.base, color: c.ink },
    );
  },

  wheel(s, ctx, d) {
    // As `WheelSlide`: a ring of segments at 40 % teal, a 1.5 degree gap each side, numbered from
    // the top clockwise, the centre on a soft disc; each segment's tile, title and text on the side
    // its centre lies on, both columns against the ring.
    const { c } = ctx;
    const y = header(s, ctx, d);
    const a = BODY(y);
    const n = d.segments.length;
    const dia = 24 * REM;
    const unit = dia / 200;
    const tile = 10 * 0.25 * REM;
    const colW = (a.w - dia - 2 * 2 * REM) / 2;
    const textW = colW - tile - 0.75 * REM;
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
    const textO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.375 };
    const centres = d.segments.map((_, k) => -90 + (360 * (k + 0.5)) / n);
    const cos = centres.map((deg) => Math.cos((deg * Math.PI) / 180));
    const right = cos.flatMap((v, k) => (v > 1e-6 ? [k] : []));
    const left = cos.flatMap((v, k) => (v < -1e-6 ? [k] : []));
    cos.forEach((v, k) => {
      if (Math.abs(v) <= 1e-6) (right.length <= left.length ? right : left).push(k);
    });
    const sin = (k: number) => Math.sin((centres[k] * Math.PI) / 180);
    for (const list of [left, right]) list.sort((p, q) => sin(p) - sin(q));
    const itemH = (k: number) =>
      Math.max(
        tile,
        need(d.segments[k].title, c, textW, titleO) +
          0.25 * REM +
          need(d.segments[k].text, c, textW, textO),
      );
    const colH = (list: number[]) =>
      list.reduce((sum, k, i) => sum + itemH(k) + (i ? 1.75 * REM : 0), 0);
    const capO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.45 };
    const capH = d.caption ? REM + need(d.caption, c, a.w, capO) : 0;
    const h = Math.max(dia, colH(left), colH(right));
    const top = a.y + Math.max(0, a.h - h - capH) / 2.25;
    const cx = a.x + colW + 2 * REM + dia / 2;
    const cy = top + h / 2;
    d.segments.forEach((_, k) => {
      const from = -90 + (360 * k) / n + 1.5;
      const to = -90 + (360 * (k + 1)) / n - 1.5;
      s.addShape("blockArc", {
        x: cx - dia / 2,
        y: cy - dia / 2,
        w: dia,
        h: dia,
        angleRange: [(from + 360) % 360, (to + 360) % 360],
        arcThicknessRatio: 36 / 96,
        fill: { color: mix(c.teal, c.bg, 0.4) },
        line: { type: "none" },
      });
      const r = 78 * unit;
      const rad = (centres[k] * Math.PI) / 180;
      box(
        s,
        c,
        { runs: [{ text: String(k + 1) }] },
        cx + r * Math.cos(rad) - 0.2,
        cy + r * Math.sin(rad) - 0.15,
        0.4,
        0.3,
        {
          size: Math.round(14 * unit * 72 * 2) / 2,
          bold: true,
          color: c.ink,
          align: "center",
          valign: "middle",
          line: 1,
        },
      );
    });
    const hub = dia * 0.56;
    s.addShape("ellipse", {
      x: cx - hub / 2,
      y: cy - hub / 2,
      w: hub,
      h: hub,
      fill: { color: mix(c.ink, c.bg, 0.07) },
      line: { type: "none" },
    });
    box(
      s,
      c,
      { runs: md(d.center, c), bold: true },
      cx - hub / 2 + REM,
      cy - hub / 2 + REM,
      hub - 2 * REM,
      hub - 2 * REM,
      {
        size: PT.sm,
        color: c.ink,
        align: "center",
        valign: "middle",
        line: 1.25,
      },
    );
    const column = (list: number[], x: number, w = textW) => {
      let ly = cy - colH(list) / 2;
      for (const k of list) {
        const sg = d.segments[k];
        card(s, x, ly, tile, tile, c.teal, undefined, 10 / 144);
        box(s, c, { runs: [{ text: String(k + 1) }] }, x, ly, tile, tile, {
          size: 17.33,
          mono: true,
          bold: true,
          color: c.card,
          align: "center",
          valign: "middle",
          line: 1,
        });
        const th = need(sg.title, c, w, titleO);
        box(s, c, sg.title, x + tile + 0.75 * REM, ly, w, th, titleO);
        box(
          s,
          c,
          sg.text,
          x + tile + 0.75 * REM,
          ly + th + 0.25 * REM,
          w,
          need(sg.text, c, w, textO),
          textO,
        );
        ly += itemH(k) + 1.75 * REM;
      }
    };
    // The left column stands against the ring, as `justify-self-end` sets it.
    const leftW = Math.max(
      0,
      ...left.map(
        (k) =>
          tile +
          0.75 * REM +
          Math.max(
            textWidth(d.segments[k].title, PT.h4, TITLE.mono, TITLE.bold),
            textWidth(d.segments[k].text, PT.sm),
          ) +
          0.02,
      ),
    );
    column(left, a.x + colW - Math.min(colW, leftW), Math.min(textW, leftW - tile - 0.75 * REM));
    column(right, cx + dia / 2 + 2 * REM);
    if (d.caption) box(s, c, d.caption, a.x, top + h + REM, a.w, capH - REM, capO);
  },

  decision(s, ctx, d) {
    // As the web's decision grid: the need, a stub arrow, the question, a fork to the yes branch
    // above and the no branch below, both labelled in caps, a join and an arrow into the outcome;
    // the columns `--slide-decision-columns` sets, the branches as tall as the taller, 4 px teal
    // lines with 0.9 rem arrowheads.
    const { c } = ctx;
    const y = header(s, ctx, d);
    const a = BODY(y);
    const fixed = [15, 4, 14, 7.5, 0, 3.5, 17].map((r) => r * REM);
    fixed[4] = Math.max(0, a.w - fixed.reduce((sum, v) => sum + v, 0));
    const col = (i: number) => a.x + fixed.slice(0, i).reduce((sum, v) => sum + v, 0);
    const teamTone = (t: string) =>
      t === "enabling" ? c.purple : t === "platform" ? c.tealDark : c.factory;
    const teamLine = (t: string) =>
      t === "enabling" ? c.purple : t === "platform" ? c.teal : c.factory;
    const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
    const textO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.375 };
    const needIn = fixed[0] - 2 * 1.25 * REM;
    const needH = need(d.need, c, needIn, bold) + 2 * REM;
    const qIn = fixed[2] - 2 * 1.25 * REM;
    const qH = need({ runs: md(d.question, c), align: "center" }, c, qIn, bold) + 2 * 1.25 * REM;
    const oIn = fixed[6] - 2 * 1.25 * REM;
    const oH = need(d.outcome, c, oIn, bold) + 2 * REM;
    const bIn = fixed[4] - 2 * 1.5 * REM;
    const branch = (br: typeof d.yes): [Para, BoxOpts, number][] => [
      [{ runs: md(br.title, c, { color: teamTone(br.team) }) }, titleO, 0],
      [{ runs: md(br.text, c) }, textO, 0.5 * REM],
    ];
    const bh = (br: typeof d.yes) =>
      branch(br).reduce((sum, [p, o, gap]) => sum + gap + need(p, c, bIn, o), 0) + 2 * 1.25 * REM;
    const rowH = Math.max(bh(d.yes), bh(d.no));
    const gapY = 3.5 * REM;
    const gridH = 2 * rowH + gapY;
    const capO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.4, align: "center" };
    const capH = d.caption ? 1.5 * REM + need(d.caption, c, a.w, capO) : 0;
    const top = a.y + Math.max(0, a.h - gridH - capH) / 2.25;
    const mid = top + gridH / 2;
    const thick = 0.25 * REM;
    const line = { color: c.teal, width: 2 };
    const bar = (x: number, w: number, yy: number) => rect(s, x, yy - thick / 2, w, thick, c.teal);
    const head = (tip: number, yy: number) => {
      const [len, half] = [0.9 * REM, 0.6 * REM];
      s.addShape("triangle", {
        x: tip - len / 2 - half,
        y: yy - len / 2,
        w: 2 * half,
        h: len,
        rotate: 90,
        fill: { color: c.teal },
        line: { type: "none" },
      });
    };
    // The need and the question, centred on the grid's middle, the arrow between them.
    card(
      s,
      col(0),
      mid - needH / 2,
      fixed[0],
      needH,
      mix(c.teal, c.card, 0.07),
      mix(c.teal, c.card, 0.4),
    );
    box(s, c, d.need, col(0) + 1.25 * REM, mid - needH / 2 + REM, needIn, needH - 2 * REM, bold);
    bar(col(1), fixed[1], mid);
    head(col(2), mid);
    card(s, col(2), mid - qH / 2, fixed[2], qH, c.card, c.teal);
    box(
      s,
      c,
      { runs: md(d.question, c), align: "center" },
      col(2) + 1.25 * REM,
      mid - qH / 2 + 1.25 * REM,
      qIn,
      qH - 2.5 * REM,
      { ...bold, align: "center" },
    );
    bar(col(3), 2 * REM, mid);
    // The fork's vertical 2 rem into its column, the join's 2 rem before the outcome.
    const forkX = col(3) + 2 * REM;
    const joinX = col(6) - 2 * REM;
    [d.yes, d.no].forEach((br, r) => {
      const by = top + r * (rowH + gapY);
      const cy = by + rowH / 2;
      s.addShape("line", { x: forkX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
      s.addShape("line", { x: forkX, y: cy, w: col(4) - forkX, h: 0, line });
      head(col(4), cy);
      const lh = (PT.h4 * 1.4) / 72;
      box(
        s,
        c,
        { runs: [caps(br.label)] },
        forkX + 0.75 * REM,
        r ? cy + 3 * REM - lh : cy - 3 * REM,
        fixed[3] - 2.75 * REM,
        lh,
        {
          size: PT.h4,
          mono: true,
          color: c.muted,
          tracking: 0.06,
          line: 1.4,
        },
      );
      card(s, col(4), by, fixed[4], rowH, mix(teamLine(br.team), c.card, 0.15), teamLine(br.team));
      const parts = branch(br);
      const inner = parts.reduce((sum, [p, o, gap]) => sum + gap + need(p, c, bIn, o), 0);
      let ty = cy - inner / 2;
      for (const [p, o, gap] of parts) {
        const ph = need(p, c, bIn, o);
        ty += gap;
        box(s, c, p, col(4) + 1.5 * REM, ty, bIn, ph, o);
        ty += ph;
      }
      s.addShape("line", { x: col(5), y: cy, w: joinX - col(5), h: 0, line });
      s.addShape("line", { x: joinX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
    });
    bar(joinX, col(6) - joinX, mid);
    head(col(6), mid);
    card(s, col(6), mid - oH / 2, fixed[6], oH, mix(c.ink, c.bg, 0.07));
    box(s, c, d.outcome, col(6) + 1.25 * REM, mid - oH / 2 + REM, oIn, oH - 2 * REM, bold);
    if (d.caption) box(s, c, d.caption, a.x, top + gridH + 1.5 * REM, a.w, capH - 1.5 * REM, capO);
  },
};

/** A function over [0, 1] drawn as a polyline in the area, its values in [0, 1] from the bottom,
 *  with the area under it tinted. */
function curve(s: PSlide, ctx: Ctx, g: Area, f: (t: number) => number, fill: boolean) {
  const n = 100;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: (i / (n - 1)) * g.w,
    y: g.h - f(i / (n - 1)) * g.h,
  }));
  if (fill) {
    s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      fill: { color: mix(ctx.c.teal, ctx.c.bg, 0.18) },
      line: { type: "none" },
      points: [{ x: 0, y: g.h, moveTo: true }, ...pts, { x: g.w, y: g.h }, { close: true }],
    });
  }
  s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
    x: g.x,
    y: g.y,
    w: g.w,
    h: g.h,
    line: { color: ctx.c.teal, width: 2.25 },
    points: [{ ...pts[0], moveTo: true }, ...pts.slice(1)],
  });
}

/** Phases of pills, numbered where an item carries one, as phased-pills and dual-pill-overview set them. */
function pillPhases(
  s: PSlide,
  ctx: Ctx,
  phases: {
    label: string;
    theme?: SectionTheme;
    items: { number?: number; title: string; state?: string }[];
  }[],
  a: Area,
) {
  const { c } = ctx;
  const ph = Math.min(1, a.h / phases.length);
  phases.forEach((p, i) => {
    const py = a.y + i * ph;
    const tone = c[THEME[p.theme ?? "primary"]] as string;
    box(s, c, { runs: [{ text: "• " }, caps(p.label)] }, a.x, py, a.w, 0.25, {
      size: PT.label,
      mono: true,
      bold: true,
      color: tone,
    });
    let x = a.x;
    const title = (it: (typeof p.items)[number]) =>
      it.number === undefined ? it.title : `#${it.number} ${it.title}`;
    const size = rowSize(ctx, p.items.map(title), PT.sm * 0.9, 0.12, a.w);
    for (const it of p.items) {
      const on = it.state === "active" || it.state === "new";
      const w = chip(
        s,
        c,
        title(it),
        x,
        py + 0.32,
        size,
        on ? mix(tone, c.bg, 0.15) : c.card,
        c.ink,
        false,
      );
      x += w + 0.12;
    }
  });
}

// pptxgenjs sets a line's dash, its data markers and labels and where categories stand per chart.
// A trend's categories stand on the plot's edges, as recharts draws them. A marked trend's series
// alternate measured and planned: the planned ones get the dash and leave the legend, its first
// measured one the dot on the marked point. Its category names leave the axis for the text boxes
// the slide sets under the points.
function finishChart(xml: string, fix: ChartFix) {
  // pptxgenjs writes no angle of 0, and without one PowerPoint tilts long names.
  if ("level" in fix)
    return fix.level
      ? xml.replace(/(<c:catAx>.*?)<a:bodyPr\/>/s, '$1<a:bodyPr rot="0" vert="horz"/>')
      : xml;
  const { now, unnamed } = fix;
  const hideEntries = (out: string, hidden: number[]) =>
    out.replace(
      '<c:legendPos val="t"/>',
      `<c:legendPos val="t"/>${hidden
        .sort((a, b) => a - b)
        .map((i) => `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`)
        .join("")}`,
    );
  const edged = xml.replace('<c:crossBetween val="between"/>', '<c:crossBetween val="midCat"/>');
  if (now < 0) return hideEntries(edged, unnamed);
  const all = edged.match(/<c:ser>.*?<\/c:ser>/gs) ?? [];
  const planned = all.filter((_, i) => i % 2 === 1);
  const hue = /srgbClr val="(\w+)"/.exec(all[0] ?? "")?.[1];
  const dot = `<c:dPt><c:idx val="${now}"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="${hue}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${hex("--color-white")}"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt>`;
  return hideEntries(edged, [...planned.map((_, i) => 2 * i + 1), ...unnamed])
    .replace(/(<c:catAx>.*?<c:tickLblPos val=")\w+("\/>)/s, "$1none$2")
    .replace(/<c:ser>.*?<\/c:ser>/gs, (ser) =>
      planned.includes(ser)
        ? ser.replace('<a:prstDash val="solid"/>', '<a:prstDash val="dash"/>')
        : ser === all[0]
          ? ser.replace(
              /<c:dLbls>(.*?<\/c:dLbls>)\s*(<c:marker>.*?<\/c:marker>)/s,
              `$2${dot}<c:dLbls>$1`,
            )
          : ser,
    );
}

/** Builds the deck and writes it; returns the warnings for images or videos it could not place. */
export async function renderPptx(
  deck: Presentation,
  out: string,
  assets: string,
  { embed = false }: { embed?: boolean } = {},
): Promise<string[]> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.name;
  const lang = { de: "de-DE", en: "en-US" }[deckLang(deck)] ?? "en-US";
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const dark = deck.theme === "brand-dark";
  const deckCtx: Ctx = {
    pptx,
    c: palette(dark),
    assets,
    dark,
    warnings: [],
    charts: new Map(),
    words: WORDS[deckLang(deck)],
  };
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightCtx: Ctx = { ...deckCtx, c: palette(true), dark: true };
  // A slide's ground as the web's `--slide-ground`: its hue at 7 % on the background, which every
  // fill in the ground's colour takes too.
  const grounded = new Map<string, Ctx>();
  const ctxOf = (slide: Slide | undefined) => {
    const base = dark || !slide || !isDeepDive(slide) ? deckCtx : nightCtx;
    const ground = slide ? groundOf(slide as Grounded) : "intro";
    if (ground === "intro") return base;
    const key = `${base.dark}-${ground}`;
    if (!grounded.has(key)) {
      const c = base.c;
      const hue = { primary: c.teal, secondary: c.purple, accent: c.amber, success: c.green }[
        ground
      ];
      grounded.set(key, { ...base, c: { ...c, bg: mix(hue, c.bg, 0.07) } });
    }
    return grounded.get(key)!;
  };
  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const ctx = ctxOf(slide);
    frame(s, ctx, deck, i);
    const render = RENDER[slide.type] as Render | undefined;
    if (!render)
      throw new Error(
        `slide ${i + 1} is a ${JSON.stringify(slide.type)}, which slides-pptx cannot draw`,
      );
    render(s, ctx, slide as never, deck);
  });
  // Each font reference names its pitch and family class, so PowerPoint on a machine without the
  // brand fonts substitutes a sans for Inter and a monospace for JetBrains Mono instead of its
  // default face. pptxgenjs writes the typeface alone, or a sans pitch for every face in a table.
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const fallback: Record<string, string> = { [SANS]: "34", [MONO]: "49" };
  // pptxgenjs numbers charts across every deck of the process: within one, they run in drawing order.
  const chartFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/.+\.xml$/.test(f))) {
    const raw = await zip.file(name)!.async("string");
    const fix = deckCtx.charts.get(chartFiles.indexOf(name) + 1);
    const xml = fix ? finishChart(raw, fix) : raw;
    const n = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    const slideC = ctxOf(n ? deck.slides[Number(n[1]) - 1] : undefined).c;
    zip.file(
      name,
      xml
        .replace(
          /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
          (m, face: string) =>
            fallback[face] ? `typeface="${face}" pitchFamily="${fallback[face]}" charset="0"` : m,
        )
        // pptxgenjs marks every run en-US, so PowerPoint's spelling and hyphenation take a German
        // deck for English.
        .replaceAll('lang="en-US"', `lang="${lang}"`)
        .replaceAll(`lang="${CAPS}"`, `lang="${lang}" cap="all"`)
        // pptxgenjs writes one `adj` for any preset: the brand corner's two radii, 4 to 1.
        .replace(
          /prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val (\d+)"\/>/g,
          (_, v: string) =>
            `prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val ${v}"/><a:gd name="adj2" fmla="val ${Math.round(+v / 4)}"/>`,
        )
        // A bullet in the brand colour, as the web's square marker; pptxgenjs writes no bullet
        // colour. The brand faces have no square, so the bullet names Arial's, which every
        // PowerPoint has: at 130 % it is 0.29 em and stands 0.07 em above the web marker's
        // centre, a third of the text's size centred on its first line.
        .replace(/<a:buSzPct val="100000"\/><a:buChar char="&#x(\w+);"\/>/g, (_, code: string) => {
          const hue = HUE_OF_MARKER[code];
          const marked = hue ? slideC[hue] : slideC.teal;
          return `<a:buClr><a:srgbClr val="${marked}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${hue ? MARKER_SQUARE : code};"/>`;
        }),
    );
    // What a renderer would draw past a box, a card or the slide's edge.
    if (n)
      for (const found of checkSlide(await zip.file(name)!.async("string"), W, H))
        deckCtx.warnings.push(`slide ${n[1]}: ${found}`);
  }
  if (embed) await (await import("./pptx-fonts")).embedFonts(zip);
  writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return deckCtx.warnings;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  if (strict) args.splice(args.indexOf("--strict"), 1);
  const embed = args.includes("--embed-fonts");
  if (embed) args.splice(args.indexOf("--embed-fonts"), 1);
  const at = args.indexOf("--assets");
  const assets = resolve(at >= 0 ? (args.splice(at, 2)[1] ?? "") : "public");
  const [input, out] = args;
  if (!input || !out || !out.endsWith(".pptx")) {
    console.error(
      "Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]",
    );
    console.error(
      "The deck is a Presentation as JSON; --assets is the directory a slide's /image path resolves in, ./public by default; a path to an existing file is read as it stands. --strict exits 1 on any warning, text past its box included, for a gate; --embed-fonts puts the brand faces into the file, for PowerPoint on a machine without them (needs fonteditor-core).",
    );
    process.exit(1);
  }
  const deck = JSON.parse(readFileSync(input === "-" ? 0 : input, "utf8")) as Presentation;
  if (typeof deck?.name !== "string" || !Array.isArray(deck.slides)) {
    console.error(`${input} is not a presentation: it needs a name and a slides array.`);
    process.exit(1);
  }
  const warnings = await renderPptx(deck, resolve(out), assets, { embed });
  for (const w of warnings) console.error(`warning: ${w}`);
  console.log(`Wrote ${out}: ${deck.slides.length} slides`);
  if (strict && warnings.length) process.exit(1);
}
