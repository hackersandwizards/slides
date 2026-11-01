#!/usr/bin/env bun
// slides-pptx: renders a deck as a native PowerPoint file in the h&w design. Every text is a text
// box, a table a PowerPoint table, a trend or bar chart a PowerPoint chart, a diagram drawn shapes;
// only a deck's own images and the h&w logos are pictures. The design is h&w's alone: a deck on a
// client's template is that consumer's own exporter.
// Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>]
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { tokens } from "@hackersandwizards/brand/tokens";
import type {
  ContentBlock,
  MarkerTone,
  Presentation,
  RoadmapItem,
  Slide,
  SectionTheme,
} from "../types/slide";
import { cornerMark, resolveSlideLogo } from "../lib/logo";
import { isDeepDive, linkLabel, pageLabel, personAccent } from "../lib/slide-utils";

type Pptx = InstanceType<typeof PptxGenJS>;
type PSlide = ReturnType<Pptx["addSlide"]>;
type TextProps = PptxGenJS.TextPropsOptions;
type Run = { text: string; options?: TextProps };

// The print route's 1920 px stage on a 13.333 in slide: 144 px to the inch, so a CSS px is half a
// point. Every length and size below is measured off the print route at 1920 x 1080, whose root
// font size is 21.333 px.
const W = 13.333;
const H = 7.5;
const SIDE = 96 / 144;
const TOP = 117 / 144;
const BOTTOM = H - 123 / 144;
const CW = W - 2 * SIDE;
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
    neutral: dark ? mix(hex("--color-ampersand"), "FFFFFF", 0.6) : hex("--color-ampersand"),
    code: dark ? hex("--color-night-2") : "24292E",
    codeInk: "E1E4E8",
    codeGreen: "85E89D",
    tealTint: mix(teal, bg, 0.12),
    purpleTint: mix(purple, bg, 0.12),
    greenTint: mix(dark ? hex("--color-green") : hex("--color-green-dark"), bg, 0.1),
    redTint: mix(dark ? hex("--color-red-night") : hex("--color-red"), bg, 0.08),
    amberTint: mix(hex("--color-amber"), bg, 0.12),
  };
}
type Palette = ReturnType<typeof palette>;

