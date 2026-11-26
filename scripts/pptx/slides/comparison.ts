import type { ComparisonSide, ComparisonSidesSlide } from "../../../types/slide";
import {
  beforeAfterLayout,
  drawBeforeAfter,
  highlightPara,
  type BeforeAfterLayout,
  type BeforeAfterMode,
} from "../blocks/before-after";
import { header } from "../chrome";
import { textWidth } from "../fit";
import type { Look } from "../look";
import type { Palette, Surface } from "../palette";
import type { Sheet } from "../sheet";
import { BODY, CW, PT, REM, TITLE, W, type Area } from "../stage";
import { md, plain, type BoxOpts, type Para } from "../text";

export interface ComparisonFootPart {
  paras: Para | Para[];
  o: BoxOpts;
  y: number;
  w: number;
  h: number;
}

export interface ComparisonFootLayout {
  h: number;
  parts: ComparisonFootPart[];
}

export interface ComparisonCard {
  x: number;
  y: number;
  w: number;
  h: number;
  logo?: { src: string; alt: string; area: Area };
  label: Para;
  labelArea: Area;
  items: Para[];
  itemsArea: Area;
}

export interface ComparisonCardsLayout {
  surface: Surface;
  titleO: BoxOpts;
  itemO: BoxOpts;
  cards: ComparisonCard[];
  footY: number;
  foot: ComparisonFootLayout;
}

/** Measures a two-sided comparison's punchline and footnotes under its sides, as the web sets
 *  them: the punchline 2.5 rem under in a 48 rem column, balanced, the footnotes 1.5 rem under
 *  that in a 56 rem column. */
export function comparisonFootLayout(
  look: Look,
  d: { punchline?: string; footnotes?: string[] },
): ComparisonFootLayout {
  const { c } = look;
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
    Math.max(0, ...(d.footnotes ?? []).map((f) => textWidth(f, { size: 13.33 }) + 0.02)),
  );
  const punch: Para = { runs: md(d.punchline ?? "", c), balance: true };
  const notes = (d.footnotes ?? []).map((f) => ({ runs: md(f, c) }));
  const ph = d.punchline ? look.need(punch, pw, punchO) : 0;
  const nh = notes.length ? look.need(notes, nw, noteO) : 0;
  const parts: ComparisonFootPart[] = [];
  let h = 0;
  if (ph) {
    h += 2.5 * REM;
    parts.push({ paras: punch, o: punchO, y: h, w: pw, h: ph });
    h += ph;
  }
  if (nh) {
    h += 1.5 * REM;
    parts.push({ paras: notes, o: noteO, y: h, w: nw, h: nh });
    h += nh;
  }
  return { h, parts };
}

/** Draws a measured comparison foot band starting at `y`. */
export function drawComparisonFoot(sheet: Sheet, foot: ComparisonFootLayout, y: number): void {
  for (const part of foot.parts)
    sheet.box(part.paras, { x: (W - part.w) / 2, y: y + part.y, w: part.w, h: part.h }, part.o);
}

/** Builds a `vs` comparison side's paragraphs: optional highlight, plus points, then minus
 *  points (prefixed with `−  ` or `+  `). */
export function vsSideItems(sd: ComparisonSide, c: Palette): Para[] {
  const ordered = [
    ...sd.items.filter((it) => !it.startsWith("-")),
    ...sd.items.filter((it) => it.startsWith("-")),
  ];
  return [
    ...(sd.highlight ? [highlightPara(sd.highlight, c.teal)] : []),
    ...ordered.map((it) => {
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
    }),
  ];
}

/** Builds a `split` comparison side's paragraphs: optional highlight followed by bullets. */
export function splitSideItems(sd: ComparisonSide, c: Palette): Para[] {
  return [
    ...(sd.highlight ? [highlightPara(sd.highlight, c.teal)] : []),
    ...sd.items.map((it) => ({
      runs: md(it, c),
      bullet: true as const,
      after: 0.75 * REM * 72,
    })),
  ];
}

interface CardSideSpec {
  label: (sd: ComparisonSide, c: Palette) => Para;
  items: (sd: ComparisonSide, c: Palette) => Para[];
  card: (c: Palette) => Surface;
}

const CARD_SIDES: Record<"vs" | "split", CardSideSpec> = {
  vs: {
    label: (sd) => ({ runs: [{ text: sd.label }] }),
    items: vsSideItems,
    card: (c) => c.litCard,
  },
  split: {
    label: (sd, c) => ({ runs: md(sd.label, c) }),
    items: splitSideItems,
    card: (c) => c.plainCard,
  },
};

export interface BeforeAfterComparisonLayout {
  body: BeforeAfterLayout;
  bodyArea: Area;
  foot: ComparisonFootLayout;
  footY: number;
}

function comparisonGroupTop(area: Area, ch: number, footH: number): number {
  // The sides, punchline and footnotes stand as one group where the web's slide body puts it.
  return area.y + Math.max(0, area.h - ch - footH) / 2.25;
}

