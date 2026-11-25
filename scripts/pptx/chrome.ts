import type { Presentation, SectionTheme, Slide } from "../../types/slide";
import { HW_LOGO, cornerMark, logoPlaces, resolveSlideLogo } from "../../lib/logo";
import { pageLabel } from "../../lib/slide-framing";
import { chip, chipWidth } from "./chips";
import { textWidth } from "./fit";
import { brandCut } from "./images";
import type { Look } from "./look";
import { mixColor } from "./palette";
import type { Sheet } from "./sheet";
import { BOTTOM, CW, EDGE, H, LEADING, PT, REM, TOP, W } from "./stage";
import { caps, type BoxOpts } from "./text";

/** Whether a closing stands the h&w lockup in its centre column and none in the corner, as the
 *  web's `.slide-closing-mark` does on a contact closing without portraits. */
export const centredMark = (d: Extract<Slide, { type: "closing" }>) =>
  d.variant !== "discussion" && !d.speakers?.some((sp) => sp.imageSrc);

export interface Head {
  sectionLabel?: string;
  sectionTheme?: SectionTheme;
  principle?: string;
  headline?: string;
  subtitle?: string;
  preText?: string;
}

/** The brand strip and footer, where the web stands them. */
export function frame(sheet: Sheet, deck: Presentation, index: number) {
  const { slide: s } = sheet;
  const { c } = sheet;
  s.background = { color: c.bg };
  // The strip's teal-to-purple gradient as twenty-four steps, since a pptxgenjs shape takes no
  // gradient fill.
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    // Each step overlaps the next by a hundredth, so no seam shows; the last ends at the edge.
    const x = (W / steps) * i;
    sheet.rect(
      { x, y: 0, w: Math.min(W / steps + 0.01, W - x), h: 16 / 144 },
      mixColor(c.purple, c.teal, i / (steps - 1)),
    );
  }
  const slide = deck.slides[index];
  const mark = cornerMark(deck, index);
  const closingCentred = slide.type === "closing" && centredMark(slide);
  const markH = 42 / 144;
  const lockupH = 65 / 144;
  const right = W - 96 / 144;
  const baseY = 1024 / 144;
  const confidential = deck.confidential?.trim();
  let end = right;
  const { corner, start } = logoPlaces(resolveSlideLogo(deck, index));
  // `h-9`, as the slide draws a deck's logos.
  const logoH = 2.25 * REM;
  // A closing that stands the h&w lockup in its centre column hides the corner, counter included,
  // as ClosingSlide.css does.
  if (!closingCentred) {
    let x: number;
    if (corner.src === HW_LOGO.src) {
      const [path, ratio] = brandCut(`${mark}${sheet.dark ? "-night" : ""}`);
      const h = mark === "lockup" ? lockupH : markH;
      x = right - h * ratio;
      s.addImage({ path, x, y: baseY - h / 2, w: h * ratio, h, altText: HW_LOGO.alt });
    } else {
      const at = { alt: corner.alt, align: "right" as const };
      x = sheet.picture(
        corner.src,
        { x: right - 2.4, y: baseY - logoH / 2, w: 2.4, h: logoH },
        at,
      ).x;
    }
    const page = pageLabel(deck.slides, index);
    end = x;
    if (page) {
      end -= 1.8;
      sheet.box(
        { runs: [{ text: page }] },
        { x: x - 1.8, y: baseY - 0.14, w: 1.6, h: 0.28 },
        {
          size: PT.label,
          mono: true,
          bold: true,
          color: c.muted,
          align: "right",
          valign: "middle",
        },
      );
    }
  }
  // A deck with a footer line moves the start logos onto the corner's centre line.
  let left = confidential ? W - right : 1.5 * REM;
  const y = confidential ? baseY - logoH / 2 : H - 1.5 * REM - logoH;
  for (const l of start) {
    const drawn = sheet.picture(
      l.src,
      { x: left, y, w: 2.4, h: logoH },
      {
        alt: l.alt,
        align: "left",
      },
    );
    left += drawn.w + 1.25 * REM;
  }
  if (confidential && end > left + 1.25 * REM) {
    sheet.box(
      { runs: [{ text: confidential }] },
      { x: left, y: baseY - 0.14, w: end - left - 1.25 * REM, h: 0.28 },
      {
        size: PT.label,
        color: c.muted,
        valign: "middle",
      },
    );
  }
  if (slide.notes) s.addNotes(slide.notes);
}