/** The first family of a brand font stack, as PowerPoint names the installed font. */
function family(stack: string): string {
  return stack
    .split(",")[0]
    .replace(/"/g, "")
    .replace(/ Variable$/, "")
    .trim();
}
const MONO = family(tokens["--font-mono"]);
const SANS = family(tokens["--font-sans"]);

// ─── text ───────────────────────────────────────────────────────────────────

/** Inline markdown as the engine reads it (lib/markdown.tsx): links, bold, *accent* and code. */
function md(text: string, c: Palette, base: TextProps = {}): Run[] {
  const parts = String(text).split(
    /(\[[^\]]+\]\([^)\s]+\)|\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?!\s)[^*]+(?<!\s)\*|`[^`]+`)/g,
  );
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
    return [{ text: part.slice(1, -1), options: { ...base, fontFace: MONO, color: c.teal } }];
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
  indent?: number;
  after?: number;
  align?: "left" | "center" | "right";
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
}

const ADVANCE = { sans: 0.54, sansBold: 0.57, mono: 0.6 };

/** Lines a paragraph wraps into at `size` pt in `width` in, by greedy word wrap on an average
 *  advance: Inter's mean over German and English slide text is about 0.5 em, JetBrains Mono's 0.6,
 *  and a line breaks before it is full. */
function lineCount(
  text: string,
  size: number,
  width: number,
  mono: boolean,
  bold: boolean,
  tracking = 0,
) {
  const per = Math.max(
    1,
    (width * 72) /
      (size * ((mono ? ADVANCE.mono : bold ? ADVANCE.sansBold : ADVANCE.sans) + tracking)),
  );
  let lines = 0;
  for (const seg of text.split("\n")) {
    let n = 1;
    let cur = 0;
    for (const word of seg.split(/\s+/)) {
      const len = word.length;
      if (cur && cur + 1 + len > per) {
        n++;
        cur = 0;
      }
      if (len > per) {
        n += Math.ceil(len / per) - 1;
        cur = len % per;
      } else cur += (cur ? 1 : 0) + len;
    }
    lines += n;
  }
  return lines;
}

function parasHeight(paras: Para[], o: BoxOpts, w: number, scale: number) {
  const line = o.line ?? 1.25;
  return paras.reduce((sum, p) => {
    const size = o.size * (p.rel ?? 1) * scale;
    const indent = p.bullet ? 0.28 + (p.indent ?? 0) * 0.3 : 0;
    const text = p.runs.map((r) => r.text).join("");
    const n = lineCount(
      text,
      size,
      w - indent,
      p.mono ?? o.mono ?? false,
      p.bold ?? o.bold ?? false,
      o.tracking,
    );
    return sum + (n * size * line + (p.after ?? 0) * scale) / 72;
  }, 0);
}

/** The scale in [floor, 1] at which `paras` fit `h` inches. */
function fitScale(paras: Para[], o: BoxOpts, w: number, h: number) {
  let k = 1;
  const floor = o.floor ?? 0.6;
  // A word wider than the box breaks mid-word in PowerPoint, so the longest word must fit too.
  const widest = (kk: number) =>
    Math.max(
      ...paras.map((p) => {
        const mono = p.mono ?? o.mono ?? false;
        const adv = mono ? ADVANCE.mono : (p.bold ?? o.bold) ? ADVANCE.sansBold : ADVANCE.sans;
        const word = Math.max(
          0,
          ...p.runs.flatMap((r) => r.text.split(/[\s/-]+/).map((t) => t.length)),
        );
        return (word * o.size * (p.rel ?? 1) * kk * (adv + (o.tracking ?? 0))) / 72;
      }),
    );
  while (k > floor && (parasHeight(paras, o, w, k) > h || widest(k) > w)) k -= 0.03;
  return Math.max(k, floor);
}

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
  const k = fitScale(paras, o, w, h);
  const runs: Run[] = [];
  paras.forEach((p, i) => {
    const last = i === paras.length - 1;
    const size = Math.round(o.size * (p.rel ?? 1) * k * 2) / 2;
    p.runs.forEach((r, j) => {
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
          paraSpaceAfter: last ? 0 : (p.after ?? 0) * k,
          ...(p.bullet
            ? {
                bullet: p.bullet === "number" ? { type: "number" } : { code: "25AA", indent: 16 },
                indentLevel: p.indent ?? 0,
              }
            : {}),
          ...r.options,
          ...(j === p.runs.length - 1 && !last ? { breakLine: true } : {}),
        },
      });
    });
  });
  s.addText(runs, {
    x,
    y,
    w,
    h,
    margin: 0,
    valign: o.valign ?? "top",
    lineSpacingMultiple: o.line ?? 1.25,
    fit: "none",
    ...(o.fill ? { fill: { color: o.fill } } : {}),
  });
}

/** The height a box of `content` needs at full size, capped at `max`. */
function need(content: Para[] | Para | string, c: Palette, w: number, o: BoxOpts, max = H) {
  return Math.min(max, parasHeight(asParas(content, c), o, w, 1));
}

// ─── shapes ─────────────────────────────────────────────────────────────────

function card(
  s: PSlide,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  line?: string,
  r = 0.1,
) {
  s.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: Math.min(r, w / 2, h / 2),
    fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: "none" },
  });
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
) {
  const w = (plain(text).length * size * (mono ? 0.66 : 0.56)) / 72 + 0.3;
  card(s, x, y, w, (size * 1.9) / 72, fill, undefined, (size * 1.9) / 144);
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

// ─── images ─────────────────────────────────────────────────────────────────

/** Width and height of a PNG, JPEG, GIF or WebP from its header. */
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

const BRAND_LOGOS = /^\/hw-(lockup|wordmark)(-night)?\.svg$/;

function brandLogo(name: string): string {
  return createRequire(import.meta.url).resolve(`@hackersandwizards/brand/logos/${name}.png`);
}

interface Ctx {
  pptx: Pptx;
  c: Palette;
  assets: string;
  dark: boolean;
  warnings: string[];
}

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
    round?: boolean;
    align?: "center" | "left";
    /** Never drawn larger than the file at 144 px to the inch, as the slide never scales one up. */
    native?: boolean;
  } = {},
) {
  const logo = BRAND_LOGOS.exec(src);
  const path = logo
    ? brandLogo(`${logo[1]}${logo[2] ?? ""}`)
    : join(ctx.assets, src.replace(/^\//, ""));
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
    const d = Math.min(w, h);
    s.addImage({
      path,
      x: x + (w - d) / 2,
      y,
      w: d,
      h: d,
      rounding: true,
      sizing: { type: "cover", w: d, h: d },
      altText: o.alt,
    });
    return { x: x + (w - d) / 2, y, w: d, h: d };
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
    altText: o.alt,
    ...(o.href ? { hyperlink: { url: o.href } } : {}),
  });
  return { x: px, y: py, w: pw, h: ph };
}

// ─── slide frame ────────────────────────────────────────────────────────────

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
const centredMark = (d: Extract<Slide, { type: "closing" }>) =>
  d.variant !== "discussion" && !d.speakers?.some((sp) => sp.imageSrc);

/** The brand strip, the page counter, the corner mark and a client's logo on the left. */
function frame(s: PSlide, ctx: Ctx, deck: Presentation, index: number) {
  const { c } = ctx;
  s.background = { color: c.bg };
  // The strip's teal-to-purple gradient as twenty-four steps, since a pptxgenjs shape takes no
  // gradient fill.
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    rect(s, (W / steps) * i, 0, W / steps + 0.01, 16 / 144, mix(c.purple, c.teal, i / (steps - 1)));
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
    const name = `${mark}${ctx.dark ? "-night" : ""}`;
    const [ratio, h] = mark === "lockup" ? [2416 / 447, lockupH] : [2400 / 348, markH];
    x = right - h * ratio;
    s.addImage({
      path: brandLogo(name),
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
  if (first && !BRAND_LOGOS.test(first.src)) {
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

/** Kicker, principle pill, title and subtitle; returns where the body starts. */
function header(s: PSlide, ctx: Ctx, h: Head, centered = false): number {
  const { c } = ctx;
  let y = 58 / 144;
  const kicker = h.sectionLabel ?? h.preText;
  if (kicker || h.principle) {
    let x = SIDE;
    // Teal in every section, the website's mono caps (os br-slide-kicker-colour, br-label-style).
    if (kicker) {
      box(s, c, { runs: [{ text: kicker.toUpperCase() }] }, x, y, 6, 45 / 144, {
        size: PT.base,
        mono: true,
        color: c.teal,
        tracking: 0.06,
        valign: "middle",
      });
      x += (kicker.length * PT.base * (ADVANCE.mono + 0.06)) / 72 + 0.2;
    }
    if (h.principle) chip(s, c, h.principle, x, y + 0.02, PT.sm, c.tint, c.ink, false);
  }
  y = TOP;
  if (h.headline) {
    const o: BoxOpts = {
      size: PT.title,
      mono: true,
      bold: true,
      color: c.ink,
      line: 1.1,
      floor: 0.7,
      tracking: -0.035,
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

// ─── content blocks ─────────────────────────────────────────────────────────

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
    fill?: string;
    mark?: string;
  },
) {
  const { c } = ctx;
  card(s, a.x, a.y, a.w, a.h, o.fill ?? c.card, o.tone ?? c.border);
  const pad = 0.2;
  const paras: Para[] = [];
  if (o.title)
    paras.push({
      runs: md(o.title, c, { color: o.tone ?? c.ink }),
      mono: true,
      bold: true,
      rel: PT.h4 / PT.base,
      after: 6,
    });
  if (o.subtitle) paras.push({ runs: md(o.subtitle, c, { color: c.muted }), rel: 0.9, after: 6 });
  if (o.text) paras.push({ runs: md(o.text, c), after: 6 });
  for (const it of o.items ?? []) {
    paras.push(
      o.mark
        ? {
            runs: [{ text: `${o.mark}  `, options: { color: o.tone, bold: true } }, ...md(it, c)],
            after: 5,
          }
        : { runs: md(it, c), bullet: true, after: 5 },
    );
  }
  box(s, c, paras, a.x + pad, a.y + pad, a.w - 2 * pad, a.h - 2 * pad, bodyO(c, k));
}

const VARIANT_TONES: Record<string, [string, string]> = {
  "success-error": ["green", "red"],
  "error-success": ["red", "green"],
  error: ["red", "red"],
  "error-neutral": ["red", "muted"],
  success: ["green", "green"],
  neutral: ["muted", "muted"],
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

/** The height a block wants at scale k in width w. */
function blockHeight(b: ContentBlock, c: Palette, w: number, k: number): number {
  const o = bodyO(c, k);
  switch (b.type) {
    case "paragraph":
      return need(b.text, c, w, o);
    case "bullets":
      return need(bulletParas(b.items, c, b.ordered), c, w, o);
    case "callout":
      return need(b.text, c, w - 0.5, { ...o, size: PT.h4 * 1.1 * k }) + 0.3;
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
    case "two-column":
    case "positions":
    case "transform": {
      const sides =
        b.type === "two-column"
          ? [b.left, b.right]
          : b.type === "transform"
            ? [{ items: b.before.items }, { items: b.after.items }]
            : [{ text: b.left.quote }, { text: b.right.quote }];
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
        ) +
        0.45 +
        (b.type === "positions" ? 0.6 : 0)
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
    case "labeled-grid":
    case "cards": {
      const items =
        b.type === "labeled-grid"
          ? b.items.map((i) => [i.title, i.subtitle])
          : b.items.map((i) => [i.title ?? "", i.text]);
      const cols =
        b.type === "labeled-grid"
          ? (b.columns ?? Math.min(items.length, 3))
          : items.length === 4
            ? 2
            : Math.min(items.length, 3);
      const rows = Math.ceil(items.length / cols);
      const cellW = w / cols - 0.2;
      const cell =
        Math.max(
          ...items.map(([t, d]) =>
            need(
              [{ runs: [{ text: t }], rel: 1.1, after: 4 }, { runs: md(d, c) }],
              c,
              cellW - 0.4,
              o,
            ),
          ),
        ) +
        0.4 +
        (b.type === "cards" ? 0.35 : 0);
      return rows * cell + (rows - 1) * 0.15;
    }
    case "pipeline":
      return 1.1 + (b.containerLabel ? 0.4 : 0) + (b.containerFooter ? 0.35 : 0);
    case "flow":
      return (
        Math.max(
          ...b.steps.map((st) =>
            need(
              [{ runs: [{ text: st.title }], rel: 1.1, after: 4 }, { runs: md(st.text ?? "", c) }],
              c,
              w / b.steps.length - 0.65,
              o,
            ),
          ),
        ) +
        0.45 +
        (b.loop ? 0.5 : 0)
      );
    case "layers":
      return b.layers.length * (0.5 * k + 0.1);
    case "timeline":
      return (
        0.6 +
        Math.max(
          ...b.events.map((e) =>
            need(
              [{ runs: [{ text: e.title }], after: 4 }, { runs: md(e.text ?? "", c) }],
              c,
              w / b.events.length - 0.15,
              o,
            ),
          ),
        )
      );
    case "bars":
      return b.bars.length * 0.45 * k + (b.source ? 0.3 : 0);
    case "numbers":
      return 1.3 + (b.source ? 0.3 : 0);
    case "image":
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

const GROWS = new Set(["image", "linked-image", "video", "annotated", "image-and-grid"]);

/** Draws a block into its area at scale k. */
function drawBlock(s: PSlide, ctx: Ctx, b: ContentBlock, a: Area, k: number, centered: boolean) {
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
      // The web's tints: the tone at 7 % on the ground, its border at 25 %, the text in ink, or for
      // a warning or success the tone mixed 60 % with ink.
      const tone = b.variant === "warning" ? c.amber : b.variant === "success" ? c.green : c.purple;
      const ink =
        b.variant === "warning" || b.variant === "success" ? mix(tone, c.ink, 0.6) : c.ink;
      const size = PT.h4 * 1.1 * k;
      const w = b.fullWidth
        ? a.w
        : Math.min(a.w, (plain(b.text).length * size * ADVANCE.sans) / 72 + 0.6);
      card(s, a.x, a.y, w, a.h, mix(tone, c.bg, 0.07), mix(tone, c.bg, 0.25));
      return box(s, c, b.text, a.x + 0.25, a.y + 0.12, w - 0.5, a.h - 0.24, {
        ...o,
        size,
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
      // The web's table: body at the small step, headers as mono capitals at the label step.
      const size = Math.max(7, Math.round(PT.base * 0.875 * k * 2) / 2);
      const cell = (t: string, head: boolean): PptxGenJS.TableCell => ({
        text: md(
          head ? t.toUpperCase() : t,
          c,
          head
            ? { bold: true, fontFace: MONO, color: c.ink, fontSize: Math.max(7, PT.label * k) }
            : {},
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
            runs: md(sc.title.toUpperCase(), c, { color: c.amber }),
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
      const [lt, rt] = (VARIANT_TONES[b.variant ?? "neutral"] ?? ["muted", "muted"]).map((t) =>
        t === "muted" ? undefined : (c[t as keyof Palette] as string),
      );
      const half = a.w / 2 - 0.15;
      itemCard(s, ctx, { ...a, w: half }, k, {
        ...b.left,
        tone: lt,
        mark: lt ? (lt === c.green ? "+" : "−") : undefined,
      });
      itemCard(s, ctx, { ...a, x: a.x + half + 0.3, w: half }, k, {
        ...b.right,
        tone: rt,
        mark: rt ? (rt === c.green ? "+" : "−") : undefined,
      });
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
    case "transform": {
      const half = a.w / 2 - 0.35;
      itemCard(s, ctx, { ...a, w: half }, k, {
        title: b.before.label,
        items: b.before.items,
        tone: c.muted,
      });
      arrow(s, c, a.x + half + 0.12, a.y + a.h / 2, a.x + half + 0.58, a.y + a.h / 2, c.teal);
      itemCard(s, ctx, { ...a, x: a.x + half + 0.7, w: half }, k, {
        title: b.after.label,
        items: b.after.items,
        tone: c.teal,
        fill: c.tealTint,
      });
      return;
    }
    case "positions": {
      const half = a.w / 2 - 0.15;
      const ch = a.h - 0.6;
      for (const [side, x, i] of [
        [b.left, a.x, 0],
        [b.right, a.x + half + 0.3, 1],
      ] as const) {
        const tone = c[THEME[personAccent(i)]] as string;
        card(s, x, a.y, half, ch, c.card, tone);
        box(
          s,
          c,
          [
            { runs: [{ text: side.name }], mono: true, bold: true, rel: 1.1, after: 2 },
            { runs: [{ text: side.stance, options: { color: tone } }], rel: 0.9, after: 8 },
            { runs: md(`“${side.quote}”`, c) },
          ],
          x + 0.2,
          a.y + 0.2,
          half - 0.4,
          ch - 0.4,
          o,
        );
      }
      box(
        s,
        c,
        [
          ...(b.middle ? [{ runs: md(b.middle, c, { color: c.muted }), after: 4 }] : []),
          { runs: md(b.resolution, c), bold: true },
        ],
        a.x,
        a.y + ch + 0.1,
        a.w,
        0.5,
        { ...o, align: "center" },
      );
      return;
    }
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
    case "labeled-grid":
    case "cards": {
      const items =
        b.type === "labeled-grid"
          ? b.items.map((i) => ({ title: i.title, text: i.subtitle, hi: i.highlighted }))
          : b.items.map((i) => ({ title: i.title, text: i.text, hi: false }));
      const cols =
        b.type === "labeled-grid"
          ? (b.columns ?? Math.min(items.length, 3))
          : items.length === 4
            ? 2
            : Math.min(items.length, 3);
      const rows = Math.ceil(items.length / cols);
      const cw = (a.w - (cols - 1) * 0.2) / cols;
      const rh = (a.h - (rows - 1) * 0.15) / rows;
      items.forEach((it, i) => {
        const x = a.x + (i % cols) * (cw + 0.2);
        const y = a.y + Math.floor(i / cols) * (rh + 0.15);
        card(s, x, y, cw, rh, it.hi ? c.tealTint : c.card, it.hi ? c.teal : c.border);
        let ty = y + 0.2;
        if (b.type === "cards") {
          const label = b.numbered ? String(i + 1) : "■";
          rect(s, x + 0.2, ty, 0.28, 0.28, c.teal);
          box(s, c, { runs: [{ text: label }] }, x + 0.2, ty, 0.28, 0.28, {
            size: PT.sm,
            mono: true,
            bold: true,
            color: c.card,
            align: "center",
            valign: "middle",
          });
          ty += 0.4;
        }
        box(
          s,
          c,
          [
            ...(it.title
              ? [
                  {
                    runs: md(it.title, c, { color: c.ink }),
                    mono: b.type !== "labeled-grid",
                    bold: true,
                    rel: 1.05,
                    after: 4,
                  },
                ]
              : []),
            { runs: md(it.text, c) },
          ],
          x + 0.2,
          ty,
          cw - 0.4,
          y + rh - ty - 0.15,
          { ...o, align: "left" },
        );
      });
      return;
    }
    case "pipeline": {
      if (b.containerSideNotes?.length) {
        const nw = Math.min(2.6, a.w * 0.25);
        box(
          s,
          c,
          b.containerSideNotes.map((t) => ({ runs: md(t, c), bullet: true, after: 4 })),
          a.x + a.w - nw,
          a.y + (b.containerLabel ? 0.4 : 0),
          nw,
          a.h,
          { ...o, size: PT.sm * k, color: c.muted, align: "left" },
        );
        return drawBlock(
          s,
          ctx,
          { ...b, containerSideNotes: undefined },
          { ...a, w: a.w - nw - 0.3 },
          k,
          centered,
        );
      }
      let y = a.y;
      if (b.containerLabel) {
        let x = a.x + chip(s, c, b.containerLabel, a.x, y, PT.label, c.teal, c.card) + 0.15;
        for (const logo of b.containerLogos ?? [])
          x += picture(s, ctx, logo.src, x, y, 1, 0.26, { alt: logo.alt, align: "left" }).w + 0.15;
        y += 0.4;
      }
      const n = b.stages.length;
      const gap = b.showArrows === false ? 0.15 : 0.4;
      const sw = (a.w - (n - 1) * gap) / n;
      b.stages.forEach((st, i) => {
        const x = a.x + i * (sw + gap);
        const active = st.state === "active" || st.state === "new";
        card(s, x, y, sw, 0.7, active ? c.tealTint : c.card, active ? c.teal : c.border);
        box(s, c, { runs: md(st.title, c) }, x + 0.1, y, sw - 0.2, 0.7, {
          ...o,
          mono: true,
          bold: true,
          align: "center",
          valign: "middle",
          size: PT.sm * k,
        });
        if (i < n - 1 && b.showArrows !== false)
          arrow(s, c, x + sw + 0.06, y + 0.35, x + sw + gap - 0.06, y + 0.35);
      });
      if (b.containerFooter)
        box(s, c, b.containerFooter, a.x, y + 0.8, a.w, 0.3, {
          ...o,
          color: c.muted,
          size: PT.sm * k,
        });
      return;
    }
    case "flow": {
      const n = b.steps.length;
      const gap = 0.45;
      const sw = (a.w - (n - 1) * gap) / n;
      const ch = a.h - (b.loop ? 0.5 : 0);
      b.steps.forEach((st, i) => {
        const x = a.x + i * (sw + gap);
        const tone =
          st.tone === "red"
            ? c.red
            : st.tone === "green"
              ? c.green
              : i === b.highlight
                ? c.teal
                : undefined;
        card(s, x, a.y, sw, ch, tone ? mix(tone, c.bg, 0.1) : c.card, tone ?? c.border);
        box(
          s,
          c,
          [
            {
              runs: md(st.title, c, { color: tone ?? c.ink }),
              mono: true,
              bold: true,
              rel: 1.05,
              after: 4,
              align: "center",
            },
            { runs: md(st.text ?? "", c, { color: c.muted }), align: "center" },
          ],
          x + 0.15,
          a.y + 0.15,
          sw - 0.3,
          ch - 0.3,
          { ...o, valign: "middle" },
        );
        if (i < n - 1) arrow(s, c, x + sw + 0.07, a.y + ch / 2, x + sw + gap - 0.07, a.y + ch / 2);
      });
      if (b.loop) {
        const ly = a.y + ch + 0.25;
        s.addShape("line", {
          x: a.x + sw / 2,
          y: a.y + ch,
          w: 0.001,
          h: 0.25,
          line: { color: c.teal, width: 1.25, beginArrowType: "triangle" },
        });
        s.addShape("line", {
          x: a.x + sw / 2,
          y: ly,
          w: a.w - sw,
          h: 0.001,
          line: { color: c.teal, width: 1.25 },
        });
        s.addShape("line", {
          x: a.x + a.w - sw / 2,
          y: a.y + ch,
          w: 0.001,
          h: 0.25,
          line: { color: c.teal, width: 1.25 },
        });
        box(s, c, b.loop, a.x + sw, ly + 0.03, a.w - 2 * sw, 0.22, {
          ...o,
          size: PT.sm * k,
          color: c.purple,
          align: "center",
        });
      }
      return;
    }
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
      s.addShape("line", {
        x: a.x + ew / 2,
        y: ly,
        w: a.w - ew,
        h: 0.001,
        line: { color: c.border, width: 2 },
      });
      if (b.now !== undefined && b.now < n - 1) {
        s.addShape("line", {
          x: a.x + ew / 2 + b.now * ew,
          y: ly,
          w: (n - 1 - b.now) * ew,
          h: 0.001,
          line: { color: c.bg, width: 2, dashType: "dash" },
        });
        s.addShape("line", {
          x: a.x + ew / 2 + b.now * ew,
          y: ly,
          w: (n - 1 - b.now) * ew,
          h: 0.001,
          line: { color: c.muted, width: 2, dashType: "dash" },
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
        if (e.when)
          box(s, c, { runs: [{ text: e.when }] }, cx - ew / 2 + 0.05, a.y, ew - 0.1, 0.22, {
            size: PT.label * k,
            mono: true,
            bold: true,
            color: c.muted,
            align: "center",
          });
        box(
          s,
          c,
          [
            { runs: md(e.title, c, { color: hi ? c.teal : c.ink }), bold: true, after: 4 },
            { runs: md(e.text ?? "", c, { color: c.muted }), rel: 0.9 },
          ],
          cx - ew / 2 + 0.07,
          ly + 0.2,
          ew - 0.14,
          a.h - 0.55,
          { ...o, align: "center" },
        );
      });
      return;
    }
    case "bars": {
      const bars = b.order === "given" ? b.bars : [...b.bars].sort((p, q) => q.value - p.value);
      const max = b.max ?? Math.max(...bars.map((x) => x.value));
      const rows = bars.length;
      const rh = (a.h - (b.source ? 0.3 : 0)) / rows;
      const lw = a.w * 0.3;
      const tw = a.w - lw - 1;
      bars.forEach((bar, i) => {
        const y = a.y + i * rh;
        const bh = Math.min(0.32, rh * 0.6);
        box(s, c, bar.label, a.x, y, lw - 0.15, rh, { ...o, align: "right", valign: "middle" });
        if (b.max) rect(s, a.x + lw, y + (rh - bh) / 2, tw, bh, c.tint);
        rect(
          s,
          a.x + lw,
          y + (rh - bh) / 2,
          Math.max(0.02, (bar.value / max) * tw),
          bh,
          // As on the web slide: every bar teal, or with a highlight the rest in the context grey.
          bar.highlight || !bars.some((x) => x.highlight) ? c.teal : mix(c.ink, c.bg, 0.4),
        );
        box(
          s,
          c,
          { runs: [{ text: bar.display ?? String(bar.value) }] },
          a.x + lw + tw + 0.1,
          y,
          0.9,
          rh,
          { ...o, mono: true, bold: true, valign: "middle" },
        );
      });
      if (b.source)
        box(s, c, b.source, a.x, a.y + a.h - 0.25, a.w, 0.25, {
          ...o,
          size: PT.label,
          color: c.muted,
        });
      return;
    }
    case "numbers": {
      const n = b.items.length;
      const nw = a.w / n;
      b.items.forEach((it, i) => {
        box(
          s,
          c,
          [
            {
              runs: [{ text: it.value }],
              mono: true,
              bold: true,
              rel: PT.s6 / PT.base,
              after: 6,
              align: "center",
            },
            { runs: md(it.label, c, { color: c.muted }), align: "center" },
          ],
          a.x + i * nw + 0.1,
          a.y,
          nw - 0.2,
          1.2,
          { ...o, color: c.teal, valign: "middle" },
        );
      });
      if (b.source)
        box(s, c, b.source, a.x, a.y + a.h - 0.25, a.w, 0.25, {
          ...o,
          size: PT.label,
          color: c.muted,
          align: "center",
        });
      return;
    }
    case "image":
      picture(s, ctx, b.src, a.x, a.y, a.w, a.h, { alt: b.alt, native: true });
      return;
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
      const path = join(ctx.assets, b.src.replace(/^\//, ""));
      const h = a.h - (b.caption ? 0.35 : 0);
      if (existsSync(path)) {
        const w = Math.min(a.w, (h * 16) / 9);
        // pptxgenjs stores the cover as a PNG part whatever its bytes: anything else stays out.
        const poster = b.poster && join(ctx.assets, b.poster.replace(/^\//, ""));
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
      const path = join(ctx.assets, b.src.replace(/^\//, ""));
      if (existsSync(path)) {
        s.addImage({
          path,
          x: a.x,
          y: a.y,
          w: pw,
          h: ph,
          altText: b.alt,
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
          h: Math.min(a.y + a.h - y, b.items.length * 1.2),
        },
        k,
        false,
      );
      return;
    }
  }
}

/** Stacks blocks in the area, shrinking them together until they fit. Image blocks take the space
 *  the others leave. */
function blocks(s: PSlide, ctx: Ctx, list: ContentBlock[], a: Area, centered = false) {
  const gap = 0.25;
  let k = 1;
  const fixed = (kk: number) =>
    list
      .filter((b) => !GROWS.has(b.type))
      .reduce((sum, b) => sum + blockHeight(b, ctx.c, a.w, kk), 0);
  const grows = list.filter((b) => GROWS.has(b.type)).length;
  const room = a.h - gap * (list.length - 1) - grows * 1.5;
  while (k > 0.62 && fixed(k) > room) k -= 0.04;
  const extra = grows ? (a.h - gap * (list.length - 1) - fixed(k)) / grows : 0;
  const total = fixed(k) + grows * extra + gap * (list.length - 1);
  let y = centered ? a.y + Math.max(0, (a.h - total) / 2) : a.y;
  for (const b of list) {
    const h = GROWS.has(b.type)
      ? Math.max(1, extra)
      : Math.min(blockHeight(b, ctx.c, a.w, k), a.y + a.h - y);
    drawBlock(s, ctx, b, { x: a.x, y, w: a.w, h }, k, centered);
    y += h + gap;
  }
}

// ─── slide types ────────────────────────────────────────────────────────────

const BODY = (y: number): Area => ({ x: SIDE, y, w: CW, h: BOTTOM - y });

/** A row of n equal cards across the area, each drawn by `draw`. */
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
  if (src) picture(s, ctx, src, x, y, d, d, { round: true, alt: name });
  else {
    s.addShape("ellipse", {
      x,
      y,
      w: d,
      h: d,
      fill: { color: mix(tone, ctx.c.bg, 0.25) },
      line: { type: "none" },
    });
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
      { size: d * 24, mono: true, bold: true, color: tone, align: "center", valign: "middle" },
    );
  }
}

type Render = (s: PSlide, ctx: Ctx, slide: never, deck: Presentation) => void;

const RENDER: {
  [K in Slide["type"]]: (
    s: PSlide,
    ctx: Ctx,
    slide: Extract<Slide, { type: K }>,
    deck: Presentation,
  ) => void;
} = {
  title(s, { c }, d) {
    const o: BoxOpts = {
      size: PT.display,
      mono: true,
      bold: true,
      color: c.ink,
      align: "center",
      line: 1.05,
      floor: 0.5,
      tracking: -0.03,
    };
    const th = need(d.title, c, CW - 1, o, 3);
    const sh = d.subtitle ? need(d.subtitle, c, CW - 2, { size: PT.lead, color: c.ink }, 1.2) : 0;
    const y = (H - th - sh - 0.5) / 2;
    box(s, c, d.title, SIDE + 0.5, y, CW - 1, th, o);
    if (d.subtitle)
      box(s, c, d.subtitle, SIDE + 1, y + th + 0.5, CW - 2, sh, {
        size: PT.lead,
        color: c.ink,
        align: "center",
      });
  },

  content(s, ctx, d) {
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
    const footH = d.footer
      ? need(d.footer, ctx.c, CW, { size: PT.base, color: ctx.c.ink }, 0.6) + 0.25
      : 0;
    blocks(s, ctx, d.content, { ...BODY(y), h: BOTTOM - y - footH }, centered);
    if (d.footer) {
      s.addShape("line", {
        x: SIDE,
        y: BOTTOM - footH + 0.05,
        w: CW,
        h: 0.001,
        line: { color: ctx.c.border, width: 0.75 },
      });
      box(s, ctx.c, d.footer, SIDE, BOTTOM - footH + 0.15, CW, footH - 0.15, {
        size: PT.base,
        color: ctx.c.ink,
        align: centered ? "center" : "left",
      });
    }
  },

  regular(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d, d.align === "center");
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
      box(
        s,
        c,
        [
          { runs: [{ text: d.profile.name }], mono: true, bold: true, after: 4 },
          { runs: [{ text: d.profile.title, options: { color: c.teal } }], rel: 0.9 },
        ],
        a.x,
        a.y + 1.75,
        pw,
        0.9,
        { size: PT.base, color: c.ink, align: "center" },
      );
      a = { ...a, x: a.x + pw + 0.5, w: a.w - pw - 0.5 };
    }
    const secs = d.sections;
    const paras = (sec: (typeof secs)[number], active: boolean): Para[] => [
      ...(sec.title
        ? [
            {
              runs: md(sec.title, c, {
                color: active || d.activeSection === undefined ? c.teal : c.muted,
              }),
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
    if (d.layout === "cards" || (!d.profile && secs.length > 1 && secs.length <= 4)) {
      const card_h = Math.min(
        a.h,
        Math.max(
          ...secs.map((sec) =>
            need(paras(sec, true), c, a.w / secs.length - 0.6, { size: PT.base, color: c.ink }),
          ),
        ) + 0.5,
      );
      row(secs, { ...a, h: card_h }, 0.25, (sec, r, i) => {
        const active = d.activeSection === i;
        card(s, r.x, r.y, r.w, r.h, active ? c.tealTint : c.card, active ? c.teal : c.border);
        box(s, c, paras(sec, active), r.x + 0.25, r.y + 0.25, r.w - 0.5, r.h - 0.5, {
          size: PT.base,
          color: c.ink,
        });
      });
    } else {
      box(
        s,
        c,
        secs.flatMap((sec, i) =>
          paras(sec, d.activeSection === i).map((p, j, arr) =>
            j === arr.length - 1 ? { ...p, after: 14 } : p,
          ),
        ),
        a.x,
        a.y,
        a.w,
        a.h,
        { size: PT.base, color: c.ink, align: d.align === "center" ? "center" : "left" },
      );
    }
  },

  statement(s, ctx, d) {
    const { c } = ctx;
    const imgW = d.imageSrc ? CW * 0.38 : 0;
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
    const paras: Para[] = d.lines.map((l) => ({
      runs: lineRuns(l),
      mono: true,
      bold: true,
      rel: PT.s8 / PT.base,
      align: "center",
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
        align: "center",
      });
    }
    if (d.subtitle)
      paras.splice(crossed + d.lines.length, 0, {
        runs: md(d.subtitle, c, { color: c.muted }),
        rel: PT.lead / PT.base,
        align: "center",
      });
    paras.forEach((p, i) => (p.after = i >= crossed && i < crossed + d.lines.length - 1 ? 0 : 16));
    for (const [i, pt] of (d.points ?? []).entries()) {
      paras.push({
        runs: [
          {
            text: `${String(i + 1).padStart(2, "0")}  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(pt, c),
        ],
        rel: PT.lead / PT.base,
        after: 6,
        align: "center",
      });
    }
    if (d.closing) {
      const q = d.closingStyle === "quote";
      paras.push({
        runs: md(q ? `“${d.closing}”` : d.closing, c, q ? { italic: true } : {}),
        bold: !q,
        rel: PT.lead / PT.base,
        after: 4,
        align: "center",
      });
    }
    if (d.attribution)
      paras.push({
        runs: [{ text: `— ${d.attribution}`, options: { color: c.muted } }],
        align: "center",
      });
    const o: BoxOpts = {
      size: PT.base,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.2,
      floor: 0.5,
    };
    box(s, c, paras, SIDE, TOP, w, BOTTOM - TOP, o);
    if (d.imageSrc)
      picture(s, ctx, d.imageSrc, SIDE + w + 0.4, TOP, imgW, BOTTOM - TOP, { alt: d.imageAlt });
  },

  evolution(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = d.footer ? 0.6 : 0;
    const gap = 0.45;
    const sw = (CW - (d.stages.length - 1) * gap) / d.stages.length;
    const want = Math.max(
      ...d.stages.map((st) =>
        need(
          [
            { runs: [{ text: st.title }], rel: PT.h4 / PT.base, after: 4 },
            { runs: md(st.subtitle, c), after: 8 },
            { runs: md(st.description, c) },
            ...(st.badge ? [{ runs: [{ text: st.badge }] }] : []),
          ],
          c,
          sw - 0.4,
          { size: PT.lead, color: c.ink },
        ),
      ),
    );
    const a = { ...BODY(y + 0.15), h: Math.min(BOTTOM - y - 0.15 - footH, want + 0.8) };
    row(d.stages, a, gap, (st, r, i) => {
      const hi = st.isHighlighted;
      card(s, r.x, r.y, r.w, r.h, hi ? c.tealTint : c.card, hi ? c.teal : c.border);
      if (st.multiplier)
        chip(
          s,
          c,
          st.multiplier,
          r.x + r.w / 2 - 0.25,
          r.y - 0.15,
          PT.label,
          hi ? c.teal : c.ink,
          c.card,
        );
      const tone = st.isDimmed ? c.muted : c.ink;
      box(
        s,
        c,
        [
          {
            runs: md(st.title, c, { color: tone }),
            mono: true,
            bold: true,
            rel: PT.h4 / PT.base,
            after: 4,
          },
          { runs: md(st.subtitle, c, { color: hi ? c.teal : c.muted }), after: 8 },
          { runs: md(st.description, c, { color: tone }) },
          ...(st.badge
            ? [{ runs: [{ text: st.badge, options: { color: c.teal, bold: true } }] }]
            : []),
        ],
        r.x + 0.2,
        r.y + 0.3,
        r.w - 0.4,
        r.h - 0.45,
        { size: PT.lead, color: c.ink, align: "center" },
      );
      if (i < d.stages.length - 1)
        arrow(s, c, r.x + r.w + 0.08, r.y + r.h / 2, r.x + r.w + gap - 0.08, r.y + r.h / 2);
    });
    if (d.footer) {
      const fw = Math.min(CW, (d.footer.length * PT.base * ADVANCE.sans) / 72 + 0.8);
      card(s, (W - fw) / 2, BOTTOM - 0.5, fw, 0.45, c.purpleTint, c.purple);
      box(s, c, d.footer, (W - fw) / 2 + 0.2, BOTTOM - 0.5, fw - 0.4, 0.45, {
        size: PT.lead,
        color: c.purple,
        align: "center",
        valign: "middle",
      });
    }
  },

  grid(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const cols =
      d.columns ??
      (d.variant === "stats"
        ? 2
        : d.cards.length <= 5
          ? d.cards.length
          : Math.ceil(d.cards.length / 2));
    const rows = Math.ceil(d.cards.length / cols);
    const a = BODY(y);
    const cw = (a.w - (cols - 1) * 0.25) / cols;
    const paras = (cd: (typeof d.cards)[number]): Para[] =>
      d.variant === "stats"
        ? [
            {
              runs: [{ text: cd.value ?? cd.title }],
              mono: true,
              bold: true,
              rel: PT.s6 / PT.base,
              after: 6,
            },
            { runs: md(cd.label ?? cd.title, c, { color: c.muted }) },
            ...(cd.description ? [{ runs: md(cd.description, c) }] : []),
          ]
        : d.variant === "quotes"
          ? [
              { runs: md(`“${cd.title}”`, c, { italic: true }), after: 8 },
              ...(cd.author
                ? [{ runs: [{ text: `— ${cd.author}`, options: { color: c.muted } }], rel: 0.9 }]
                : []),
              ...(cd.description ? [{ runs: md(cd.description, c, { color: c.muted }) }] : []),
            ]
          : [
              { runs: md(cd.title, c), mono: true, bold: true, rel: PT.h4 / PT.base, after: 6 },
              ...(cd.description ? [{ runs: md(cd.description, c, { color: c.muted }) }] : []),
            ];
    const ch = Math.min(
      (a.h - (rows - 1) * 0.25) / rows,
      Math.max(
        ...d.cards.map((cd) => need(paras(cd), c, cw - 0.5, { size: PT.lead, color: c.ink })),
      ) + 0.9,
    );
    const top = a.y + Math.max(0, (a.h - rows * ch - (rows - 1) * 0.25) / 2);
    d.cards.forEach((cd, i) => {
      const x = a.x + (i % cols) * (cw + 0.25);
      const yy = top + Math.floor(i / cols) * (ch + 0.25);
      const cardTone = cd.tone ?? cd.accentColor;
      const tone =
        cardTone && cardTone !== "neutral"
          ? (c[THEME[cardTone]] as string)
          : [c.teal, c.purple, c.amber, c.green][i % 4];
      const active = d.allActive || cd.highlight || d.variant !== "pillars";
      card(
        s,
        x,
        yy,
        cw,
        ch,
        d.variant === "pillars" && active ? mix(tone, c.bg, 0.07) : c.card,
        d.variant === "pillars" && active ? tone : c.border,
      );
      let ty = yy + 0.25;
      if (d.variant === "pillars" || !d.variant) {
        rect(s, x + cw / 2 - 0.15, yy - 0.15, 0.3, 0.3, tone);
        box(
          s,
          c,
          { runs: [{ text: String((d.numberFrom ?? 1) + i) }] },
          x + cw / 2 - 0.15,
          yy - 0.15,
          0.3,
          0.3,
          { size: PT.sm, mono: true, bold: true, color: c.card, align: "center", valign: "middle" },
        );
        ty += 0.2;
      }
      if (cd.imageSrc) {
        portrait(s, ctx, cd.imageSrc, cd.author ?? cd.title, x + cw / 2 - 0.4, ty, 0.8, tone);
        ty += 0.95;
      }
      box(s, c, paras(cd), x + 0.25, ty, cw - 0.5, yy + ch - ty - 0.2, {
        size: PT.lead,
        color: d.variant === "stats" ? c.ink : c.ink,
        align: d.variant === "quotes" ? "left" : "center",
        valign: d.variant === "stats" ? "middle" : "top",
      });
      if (d.variant === "stats") s.addText("", { x: 0, y: 0, w: 0.01, h: 0.01 });
    });
  },

  comparison(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const punchH = d.punchline ? 0.55 : 0;
    const noteH = d.footnotes?.length ? 0.3 * d.footnotes.length : 0;
    const a = { ...BODY(y), h: BOTTOM - y - punchH - noteH };
    const sides = [d.left, d.right];
    const tones = d.variant === "before-after" ? [c.muted, c.teal] : [c.ink, c.ink];
    const ch = Math.min(
      a.h,
      Math.max(
        ...sides.map((sd) =>
          need(
            [
              { runs: [{ text: sd.label }], rel: 1.2, after: 8 },
              ...(sd.highlight ? [{ runs: [{ text: sd.highlight }], after: 8 }] : []),
              ...sd.items.map((it) => ({ runs: md(it, c), after: 6 })),
            ],
            c,
            a.w / 2 - 0.7,
            { size: PT.base, color: c.ink },
          ),
        ),
      ) + 0.5,
    );
    // The print route shows both sides of a `vs` slide active, as its last reveal step does.
    const active = (i: number) =>
      (d.variant ?? "vs") === "vs" || (i === 1 && d.variant === "before-after");
    row(sides, { ...a, h: ch }, 0.3, (sd, r, i) => {
      card(s, r.x, r.y, r.w, r.h, active(i) ? c.tealTint : c.card, active(i) ? c.teal : c.border);
      let ty = r.y + 0.25;
      if (sd.logo) {
        picture(s, ctx, sd.logo, r.x + 0.25, ty, 1.4, 0.4, { align: "left" });
        ty += 0.5;
      }
      box(
        s,
        c,
        [
          {
            runs: md(sd.label, c, { color: tones[i] }),
            mono: true,
            bold: true,
            rel: PT.h4 / PT.base,
            after: 6,
          },
          ...(sd.highlight
            ? [
                {
                  runs: [{ text: sd.highlight, options: { color: c.teal } }],
                  mono: true,
                  bold: true,
                  rel: 0.8,
                  after: 8,
                },
              ]
            : []),
          // Items starting with "-" are the side's minus points, listed after its plus points.
          ...[
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
              after: 6,
            };
          }),
        ],
        r.x + 0.25,
        ty,
        r.w - 0.5,
        r.y + r.h - ty - 0.2,
        { size: PT.base, color: c.ink },
      );
    });
    if (d.punchline)
      box(s, c, d.punchline, SIDE, a.y + ch + 0.15, CW, 0.45, {
        size: PT.lead,
        mono: true,
        bold: true,
        color: c.teal,
        align: "center",
        valign: "middle",
      });
    if (d.footnotes?.length)
      box(
        s,
        c,
        d.footnotes.map((f) => ({ runs: md(f, c) })),
        SIDE,
        BOTTOM - noteH,
        CW,
        noteH,
        { size: PT.label, color: c.muted, align: "center" },
      );
  },

  guidance(s, ctx, d) {
    const { c } = ctx;
    let y = header(s, ctx, d);
    const intro: Para[] = [
      ...(d.intro ? [{ runs: md(d.intro, c), after: 6 }] : []),
      ...bulletParas(d.points ?? [], c),
    ];
    if (intro.length) {
      const ih = need(intro, c, CW, { size: PT.base, color: c.ink }, 1.6);
      box(s, c, intro, SIDE, y, CW, ih, { size: PT.base, color: c.ink });
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
          ["BAD", ex.bad, c.red, c.redTint],
          ["GOOD", ex.good, c.green, c.greenTint],
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
                runs: [{ text: label, options: { color: tone } }],
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
            { size: PT.sm, mono: true, color: c.ink, line: 1.3 },
          );
        },
      );
    });
  },

  media(s, ctx, d) {
    const { c } = ctx;
    let y = header(s, ctx, d);
    if (d.tags?.length) {
      let x = SIDE;
      for (const t of d.tags) x += chip(s, c, t, x, y - 0.1, PT.label, c.tint, c.ink, false) + 0.1;
      y += 0.3;
    }
    const a = BODY(y);
    const n = d.sources.length;
    const cols = d.layout === "row" ? n : Math.min(n, n === 4 ? 2 : 3);
    const rows = Math.ceil(n / cols);
    const cw = (a.w - (cols - 1) * 0.25) / cols;
    const rh = (a.h - (rows - 1) * 0.25) / rows;
    d.sources.forEach((src, i) => {
      const x = a.x + (i % cols) * (cw + 0.25);
      const yy = a.y + Math.floor(i / cols) * (rh + 0.25);
      const capH = src.caption ? 0.3 : 0;
      if (src.kind === "video" || /\.(mp4|webm|mov)$/i.test(src.src)) {
        drawBlock(
          s,
          ctx,
          { type: "video", src: src.src, alt: src.alt, caption: src.caption },
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
  },

  profiles(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = d.footer ? 0.4 : 0;
    const a = { ...BODY(y), h: BOTTOM - y - footH };
    const ch = Math.min(
      a.h,
      1.6 +
        Math.max(
          ...d.profiles.map((p) =>
            need(bulletParas(p.bullets, c), c, a.w / d.profiles.length - 0.6, {
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
          { runs: [{ text: p.name }], mono: true, bold: true, rel: PT.h4 / PT.base, after: 2 },
          { runs: [{ text: p.title, options: { color: tone } }], after: 2 },
          { runs: [{ text: p.company, options: { color: c.muted } }] },
        ],
        r.x + 1.35,
        r.y + 0.25,
        r.w - 1.6,
        1.1,
        { size: PT.base, color: c.ink, valign: "middle" },
      );
      box(s, c, bulletParas(p.bullets, c), r.x + 0.25, r.y + 1.45, r.w - 0.5, r.h - 1.6, {
        size: PT.base,
        color: c.ink,
      });
    });
    if (d.footer)
      box(s, c, d.footer, SIDE, a.y + ch + 0.15, CW, 0.3, {
        size: PT.sm,
        color: c.muted,
        align: "center",
      });
  },

  "phased-pills"(s, ctx, d) {
    const y = d.title ? header(s, ctx, { headline: d.title }) : TOP;
    pillPhases(s, ctx, d.phases, { x: SIDE + CW * 0.2, y, w: CW * 0.6, h: BOTTOM - y });
  },

  overview(s, ctx, d) {
    const { c } = ctx;
    const a = { x: SIDE + 1, y: TOP + 0.2, w: CW - 2, h: BOTTOM - TOP - 0.2 };
    card(s, a.x, a.y, a.w, a.h, c.card, c.border);
    chip(s, c, "THE FACTORY", W / 2 - 0.75, a.y - 0.15, PT.label, c.teal, c.card);
    const half = (a.h - 0.6) / 2;
    const lane = (
      label: string,
      stages: typeof d.foundations,
      active: boolean | undefined,
      ly: number,
    ) => {
      card(
        s,
        a.x + 0.3,
        ly,
        a.w - 0.6,
        half,
        active ? c.tealTint : c.bg,
        active ? c.teal : c.border,
      );
      box(s, c, { runs: [{ text: `• ${label}` }] }, a.x + 0.5, ly + 0.12, 3, 0.25, {
        size: PT.label,
        mono: true,
        bold: true,
        color: c.teal,
      });
      const rowH = Math.min(half - 0.6, 1.4);
      row(
        stages,
        { x: a.x + 0.5, y: ly + 0.4 + (half - 0.4 - rowH) / 2, w: a.w - 1, h: rowH },
        0.2,
        (st, r) => {
          const on = st.state === "active" || st.state === "new";
          card(s, r.x, r.y, r.w, 0.5, on ? c.tealTint : c.card, on ? c.teal : c.border);
          box(s, c, { runs: md(st.title, c) }, r.x, r.y, r.w, 0.5, {
            size: PT.h4,
            bold: true,
            color: c.ink,
            align: "center",
            valign: "middle",
          });
          box(s, c, st.description, r.x, r.y + 0.6, r.w, r.h - 0.6, {
            size: PT.h4,
            color: c.muted,
            align: "center",
          });
        },
      );
    };
    lane("FOUNDATIONS", d.foundations, d.foundationsActive, a.y + 0.3);
    lane("PIPELINE", d.pipeline, d.pipelineActive, a.y + 0.45 + half);
  },

  process(s, ctx, d, deck) {
    // Stages that run once draw as the row of stage cards; a cycle as the loop below.
    if (d.loop === false)
      return RENDER.evolution(
        s,
        ctx,
        {
          type: "evolution",
          headline: d.headline,
          footer: d.footer,
          stages: d.nodes.map((n) => ({
            multiplier: n.label ?? "",
            title: n.title,
            subtitle: n.subtitle ?? "",
            description: n.description,
            badge: n.badge,
            isDimmed: n.dimmed,
            isHighlighted: n.title === d.highlightPhase,
          })),
        },
        deck,
      );
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = d.footer ? 0.6 : 0;
    const a = { ...BODY(y), h: BOTTOM - y - footH };
    const ch = Math.min(
      a.h,
      0.9 +
        Math.max(
          ...d.nodes.map((n) =>
            need(
              [{ runs: [{ text: n.title }], after: 4 }, { runs: md(n.description, c) }],
              c,
              a.w / d.nodes.length - 0.8,
              { size: PT.lead, color: c.ink },
            ),
          ),
        ),
    );
    const gap = 0.45;
    const ny = a.y + 0.3;
    // As the web's last reveal step: the phase named in any case is lit, none without a name.
    row(d.nodes, { ...a, y: ny, h: ch }, gap, (n, r, i) => {
      const hi = n.title.toLowerCase() === d.highlightPhase?.toLowerCase();
      card(s, r.x, r.y, r.w, r.h, c.card, hi ? c.teal : c.border);
      s.addShape("rect", {
        x: r.x + r.w / 2 - 0.17,
        y: r.y + 0.2,
        w: 0.34,
        h: 0.34,
        fill: { color: hi ? c.teal : c.tealTint },
        line: { type: "none" },
      });
      box(
        s,
        c,
        [
          { runs: md(n.title, c), mono: true, bold: true, rel: PT.h4 / PT.base, after: 4 },
          { runs: md(n.description, c, { color: c.muted }) },
        ],
        r.x + 0.2,
        r.y + 0.65,
        r.w - 0.4,
        r.h - 0.75,
        { size: PT.lead, color: c.ink, align: "center" },
      );
      if (i < d.nodes.length - 1)
        arrow(s, c, r.x + r.w + 0.08, r.y + r.h / 2, r.x + r.w + gap - 0.08, r.y + r.h / 2, c.teal);
    });
    if (d.footer) {
      const fw = Math.min(CW, (d.footer.length * PT.base * ADVANCE.sans) / 72 + 0.8);
      card(s, (W - fw) / 2, ny + ch + 0.4, fw, 0.45, c.purpleTint, c.purple);
      box(s, c, d.footer, (W - fw) / 2 + 0.2, ny + ch + 0.4, fw - 0.4, 0.45, {
        size: PT.lead,
        color: c.purple,
        align: "center",
        valign: "middle",
      });
    }
  },

  lanes(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const codeH = d.codeSnippet
      ? (d.codeSnippet.code.split("\n").length * PT.sm * 1.3) / 72 + 0.45
      : 0;
    const footH = d.footer ? 0.45 : 0;
    const lh = Math.min(0.75, (BOTTOM - y - codeH - footH - 0.3) / d.lanes.length - 0.12);
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
      lane.stages.forEach((st, j) => {
        const w = chip(s, c, st, x, ly + lh / 2 - (PT.sm * 1.9) / 144, PT.sm, c.card, c.ink, false);
        x += w;
        if (j < lane.stages.length - 1) {
          arrow(s, c, x + 0.05, ly + lh / 2, x + 0.25, ly + lh / 2, c.purple);
          x += 0.3;
        }
      });
    });
    yy += d.lanes.length * (lh + 0.12) + 0.1;
    if (d.footer) box(s, c, d.footer, SIDE, yy, CW, 0.35, { size: PT.base, color: c.ink });
  },

  chart(s, ctx, d) {
    const { c, pptx } = ctx;
    const y = header(s, ctx, d);
    const noteH = d.annotation || d.futureNote ? 0.4 : 0;
    const a = { ...BODY(y), h: BOTTOM - y - noteH };
    const axis = {
      catAxisLabelFontFace: SANS,
      valAxisLabelFontFace: SANS,
      catAxisLabelColor: c.muted,
      valAxisLabelColor: c.muted,
      catAxisLabelFontSize: PT.sm,
      valAxisLabelFontSize: PT.sm,
      valGridLine: { color: c.border, size: 0.5 },
      catAxisLineShow: true,
      valAxisLineShow: false,
    };
    if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) {
      const labels = d.data.map((p) => p.name);
      const series = [
        { name: d.seriesLabel ?? d.yLabel ?? "", labels, values: d.data.map((p) => p.value) },
      ];
      if (d.data.some((p) => p.value2 !== undefined))
        series.push({
          name: d.series2Label ?? "",
          labels,
          values: d.data.map((p) => p.value2 ?? 0),
        });
      s.addChart(d.variant === "trend" ? pptx.ChartType.line : pptx.ChartType.bar, series, {
        x: a.x + 0.5,
        y: a.y,
        w: a.w - 1,
        h: a.h,
        chartColors: [c.teal, c.purple],
        lineSize: 2.5,
        lineDataSymbol: "none",
        barDir: "col",
        showLegend: series.length > 1,
        legendPos: "t",
        legendFontFace: SANS,
        legendFontSize: PT.sm,
        legendColor: c.ink,
        showCatAxisTitle: !!d.xLabel,
        catAxisTitle: d.xLabel,
        showValAxisTitle: !!d.yLabel,
        valAxisTitle: d.yLabel,
        catAxisTitleColor: c.muted,
        valAxisTitleColor: c.muted,
        catAxisTitleFontSize: PT.sm,
        valAxisTitleFontSize: PT.sm,
        ...axis,
        // Bars carry their value on top instead of a value axis, as on the web slide.
        ...(d.variant === "bar" && {
          showValue: true,
          dataLabelPosition: "outEnd",
          dataLabelFontFace: MONO,
          dataLabelFontSize: PT.base,
          dataLabelFontBold: true,
          dataLabelColor: c.ink,
          valAxisHidden: true,
          valGridLine: { style: "none" },
          showValAxisTitle: false,
        }),
      });
    } else if (d.variant === "cycle") {
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
        const cur = i === (d.currentSegmentIndex ?? 0);
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
    const note = [d.annotation, d.futureNote].filter(Boolean).join("   ");
    if (note)
      box(s, c, note, SIDE, BOTTOM - 0.35, CW, 0.35, {
        size: PT.sm,
        color: c.muted,
        align: "center",
      });
  },

  question(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d, true);
    const a = { x: SIDE + CW * 0.2, y: y + 0.2, w: CW * 0.6, h: BOTTOM - y - 0.2 };
    const oh = Math.min(0.6, a.h / d.options.length - 0.15);
    d.options.forEach((op, i) => {
      const oy = a.y + i * (oh + 0.15);
      card(s, a.x, oy, a.w, oh, c.card, c.border, 0.08);
      box(s, c, { runs: [{ text: op.label }] }, a.x + 0.15, oy, 0.4, oh, {
        size: PT.label,
        mono: true,
        bold: true,
        color: c.muted,
        align: "center",
        valign: "middle",
      });
      box(s, c, op.text, a.x + 0.6, oy, a.w - 0.8, oh, {
        size: PT.base,
        color: c.ink,
        valign: "middle",
      });
    });
  },

  transition(s, ctx, d) {
    const { c } = ctx;
    const paras: Para[] = [];
    if (d.preText)
      paras.push({
        runs: [{ text: d.preText.toUpperCase(), options: { color: c.teal } }],
        mono: true,
        bold: true,
        rel: PT.lead / PT.display,
        after: 14,
      });
    paras.push({ runs: md(d.headline, c), mono: true, bold: true, after: 14 });
    if (d.subtitle) paras.push({ runs: md(d.subtitle, c), rel: PT.lead / PT.display });
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

  closing(s, ctx, d) {
    const { c } = ctx;
    const discussion = d.variant === "discussion";
    const head = discussion ? (d.headline ?? d.line1 ?? "Discussion") : d.line1;
    let y = TOP + 0.3;
    if (head) {
      box(s, c, head, SIDE, y, CW, 1.1, {
        size: PT.display,
        mono: true,
        bold: true,
        color: c.ink,
        align: "center",
        valign: "middle",
        floor: 0.5,
      });
      y += 1.3;
    }
    const speakers = d.speakers ?? [];
    if (centredMark(d)) {
      // The web's contact slide without portraits: the lockup in the centre column, each speaker's
      // name and contact lines under it.
      const lockH = 91.7 / 144;
      const lockW = (lockH * 2416) / 447;
      s.addImage({
        path: brandLogo(`lockup${ctx.dark ? "-night" : ""}`),
        x: (W - lockW) / 2,
        y,
        w: lockW,
        h: lockH,
        altText: "hackers&wizards",
      });
      y += lockH + 0.45;
      for (const sp of speakers) {
        const paras: Para[] = [
          { runs: [{ text: sp.name }], mono: true, bold: true, rel: PT.h4 / PT.base, after: 2 },
          ...(sp.company.toLowerCase() === "hackers&wizards"
            ? []
            : [
                {
                  runs: [{ text: sp.company.toUpperCase(), options: { color: c.muted } }],
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
                      text: sp.linkedIn.replace(/^https?:\/\/(www\.)?/, ""),
                      options: { color: c.teal, hyperlink: { url: sp.linkedIn } },
                    },
                  ],
                },
              ]
            : []),
        ];
        const ph = need(paras, c, CW, { size: PT.base, color: c.ink });
        box(s, c, paras, SIDE, y, CW, ph, { size: PT.base, color: c.ink, align: "center" });
        y += ph + 0.3;
      }
    } else if (speakers.length) {
      const sw = Math.min(3.2, CW / speakers.length);
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
              runs: [{ text: sp.company.toUpperCase(), options: { color: tone } }],
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
          ],
          x,
          y + 1.2,
          sw,
          1,
          { size: PT.h4, color: c.ink, align: "center" },
        );
      });
      y += 2.35;
    }
    const tail: Para[] = [];
    if (d.closingQuote)
      tail.push({
        runs: md(`“${d.closingQuote}”`, c, { color: c.teal }),
        mono: true,
        bold: true,
        after: 10,
        align: "center",
      });
    for (const q of d.seedQuestions ?? []) tail.push({ runs: md(q, c), bullet: true, after: 6 });
    if (tail.length)
      box(s, c, tail, SIDE + 1, y, CW - 2, BOTTOM - y, {
        size: PT.lead,
        color: c.ink,
        align: d.seedQuestions?.length ? "left" : "center",
      });
  },

  roadmap(s, ctx, d, deck) {
    // Columns of phases draw as the pill groups below.
    if (d.columns.some((col) => col.phases))
      return RENDER["dual-pill-overview"](
        s,
        ctx,
        {
          type: "dual-pill-overview",
          preText: d.preText,
          headline: d.headline,
          subtitle: d.subtitle,
          left: { ...d.columns[0], phases: d.columns[0].phases ?? [] },
          right: { ...d.columns[1], phases: d.columns[1].phases ?? [] },
        },
        deck,
      );
    const { c } = ctx;
    // A row's own marker colour: `tone`, or the class its deprecated `dotColor` names.
    const marker = (it: RoadmapItem) => {
      const t = it.tone ?? it.dotColor?.slice(3);
      return t ? (c[THEME[t as MarkerTone]] as string) : undefined;
    };
    const y = header(s, ctx, d);
    row(d.columns, BODY(y), 0.35, (col, r) => {
      const tone = col.accent === "deepdive" ? c.purple : c.teal;
      card(s, r.x, r.y, r.w, r.h, mix(tone, c.bg, 0.05), c.border);
      rect(s, r.x + 0.15, r.y, r.w - 0.3, 0.05, tone);
      chip(s, c, col.label, r.x + 0.25, r.y + 0.25, PT.label * 0.85, mix(tone, c.bg, 0.15), tone);
      box(
        s,
        c,
        [
          { runs: md(col.title, c), mono: true, bold: true, rel: PT.h3 / PT.base, after: 4 },
          ...(col.subtitle ? [{ runs: md(col.subtitle, c, { color: c.muted }), after: 10 }] : []),
          ...(col.items ?? []).flatMap((it) => [
            {
              runs: [
                { text: "•  ", options: { color: marker(it) ?? tone } },
                { text: it.title, options: { bold: true, fontFace: MONO } },
              ],
              after: 2,
            },
            ...(it.description
              ? [{ runs: md(it.description, c, { color: c.muted }), after: 8 }]
              : []),
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

  "deep-dive-divider"(s, ctx, d) {
    // The transition slide's centred headline, its label in teal; the night ground and its teal come
    // from the slide's palette.
    const { c } = ctx;
    const label = [d.partLabel, d.kicker].filter(Boolean).join(" · ");
    const paras: Para[] = [
      ...(label
        ? [
            {
              runs: [{ text: label.toUpperCase(), options: { color: c.teal } }],
              mono: true,
              bold: true,
              rel: PT.lead / PT.display,
              after: 14,
            },
          ]
        : []),
      { runs: md(d.headline, c), mono: true, bold: true, after: 14 },
      ...(d.subtitle ? [{ runs: md(d.subtitle, c), rel: PT.lead / PT.display }] : []),
    ];
    box(s, c, paras, SIDE + 0.5, TOP, CW - 1, BOTTOM - TOP, {
      size: PT.display,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.1,
      floor: 0.5,
    });
  },

  "dual-pill-overview"(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, { preText: d.preText, headline: d.headline, subtitle: d.subtitle });
    row([d.left, d.right], { ...BODY(y), h: Math.min(BOTTOM - y, 3) }, 0.35, (side, r) => {
      const tone = side.accent === "deepdive" ? c.purple : c.teal;
      card(s, r.x, r.y, r.w, r.h, mix(tone, c.bg, 0.05), c.border);
      rect(s, r.x + 0.15, r.y, r.w - 0.3, 0.05, tone);
      chip(s, c, side.label, r.x + 0.25, r.y + 0.25, PT.label * 0.85, mix(tone, c.bg, 0.15), tone);
      box(
        s,
        c,
        [
          { runs: md(side.title, c, { color: tone }), mono: true, bold: true, after: 2 },
          ...(side.subtitle ? [{ runs: md(side.subtitle, c, { color: c.muted }), rel: 0.6 }] : []),
        ],
        r.x + 0.25,
        r.y + 0.6,
        r.w - 0.5,
        0.6,
        { size: PT.h3, color: c.ink },
      );
      pillPhases(s, ctx, side.phases, { x: r.x + 0.25, y: r.y + 1.3, w: r.w - 0.5, h: r.h - 1.4 });
    });
  },

  gantt(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const footH = d.footer ? 0.4 : 0;
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
    const rh = Math.min(0.75, (BOTTOM - y - 0.35 - footH - msH) / d.rows.length);
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
      box(s, c, { runs: [{ text: "MILESTONES" }] }, SIDE, my, lw - 0.15, 0.3, {
        size: PT.label,
        mono: true,
        bold: true,
        color: c.muted,
        align: "right",
      });
      for (const m of d.milestones) {
        const mx = gx + (m.column - 1) * colW;
        rect(s, mx, my + 0.02, colW * 0.9, 0.025, c.purple);
        box(s, c, m.label, mx, my + 0.08, colW * 1.5, 0.25, { size: PT.label, color: c.purple });
      }
    }
    if (d.footer)
      box(s, c, d.footer, SIDE, BOTTOM - footH, CW, footH, { size: PT.sm, color: c.muted });
  },

  "team-topology"(s, ctx, d) {
    // The Team Shape Templates as on the web slide: enabling teams vertical on the left, stream
    // teams in teal, complicated subsystems as neutral octagons, the platform under a dotted line.
    const { c } = ctx;
    const y = header(s, ctx, d);
    const capH = d.caption ? 0.35 : 0;
    const enW = d.enabling.length ? 2.2 : 0;
    const mainX = SIDE + enW + (enW ? 0.2 : 0);
    const mainW = CW - enW - (enW ? 0.2 : 0);
    type Shape = "stream" | "subsystem" | "platform";
    const groups = [
      ...d.streamAligned.map((t) => ({
        name: t.name,
        sub: "",
        roles: t.roles,
        shape: "stream" as Shape,
      })),
      ...(d.complicatedSubsystem ?? []).map((t) => ({
        name: t.name,
        sub: t.description ?? "",
        roles: [] as string[],
        shape: "subsystem" as Shape,
      })),
      ...d.platform.map((t) => ({
        name: t.name,
        sub: t.description ?? "",
        roles: t.roles ?? [],
        shape: "platform" as Shape,
      })),
    ];
    // With no stream or subsystem row beside them, the enabling teams take a row of their own
    // above the platform, side by side, as on the web slide.
    const enRow = d.enabling.length > 0 && groups.every((g) => g.shape === "platform") ? 1 : 0;
    const total = BOTTOM - y - capH;
    const gh = Math.min(0.85, total / (groups.length + enRow) - 0.1);
    groups.forEach((g, i) => {
      const gy = y + (i + enRow) * (gh + 0.1);
      const x = g.shape === "platform" ? SIDE : mainX;
      const w = g.shape === "platform" ? CW : mainW;
      if (g.shape === "stream") card(s, x, gy, w, gh, mix(c.teal, c.bg, 0.08), c.teal, 0.08);
      else if (g.shape === "subsystem")
        s.addShape("octagon", {
          x,
          y: gy,
          w,
          h: gh,
          fill: { color: mix(c.neutral, c.bg, 0.08) },
          line: { color: c.neutral, width: 1 },
        });
      else
        s.addShape("roundRect", {
          x,
          y: gy,
          w,
          h: gh,
          rectRadius: 0.08,
          fill: { type: "none" },
          line: { color: c.teal, width: 2, dashType: "sysDot" },
        });
      box(
        s,
        c,
        [
          {
            runs: [{ text: g.name, options: g.shape === "platform" ? { color: c.teal } : {} }],
            bold: true,
            after: 2,
          },
          ...(g.sub ? [{ runs: md(g.sub, c, { color: c.muted }), rel: 0.85 }] : []),
        ],
        x + 0.15,
        gy + 0.05,
        w * 0.45,
        gh - 0.1,
        { size: PT.sm, color: c.ink, valign: "middle" },
      );
      let cx = x + w * 0.47;
      for (const role of g.roles)
        cx += chip(s, c, role, cx, gy + gh / 2 - 0.12, PT.label, c.card, c.ink, false) + 0.08;
    });
    const enRows = groups.filter((g) => g.shape !== "platform").length;
    d.enabling.forEach((e, i) => {
      const eh = enRow
        ? gh
        : (enRows * (gh + 0.1) - 0.1 - (d.enabling.length - 1) * 0.1) / d.enabling.length;
      const ey = enRow ? y : y + i * (eh + 0.1);
      const ex = enRow ? SIDE + i * (enW + 0.2) : SIDE;
      card(s, ex, ey, enW, eh, c.purpleTint, c.purple, 0.08);
      box(
        s,
        c,
        [
          { runs: [{ text: e.name, options: { color: c.purple } }], bold: true, after: 4 },
          ...e.experts.map((x) => ({ runs: md(x, c), rel: 0.9 })),
        ],
        ex + 0.15,
        ey + 0.12,
        enW - 0.3,
        eh - 0.2,
        { size: PT.sm, color: c.ink },
      );
    });
    if (d.caption)
      box(s, c, d.caption, SIDE, BOTTOM - capH, CW, capH, { size: PT.sm, color: c.muted });
  },

  agenda(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const items = d.items.map((it) => (typeof it === "string" ? { title: it } : it));
    const timed = items.some((it) => it.when);
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
      },
      ...(it.text
        ? [{ runs: [{ text: "\t" }, ...md(it.text, c, { color: c.muted })], rel: 0.75, after: 10 }]
        : []),
    ]);
    const footH = d.footer ? 0.7 : 0;
    box(s, c, paras, SIDE, y + 0.2, CW * 0.8, BOTTOM - y - 0.2 - footH, {
      size: PT.h3,
      color: c.ink,
    });
    if (d.footer)
      box(s, c, d.footer, SIDE, BOTTOM - footH, CW, footH, { size: PT.lead, color: c.ink });
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
    const { c } = ctx;
    const y = header(s, ctx, d);
    const capH = d.caption ? 0.35 : 0;
    const a = { ...BODY(y), h: BOTTOM - y - capH };
    const dia = Math.min(a.h, 3.2);
    const cx = W / 2;
    const cy = a.y + a.h / 2;
    const n = d.segments.length;
    // The ring as a teal disc at 40 % under a disc of the ground, cut into segments by lines of the
    // ground, numbered like the web wheel, which starts at the top and runs clockwise.
    const ring = 0.55;
    s.addShape("ellipse", {
      x: cx - dia / 2,
      y: cy - dia / 2,
      w: dia,
      h: dia,
      fill: { color: mix(c.teal, c.bg, 0.4) },
      line: { type: "none" },
    });
    s.addShape("ellipse", {
      x: cx - dia / 2 + ring,
      y: cy - dia / 2 + ring,
      w: dia - 2 * ring,
      h: dia - 2 * ring,
      fill: { color: c.bg },
      line: { type: "none" },
    });
    for (let i = 0; i < n; i++) {
      const cut = ((-90 + (360 / n) * i) * Math.PI) / 180;
      const [x1, y1] = [
        cx + (dia / 2 - ring - 0.02) * Math.cos(cut),
        cy + (dia / 2 - ring - 0.02) * Math.sin(cut),
      ];
      const [x2, y2] = [
        cx + (dia / 2 + 0.02) * Math.cos(cut),
        cy + (dia / 2 + 0.02) * Math.sin(cut),
      ];
      s.addShape("line", {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1) || 0.001,
        h: Math.abs(y2 - y1) || 0.001,
        flipV: x2 < x1 !== y2 < y1,
        line: { color: c.bg, width: 4 },
      });
      const mid = ((-90 + (360 / n) * (i + 0.5)) * Math.PI) / 180;
      const r = dia / 2 - ring / 2;
      box(
        s,
        c,
        { runs: [{ text: String(i + 1) }] },
        cx + r * Math.cos(mid) - 0.15,
        cy + r * Math.sin(mid) - 0.15,
        0.3,
        0.3,
        { size: PT.sm, mono: true, bold: true, color: c.ink, align: "center", valign: "middle" },
      );
    }
    box(s, c, d.center, cx - dia / 2 + ring + 0.1, cy - 0.5, dia - 2 * ring - 0.2, 1, {
      size: PT.sm,
      bold: true,
      color: c.ink,
      align: "center",
      valign: "middle",
    });
    const right = d.segments.map((sg, i) => ({ sg, i })).filter(({ i }) => i < Math.ceil(n / 2));
    const left = d.segments
      .map((sg, i) => ({ sg, i }))
      .filter(({ i }) => i >= Math.ceil(n / 2))
      .reverse();
    const side = (list: typeof right, x: number) => {
      const lh = Math.min(0.75, a.h / Math.max(list.length, 1));
      const top = cy - (list.length * lh) / 2;
      list.forEach(({ sg, i }, j) => {
        rect(s, x, top + j * lh + 0.05, 0.22, 0.22, c.teal);
        box(s, c, { runs: [{ text: String(i + 1) }] }, x, top + j * lh + 0.05, 0.22, 0.22, {
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
          [
            { runs: md(sg.title, c), bold: true, after: 2 },
            { runs: md(sg.text, c, { color: c.muted }), rel: 0.85 },
          ],
          x + 0.32,
          top + j * lh,
          3.2,
          lh,
          { size: PT.sm, color: c.ink },
        );
      });
    };
    side(right, cx + dia / 2 + 0.4);
    side(left, cx - dia / 2 - 4);
    if (d.caption)
      box(s, c, d.caption, SIDE, BOTTOM - capH, CW, capH, { size: PT.sm, color: c.muted });
  },

  decision(s, ctx, d) {
    const { c } = ctx;
    const y = header(s, ctx, d);
    const capH = d.caption ? 0.35 : 0;
    const a = { ...BODY(y), h: BOTTOM - y - capH };
    const cy = a.y + a.h / 2;
    const bw = CW / 5;
    const node = (
      text: Para[],
      x: number,
      yy: number,
      w: number,
      h: number,
      fill: string,
      line: string,
    ) => {
      card(s, x, yy, w, h, fill, line, 0.08);
      box(s, c, text, x + 0.12, yy + 0.08, w - 0.24, h - 0.16, {
        size: PT.sm,
        color: c.ink,
        valign: "middle",
      });
    };
    const nh = 1.1;
    node([{ runs: md(d.need, c), bold: true }], SIDE, cy - nh / 2, bw * 0.9, nh, c.tint, c.border);
    node(
      [{ runs: md(d.question, c), bold: true, align: "center" }],
      SIDE + bw * 1.15,
      cy - nh / 2,
      bw * 0.85,
      nh,
      c.card,
      c.border,
    );
    arrow(s, c, SIDE + bw * 0.9, cy, SIDE + bw * 1.15, cy);
    const bx = SIDE + bw * 2.35;
    const bh = Math.min(1.5, a.h / 2 - 0.2);
    const branches = [
      [d.yes, cy - bh - 0.15],
      [d.no, cy + 0.15],
    ] as const;
    const teamTone = (t: string) =>
      t === "enabling" ? c.purple : t === "platform" ? c.teal : c.red;
    s.addShape("line", {
      x: SIDE + bw * 2.15,
      y: cy - bh / 2 - 0.15,
      w: 0.001,
      h: bh + 0.3,
      line: { color: c.muted, width: 1.25 },
    });
    s.addShape("line", {
      x: SIDE + bw * 2,
      y: cy,
      w: bw * 0.15,
      h: 0.001,
      line: { color: c.muted, width: 1.25 },
    });
    for (const [br, by] of branches) {
      const tone = teamTone(br.team);
      arrow(s, c, SIDE + bw * 2.15, by + bh / 2, bx, by + bh / 2);
      box(s, c, { runs: [{ text: br.label }] }, SIDE + bw * 2.17, by + bh / 2 - 0.3, 0.6, 0.25, {
        size: PT.label,
        mono: true,
        bold: true,
        color: c.ink,
      });
      node(
        [
          { runs: md(br.title, c, { color: tone }), bold: true, after: 4 },
          { runs: md(br.text, c) },
        ],
        bx,
        by,
        bw * 1.2,
        bh,
        mix(tone, c.bg, 0.08),
        tone,
      );
      s.addShape("line", {
        x: bx + bw * 1.2,
        y: by + bh / 2,
        w: bw * 0.2,
        h: 0.001,
        line: { color: c.muted, width: 1.25 },
      });
    }
    const jx = bx + bw * 1.4;
    s.addShape("line", {
      x: jx,
      y: cy - bh / 2 - 0.15,
      w: 0.001,
      h: bh + 0.3,
      line: { color: c.muted, width: 1.25 },
    });
    arrow(s, c, jx, cy, jx + bw * 0.15, cy);
    node(
      [{ runs: md(d.outcome, c), bold: true }],
      jx + bw * 0.15,
      cy - nh / 2,
      CW + SIDE - jx - bw * 0.15,
      nh,
      c.tint,
      c.border,
    );
    if (d.caption)
      box(s, c, d.caption, SIDE, BOTTOM - capH, CW, capH, {
        size: PT.sm,
        color: c.muted,
        align: "center",
      });
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

/** Phases of numbered pills, as phased-pills and dual-pill-overview set them. */
function pillPhases(
  s: PSlide,
  ctx: Ctx,
  phases: {
    label: string;
    theme?: SectionTheme;
    items: { number: number; title: string; state?: string }[];
  }[],
  a: Area,
) {
  const { c } = ctx;
  const ph = Math.min(1, a.h / phases.length);
  phases.forEach((p, i) => {
    const py = a.y + i * ph;
    const tone = c[THEME[p.theme ?? "primary"]] as string;
    box(s, c, { runs: [{ text: `• ${p.label.toUpperCase()}` }] }, a.x, py, a.w, 0.25, {
      size: PT.label,
      mono: true,
      bold: true,
      color: tone,
    });
    let x = a.x;
    for (const it of p.items) {
      const on = it.state === "active" || it.state === "new";
      const w = chip(
        s,
        c,
        `#${it.number} ${it.title}`,
        x,
        py + 0.32,
        PT.sm * 0.9,
        on ? mix(tone, c.bg, 0.15) : c.card,
        c.ink,
        false,
      );
      x += w + 0.12;
    }
  });
}

/** Builds the deck and writes it; returns the warnings for images or videos it could not place. */
export async function renderPptx(
  deck: Presentation,
  out: string,
  assets: string,
): Promise<string[]> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.name;
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const dark = deck.theme === "brand-dark";
  const deckCtx: Ctx = { pptx, c: palette(dark), assets, dark, warnings: [] };
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightCtx: Ctx = { ...deckCtx, c: palette(true), dark: true };
  const ctxOf = (slide: Slide | undefined) =>
    dark || !slide || !isDeepDive(slide) ? deckCtx : nightCtx;
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
  for (const name of Object.keys(zip.files).filter((f) =>
    /^ppt\/(slides|theme)\/[^/]+\.xml$/.test(f),
  )) {
    const xml = await zip.file(name)!.async("string");
    const n = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    const teal = ctxOf(n ? deck.slides[Number(n[1]) - 1] : undefined).c.teal;
    zip.file(
      name,
      xml
        .replace(
          /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
          (m, face: string) =>
            fallback[face] ? `typeface="${face}" pitchFamily="${fallback[face]}" charset="0"` : m,
        )
        // A bullet in the brand colour at four fifths of the text, as the web's square marker;
        // pptxgenjs writes no bullet colour.
        .replace(
          /<a:buSzPct val="100000"\/><a:buChar/g,
          `<a:buClr><a:srgbClr val="${teal}"/></a:buClr><a:buSzPct val="80000"/><a:buChar`,
        ),
    );
  }
  writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return deckCtx.warnings;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--assets");
  const assets = resolve(at >= 0 ? (args.splice(at, 2)[1] ?? "") : "public");
  const [input, out] = args;
  if (!input || !out || !out.endsWith(".pptx")) {
    console.error("Usage: slides-pptx <deck.json|-> <out.pptx> [--assets <dir>]");
    console.error(
      "The deck is a Presentation as JSON; --assets is the directory a slide's /image path resolves in, ./public by default.",
    );
    process.exit(1);
  }
  const deck = JSON.parse(readFileSync(input === "-" ? 0 : input, "utf8")) as Presentation;
  if (typeof deck?.name !== "string" || !Array.isArray(deck.slides)) {
    console.error(`${input} is not a presentation: it needs a name and a slides array.`);
    process.exit(1);
  }
  const warnings = await renderPptx(deck, resolve(out), assets);
  for (const w of warnings) console.error(`warning: ${w}`);
  console.log(`Wrote ${out}: ${deck.slides.length} slides`);
}
