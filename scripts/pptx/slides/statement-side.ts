import { footer, footerOf, type Footer } from "../chrome";
import { MONO } from "../faces";
import type { Look } from "../look";
import type { Palette } from "../palette";
import type { Sheet } from "../sheet";
import { BOTTOM, CW, EDGE, PT, TOP, type Area } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import { lineRuns, type StatementSlide } from "./statement-centred";

export interface SideMedia {
  src: string;
  alt?: string;
  href?: string;
  round: boolean;
}

export interface SideStatementLayout {
  paras: Para[];
  area: Area;
  o: BoxOpts;
  foot: Footer;
  media?: SideMedia;
  mediaArea?: Area;
  avatar?: { x: number; y: number; d: number };
}

/** Resolves the optional side image or linked image of a side statement slide. */
export function sideMedia(d: StatementSlide): SideMedia | undefined {
  if (d.imageSrc)
    return { src: d.imageSrc, alt: d.imageAlt, href: undefined, round: Boolean(d.attribution) };
  if (d.linkedImage)
    return {
      src: d.linkedImage.src,
      alt: d.linkedImage.alt,
      href: d.linkedImage.href,
      round: false,
    };
  return undefined;
}

/** Builds the kicker, optional standalone crossed-out claim, and display lines for a side
 *  statement. */
export function sideHeadingParas(look: Look, d: StatementSlide): Para[] {
  const { c } = look;
  const paras: Para[] = d.lines.map((l) => ({
    runs: lineRuns(l, d, look),
    mono: true,
    bold: true,
    rel: PT.s8 / PT.base,
    after: 0,
  }));
  // The crossed-out claim stands above the statement, as the kicker of the web slide.
  const crossedText = d.crossedOut;
  const standalone =
    crossedText && !d.lines.some((l) => l.includes(crossedText)) ? crossedText : undefined;
  const crossed = standalone ? 1 : 0;
  if (standalone) {
    paras.unshift({
      runs: [{ text: standalone, options: { strike: "sngStrike", color: c.muted } }],
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
  return paras;
}

/** Builds the optional subtitle and numbered points paragraphs of a side statement. */
export function sideSupportParas(d: StatementSlide, c: Palette): Para[] {
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
  return support;
}

/** Builds the optional closing paragraph of a side statement, quoted or plain. */
export function sideClosingPara(
  d: Pick<StatementSlide, "closing" | "closingStyle">,
  c: Palette,
): Para[] {
  if (!d.closing) return [];
  const quoted = d.closingStyle === "quote";
  return [
    {
      runs: md(quoted ? `“${d.closing}”` : d.closing, c, quoted ? { italic: true } : {}),
      bold: !quoted,
      rel: PT.lead / PT.base,
      after: 4,
    },
  ];
}

/** Assembles all body paragraphs of a side statement, ordering attribution after the quoted
 *  words and before the slide's own supporting text. */
export function sideBodyParas(look: Look, d: StatementSlide): Para[] {
  const { c } = look;
  const paras = sideHeadingParas(look, d);
  const support = sideSupportParas(d, c);
  const closing = sideClosingPara(d, c);
  if (d.attribution) {
    // The name follows the words said, the lines and a quoted closing; the slide's own words
    // come after it.
    const quoted = d.closingStyle === "quote";
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
  } else {
    paras.push(...support, ...closing);
  }
  return paras;
}

/** Computes the text box, footer, and optional side picture or avatar geometry of a side
 *  statement slide. */
export function sideStatementLayout(look: Look, d: StatementSlide): SideStatementLayout {
  const { c } = look;
  const media = sideMedia(d);
  const imgW = media ? CW * 0.38 : 0;
  const w = CW - imgW - (imgW ? 0.4 : 0);
  const foot = footerOf(look, d.footer);
  const h = BOTTOM - TOP - foot.h;
  const area: Area = { x: EDGE, y: TOP, w, h };
  const o: BoxOpts = {
    size: PT.base,
    color: c.ink,
    // A quotation and a closing with a QR code stand at the left edge, as on the slide.
    align: d.attribution ? "left" : "center",
    valign: "middle",
    line: 1.2,
    floor: 0.5,
  };
  const paras = sideBodyParas(look, d);
  if (!media) return { paras, area, o, foot };
  // A quotation's portrait is round at the web's size, 384 px at 1920, centred in the side.
  const x = EDGE + w + 0.4;
  if (media.round) {
    const r = 384 / 144;
    return {
      paras,
      area,
      o,
      foot,
      media,
      avatar: { x: x + (imgW - r) / 2, y: TOP + (h - r) / 2, d: r },
    };
  }
  return { paras, area, o, foot, media, mediaArea: { x, y: TOP, w: imgW, h } };
}

/** Draws a side statement slide from its measured layout. */
export function drawSideStatement(sheet: Sheet, d: StatementSlide): void {
  const layout = sideStatementLayout(sheet, d);
  sheet.box(layout.paras, layout.area, layout.o);
  footer(sheet, layout.foot);
  if (!layout.media) return;
  const metadata = { alt: layout.media.alt, href: layout.media.href };
  if (layout.avatar) {
    sheet.avatar(layout.media.src, layout.avatar, metadata);
  } else if (layout.mediaArea) {
    sheet.picture(layout.media.src, layout.mediaArea, metadata);
  }
}