/** Measures the two side cards (`vs` or `split`) and their footer band inside `area`. */
export function comparisonCardsLayout(
  look: Look,
  d: ComparisonSidesSlide,
  area: Area,
): ComparisonCardsLayout {
  const { c } = look;
  // The print route shows both sides of a `vs` slide active, as its last reveal step does: a vs
  // side lists its plus points, then the items starting with "-" as its minus points. A `split`
  // slide draws two plain cards of listed items, its labels read as markdown. Each card as the
  // web's: 2 rem padding, its title 1.5 rem over the items, the items 0.75 rem apart.
  const spec = CARD_SIDES[(d.variant ?? "vs") === "vs" ? "vs" : "split"];
  const foot = comparisonFootLayout(look, d);
  const sides = [d.left, d.right];
  const pad = 2 * REM;
  const gap = 2 * REM;
  const cw = (area.w - gap) / 2;
  const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.35, tracking: -0.015 };
  const itemO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.4 };
  const logoH = 48 / 144 + REM;
  const measured = sides.map((sd) => {
    const label = spec.label(sd, c);
    const items = spec.items(sd, c);
    const th = look.need(label, cw - 2 * pad, titleO);
    const ih = look.need(items, cw - 2 * pad, itemO);
    return { sd, label, items, th, h: 2 * pad + (sd.logo ? logoH : 0) + th + 1.5 * REM + ih };
  });
  const ch = Math.max(0, Math.min(area.h - foot.h, Math.max(...measured.map((p) => p.h))));
  const top = comparisonGroupTop(area, ch, foot.h);
  const cards = measured.map(({ sd, label, items, th }, i): ComparisonCard => {
    const x = area.x + i * (cw + gap);
    let ty = top + pad;
    const logo = sd.logo
      ? { src: sd.logo, alt: plain(sd.label), area: { x: x + pad, y: ty, w: 1.4, h: 48 / 144 } }
      : undefined;
    if (logo) ty += logoH;
    const labelArea: Area = { x: x + pad, y: ty, w: cw - 2 * pad, h: th };
    ty += th + 1.5 * REM;
    const itemsArea: Area = {
      x: x + pad,
      y: ty,
      w: cw - 2 * pad,
      h: Math.max(0, top + ch - pad - ty),
    };
    return { x, y: top, w: cw, h: ch, logo, label, labelArea, items, itemsArea };
  });
  return { surface: spec.card(c), titleO, itemO, cards, footY: top + ch, foot };
}

/** Draws a measured `vs` or `split` comparison's cards and footer band. */
export function drawComparisonCards(sheet: Sheet, layout: ComparisonCardsLayout): void {
  for (const card of layout.cards) {
    if (card.h <= 0) {
      sheet.warnCutText([card.label, ...card.items]);
      if (card.logo) sheet.warn(`image ${card.logo.src}: no height left in its card`);
      continue;
    }
    sheet.card({ x: card.x, y: card.y, w: card.w, h: card.h }, layout.surface);
    if (card.logo)
      sheet.picture(card.logo.src, card.logo.area, { align: "left", alt: card.logo.alt });
    sheet.box(card.label, card.labelArea, layout.titleO);
    sheet.box(card.items, card.itemsArea, layout.itemO);
  }
  drawComparisonFoot(sheet, layout.foot, layout.footY);
}

/** Measures a `before-after` comparison slide's body and footer band inside `area`. */
export function beforeAfterComparisonLayout(
  look: Look,
  d: ComparisonSidesSlide,
  area: Area,
): BeforeAfterComparisonLayout {
  const foot = comparisonFootLayout(look, d);
  const mode: BeforeAfterMode = d.strike !== false ? "replace" : d.adds ? "add" : "transition";
  const body = beforeAfterLayout(
    look,
    { before: d.left, after: d.right, mode },
    { w: area.w, k: 1 },
  );
  const ch = Math.max(0, Math.min(area.h - foot.h, body.h));
  const top = comparisonGroupTop(area, ch, foot.h);
  return { body, bodyArea: { ...area, y: top, h: ch }, foot, footY: top + ch };
}

/** Draws a measured `before-after` comparison slide's body and footer band. */
export function drawBeforeAfterComparison(sheet: Sheet, layout: BeforeAfterComparisonLayout): void {
  if (layout.bodyArea.h > 0) drawBeforeAfter(sheet, layout.body, layout.bodyArea);
  else for (const side of layout.body.sides) sheet.warnCutText([side.label, ...side.rest]);
  drawComparisonFoot(sheet, layout.foot, layout.footY);
}

const drawCardsSlide = (sheet: Sheet, d: ComparisonSidesSlide, area: Area): void => {
  drawComparisonCards(sheet, comparisonCardsLayout(sheet, d, area));
};

const COMPARISON_VARIANTS: Record<
  NonNullable<ComparisonSidesSlide["variant"]>,
  (sheet: Sheet, d: ComparisonSidesSlide, area: Area) => void
> = {
  "before-after": (sheet, d, area) => {
    drawBeforeAfterComparison(sheet, beforeAfterComparisonLayout(sheet, d, area));
  },
  vs: drawCardsSlide,
  split: drawCardsSlide,
};

export function drawComparison(sheet: Sheet, d: ComparisonSidesSlide): void {
  const y = header(sheet, d);
  const key = d.variant ?? "vs";
  const draw = Object.hasOwn(COMPARISON_VARIANTS, key) ? COMPARISON_VARIANTS[key] : drawCardsSlide;
  draw(sheet, d, BODY(y));
}
