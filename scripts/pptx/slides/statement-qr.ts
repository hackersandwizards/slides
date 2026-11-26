import { linkLabel, qrAlt } from "../../../lib/link-labels";
import type { StatementSlide } from "../../../types/slide";
import { footer, footerOf, type Footer } from "../chrome";
import { MONO } from "../faces";
import { textWidth } from "../fit";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { BOTTOM, CORNER, CW, EDGE, LEADING, PT, REM, TOP, W, type Area } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import { lineRuns } from "./statement-centred";

export interface QrStatementPart {
  paras: Para[];
  o: BoxOpts;
  gap: number;
}

export interface QrStatementBox {
  paras: Para[];
  o: BoxOpts;
  area: Area;
}

export interface QrStatementLayout {
  src: string;
  alt: string;
  href: string;
  boxes: QrStatementBox[];
  card: Area;
  picture: Area;
  label: string;
  labelArea: Area;
  foot: Footer;
}

/** Builds the stacked text parts on the left side of a QR statement slide. */
export function qrStatementParts(look: Look, d: StatementSlide): QrStatementPart[] {
  const { c } = look;
  const parts: QrStatementPart[] = [];
  const support: BoxOpts = { size: PT.h3, color: c.ink, line: 1.375 };
  if (d.kicker)
    parts.push({
      paras: [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
      o: { size: PT.sm, mono: true, color: c.tealDark, tracking: 0.06, line: 1.4 },
      gap: 0,
    });
  parts.push({
    paras: d.lines.map((l) => ({ runs: lineRuns(l, d, look), balance: true })),
    o: {
      size: PT.s8,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
    },
    gap: parts.length ? 1.5 * REM : 0,
  });
  if (d.subtitle) parts.push({ paras: [{ runs: md(d.subtitle, c) }], o: support, gap: 1.5 * REM });
  if (d.points?.length)
    parts.push({
      paras: d.points.map((pt, i) => ({
        runs: [
          {
            text: `${String(i + 1).padStart(2, "0")}  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(pt, c, { color: c.muted }),
        ],
        after: 1.25 * REM * 72,
      })),
      o: { size: PT.base, color: c.muted, line: 1.375 },
      gap: 2 * REM,
    });
  if (d.closing) {
    const quoted = d.closingStyle === "quote";
    parts.push({
      paras: [{ runs: md(quoted ? `“${d.closing}”` : d.closing, c), bold: true }],
      o: support,
      gap: 1.5 * REM,
    });
  }
  return parts;
}

/** Measures the left text column, right QR card and link label, and optional footer of a QR
 *  statement slide. */
export function qrStatementLayout(look: Look, d: StatementSlide): QrStatementLayout | undefined {
  const { c } = look;
  const qr = d.qr;
  if (!qr) return undefined;
  // As QrStatement: the words at the left, the code on the right in a white card whose padding
  // is its quiet zone, its address under it, the row top-aligned and centred above the footer.
  const foot = footerOf(look, d.footer);
  const q = (0.45 * 1.15 * 1080) / 144;
  const label = `↗ ${linkLabel(qr.href)}`;
  const colW = Math.max(q, textWidth(label, { size: PT.base, mono: true }) + 0.1);
  const w = CW - colW - 5 * REM;
  const parts = qrStatementParts(look, d);
  const heights = parts.map((part) => look.need(part.paras, w, part.o));
  const textH = heights.reduce((sum, h, i) => sum + h + parts[i].gap, 0);
  const labelH = look.need(label, colW, { size: PT.base, mono: true, color: c.teal });
  const figH = q + REM + labelH;
  const bottom = BOTTOM - foot.h - (d.footer ? 0.1 : 0);
  const top = TOP + Math.max(0, (bottom - TOP - Math.max(textH, figH)) / 2);
  let y = top;
  const boxes = parts.map((part, i): QrStatementBox => {
    y += part.gap;
    const area: Area = { x: EDGE, y, w, h: heights[i] };
    y += heights[i];
    return { paras: part.paras, o: part.o, area };
  });
  const x = W - EDGE - colW + (colW - q) / 2;
  const pad = 2.5 * REM;
  return {
    src: qr.src,
    alt: qrAlt(qr.href, look.lang),
    href: qr.href,
    boxes,
    card: { x, y: top, w: q, h: q },
    picture: { x: x + pad, y: top + pad, w: q - 2 * pad, h: q - 2 * pad },
    label,
    labelArea: { x: W - EDGE - colW, y: top + q + REM, w: colW, h: labelH },
    foot,
  };
}

/** Draws a QR statement slide from its measured layout. */
export function drawQrStatement(sheet: Sheet, d: StatementSlide): void {
  const layout = qrStatementLayout(sheet, d);
  if (!layout) return;
  for (const box of layout.boxes) sheet.box(box.paras, box.area, box.o);
  sheet.rounded(layout.card, { fill: "FFFFFF", line: sheet.c.border }, CORNER);
  sheet.picture(layout.src, layout.picture, { alt: layout.alt, href: layout.href });
  sheet.box(
    { runs: [{ text: layout.label, options: { hyperlink: { url: layout.href } } }] },
    layout.labelArea,
    { size: PT.base, mono: true, color: sheet.c.teal, align: "center" },
  );
  footer(sheet, layout.foot);
}