/** Kicker, principle pill, title and subtitle; returns where the body starts. */
export function header(sheet: Sheet, h: Head, centered = false): number {
  const { c } = sheet;
  let y = 58 / 144;
  // The kicker band's second row, where the principle pill wraps as on the web.
  let wrapped = 0;
  const kicker = h.sectionLabel ?? h.preText;
  if (kicker || h.principle) {
    let x = EDGE;
    // Teal in every section, the website's mono caps.
    if (kicker) {
      // The web's label line, 1.4 of its size, as wide as its capitals.
      const kw =
        textWidth(kicker.toUpperCase(), { size: PT.base, mono: true, tracking: 0.06 }) + 0.02;
      sheet.box(
        { runs: [caps(kicker)] },
        { x, y: 0.38, w: Math.min(kw, CW), h: 0.35 },
        {
          size: PT.base,
          mono: true,
          color: c.teal,
          tracking: 0.06,
          valign: "middle",
          line: 1.4,
        },
      );
      x += kw + 0.18;
    }
    if (h.principle) {
      // On the print route a wrapped pill stands 65 px below the label's row, the title 76 px.
      const row = x + chipWidth(h.principle, PT.sm, false) > W - EDGE ? 65 / 144 : 0;
      if (row) {
        wrapped = 76 / 144;
        x = EDGE;
      }
      chip(
        sheet,
        { text: h.principle, size: PT.sm, fill: c.tint, color: c.ink, mono: false },
        { x, y: y + row + 0.02 },
      );
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
    const hh = Math.min(1.1, sheet.need(h.headline, CW, o));
    sheet.box(h.headline, { x: EDGE, y, w: CW, h: Math.max(hh, 0.45) }, o);
    y += Math.max(hh, 0.45) + 0.08;
  }
  if (h.subtitle) {
    const o: BoxOpts = { size: PT.base, color: c.muted, align: centered ? "center" : "left" };
    const sh = Math.min(0.7, sheet.need(h.subtitle, CW, o));
    sheet.box(h.subtitle, { x: EDGE, y, w: CW, h: sh }, o);
    y += sh;
  }
  return y + 0.3;
}

export interface Footer {
  text?: string;
  h: number;
  centered?: boolean;
}

/** The height a slide's footer takes above the bottom edge: its line under a rule. */
export function footerOf(look: Look, text?: string): Footer {
  const h = text
    ? Math.min(0.6, look.need(text, CW, { size: PT.base, color: look.c.ink })) + 0.25
    : 0;
  return { text, h };
}

export function footer(sheet: Sheet, foot: Footer): void {
  footerAt(sheet, foot, BOTTOM - foot.h);
}

/** The slide's footer (`SlideFooter` on the web): one line under a rule, at the bottom or at
 *  `top`, where it follows the body. */
export function footerAt(sheet: Sheet, { text, h, centered }: Footer, top: number): void {
  const { slide: s } = sheet;
  if (!text) return;
  s.addShape("line", {
    x: EDGE,
    y: top + 0.05,
    w: CW,
    h: 0.001,
    line: { color: sheet.c.border, width: 0.75 },
  });
  sheet.box(
    text,
    { x: EDGE, y: top + 0.15, w: CW, h: h - 0.15 },
    {
      size: PT.base,
      color: sheet.c.ink,
      align: centered ? "center" : "left",
    },
  );
}
