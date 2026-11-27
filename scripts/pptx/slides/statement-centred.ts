import type { StatementSlide } from "../../../types/slide";
import { footer, footerOf, type Footer } from "../chrome";
import { MONO } from "../faces";
import { spansOf } from "../fit";
import { wrap } from "../lines";
import type { Look } from "../look";
import { mixColor, type Palette } from "../palette";
import type { Sheet } from "../sheet";
import { BOTTOM, CW, LEADING, PT, REM, TOP, W, type Area } from "../stage";
import { caps, md, type BoxOpts, type Para, type Run } from "../text";

export interface CentredPart {
  paras: Para[];
  o: BoxOpts;
  w: number;
  gap: number;
}

export interface CentredStatementBox {
  paras: Para[];
  o: BoxOpts;
  area: Area;
}

export interface CentredStatementLayout {
  boxes: CentredStatementBox[];
  foot: Footer;
}

/** Splits a statement line around its optional `highlighted` and `crossedOut` substrings, styling
 *  highlighted spans in teal and crossed-out spans with a muted strikethrough. */
export function lineRuns(
  line: string,
  d: Pick<StatementSlide, "highlighted" | "crossedOut">,
  look: Look,
): Run[] {
  const { c } = look;
  const out: Run[] = [];
  const marks = [d.highlighted, d.crossedOut].filter((m): m is string => Boolean(m));
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
      options: m === d.highlighted ? { color: c.teal } : { strike: "sngStrike", color: c.muted },
    });
    rest = rest.slice(i + m.length);
  }
  return out;
}

/** Builds the numbered points block for a centred statement, fitted to its longest line up to
 *  56 rem. */
export function centredPointsPart(
  points: readonly string[],
  c: Palette,
  maxW: number,
): CentredPart {
  // The points as one list as wide as its longest point, centred, each its number in teal
  // mono a step larger; the closing centred under it, as the web's `w-fit` list.
  const pointO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.375 };
  const number = (i: number) => `${String(i + 1).padStart(2, "0")}\u00a0`;
  const paras: Para[] = points.map((pt, i) => ({
    runs: [
      {
        text: number(i),
        options: { color: c.teal, bold: true, fontFace: MONO, fontSize: PT.lead },
      },
      ...md(pt, c, { color: c.muted }),
    ],
    after: 1.25 * REM * 72,
  }));
  const longestPoint = Math.max(
    ...paras.map((p) => (wrap(spansOf(p, pointO, 1), Infinity)[0].width / 72) * 1.01 + 0.05),
  );
  return { paras, o: pointO, w: Math.min(maxW, 56 * REM, longestPoint), gap: 3.5 * REM };
}

/** Builds the optional closing block for a centred statement, quoted or plain. */
export function centredClosingPart(
  d: Pick<StatementSlide, "closing" | "closingStyle">,
  c: Palette,
  maxW: number,
): CentredPart | undefined {
  if (!d.closing) return undefined;
  const quoted = d.closingStyle === "quote";
  const mark = { color: mixColor(c.teal, c.bg, 0.7) };
  return {
    paras: [
      {
        runs: quoted
          ? [
              { text: "“", options: mark },
              ...md(d.closing, c, { color: c.muted, italic: true }),
              { text: "”", options: mark },
            ]
          : md(d.closing, c),
        bold: true,
        balance: true,
      },
    ],
    o: { size: quoted ? PT.lead : PT.h3, color: c.ink, line: 1.375, align: "center" },
    w: Math.min(maxW, 56 * REM),
    gap: 2.5 * REM,
  };
}

/** True when a centred statement carries only its display lines (and optional kicker), so the
 *  lines stand at 64 pt instead of 48 pt. */
export function isSimpleStatement(d: StatementSlide): boolean {
  return !d.points?.length && !d.closing && !d.subtitle && !d.highlighted && !d.crossedOut;
}

/** Builds the kicker, optional standalone crossed-out claim, and display lines of a centred
 *  statement. */
export function centredHeadingParts(look: Look, d: StatementSlide, maxW: number): CentredPart[] {
  const { c } = look;
  const simple = isSimpleStatement(d);
  const parts: CentredPart[] = [];
  if (d.kicker)
    parts.push({
      paras: [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
      o: {
        size: PT.sm,
        mono: true,
        color: c.tealDark,
        tracking: 0.06,
        line: 1.4,
        align: "center",
      },
      w: maxW,
      gap: 0,
    });
  const crossed = d.crossedOut;
  if (crossed && !d.lines.some((l) => l.includes(crossed)))
    parts.push({
      paras: [{ runs: [{ text: crossed, options: { strike: "sngStrike", color: c.muted } }] }],
      o: { size: PT.h3, mono: true, bold: true, color: c.muted, align: "center", line: 1.25 },
      w: maxW,
      gap: parts.length ? 2 * REM : 0,
    });
  parts.push({
    paras: d.lines.map((l) => ({ runs: lineRuns(l, d, look), balance: true })),
    o: {
      size: simple ? 64 : PT.s8,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
      align: "center",
    },
    w: maxW,
    gap: parts.length ? 2 * REM : 0,
  });
  return parts;
}

/** Builds the optional subtitle, numbered points, and closing parts under a centred statement's
 *  display lines. */
export function centredSupportParts(d: StatementSlide, c: Palette, maxW: number): CentredPart[] {
  const parts: CentredPart[] = [];
  if (d.subtitle)
    parts.push({
      paras: [{ runs: md(d.subtitle, c, { color: c.muted }), balance: true }],
      o: { size: PT.h3, color: c.muted, line: 1.375, align: "center" },
      w: Math.min(maxW, 64 * REM),
      gap: 2 * REM,
    });
  if (d.points?.length) parts.push(centredPointsPart(d.points, c, maxW));
  const closing = centredClosingPart(d, c, maxW);
  if (closing) parts.push(closing);
  return parts;
}

/** Measures and vertically centres all parts of a centred statement slide above its optional
 *  footer. */
export function centredStatementLayout(look: Look, d: StatementSlide): CentredStatementLayout {
  // As the web's centred statement: the kicker, each line a display heading balanced on its
  // own, 64 pt where nothing else stands, 48 pt otherwise, the subtitle in its narrower column,
  // the points and closing under it, all centred in the slide or above its footer.
  const foot = footerOf(look, d.footer);
  const maxW = d.footer ? CW : W - 2 * 4 * REM;
  const parts = [...centredHeadingParts(look, d, maxW), ...centredSupportParts(d, look.c, maxW)];
  const heights = parts.map((part) => look.need(part.paras, part.w, part.o));
  const total = heights.reduce((sum, h, i) => sum + h + parts[i].gap, 0);
  const [top, bottom] = d.footer ? [TOP, BOTTOM - foot.h - 0.1] : [0, BOTTOM];
  let y = top + Math.max(0, (bottom - top - total) / 2);
  const boxes = parts.map((part, i): CentredStatementBox => {
    y += part.gap;
    const area: Area = { x: (W - part.w) / 2, y, w: part.w, h: heights[i] };
    y += heights[i];
    return { paras: part.paras, o: part.o, area };
  });
  return { boxes, foot };
}

export function drawCentredStatement(sheet: Sheet, d: StatementSlide): void {
  const { boxes, foot } = centredStatementLayout(sheet, d);
  for (const box of boxes) sheet.box(box.paras, box.area, box.o);
  footer(sheet, foot);
}
