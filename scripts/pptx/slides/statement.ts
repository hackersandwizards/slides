import type { Slide } from "../../../types/slide";
import { linkLabel, qrAlt } from "../../../lib/link-labels";
import { footer, footerOf } from "../chrome";
import { MONO } from "../faces";
import { spansOf, textWidth } from "../fit";
import { wrap } from "../lines";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, BOTTOM, CW, PT, LEADING, CORNER, REM } from "../stage";
import { caps, md, type Para, type BoxOpts, type Run } from "../text";

export function drawStatement(sheet: Sheet, d: Extract<Slide, { type: "statement" }>): void {
  const { c } = sheet;
  // The picture beside the statement, as the slide picks it: a quotation keeps its portrait and
  // drops a QR code, and a screenshot's or QR code's link is on the picture.
  const qr = !d.attribution && d.qr;
  const side = qr
    ? { src: qr.src, alt: qrAlt(qr.href, sheet.lang), href: qr.href }
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
        options: m === d.highlighted ? { color: c.teal } : { strike: "sngStrike", color: c.muted },
      });
      rest = rest.slice(i + m.length);
    }
    return out;
  };
  if (!side && !d.attribution) {
    // As the web's centred statement: the kicker, each line a display heading balanced on its
    // own, 64 pt where nothing else stands, 48 pt otherwise, the subtitle in its narrower column,
    // the points and closing under it, all centred in the slide or above its footer.
    const foot = footerOf(sheet, d.footer);
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
    // The points as one list as wide as its longest point, centred, each its number in teal
    // mono a step larger; the closing centred under it, as the web's `w-fit` list.
    if (d.points?.length) {
      const pointO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.375 };
      const number = (i: number) => `${String(i + 1).padStart(2, "0")}\u00a0`;
      const paras = d.points.map((pt, i) => ({
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
      parts.push([paras, pointO, Math.min(w, 56 * REM, longestPoint), 3.5 * REM]);
    }
    if (d.closing) {
      const quoted = d.closingStyle === "quote";
      const mark = { color: mixColor(c.teal, c.bg, 0.7) };
      parts.push([
        [
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
        { size: quoted ? PT.lead : PT.h3, color: c.ink, line: 1.375, align: "center" },
        Math.min(w, 56 * REM),
        2.5 * REM,
      ]);
    }
    const heights = parts.map(([p, o, pw]) => sheet.need(p, pw, o));
    const total = heights.reduce((sum, h, i) => sum + h + parts[i][3], 0);
    const [top, bottom] = d.footer ? [TOP, BOTTOM - foot.h - 0.1] : [0, BOTTOM];
    let y = top + Math.max(0, (bottom - top - total) / 2);
    parts.forEach(([p, o, pw, gap], i) => {
      y += gap;
      sheet.box(p, { x: (W - pw) / 2, y, w: pw, h: heights[i] }, o);
      y += heights[i];
    });
    footer(sheet, foot);
    return;
  }
  if (qr) {
    // As QrStatement: the words at the left, the code on the right in a white card whose padding
    // is its quiet zone, its address under it, the row top-aligned and centred above the footer.
    const foot = footerOf(sheet, d.footer);
    const q = (0.45 * 1.15 * 1080) / 144;
    const label = `↗ ${linkLabel(qr.href)}`;
    const colW = Math.max(q, textWidth(label, { size: PT.base, mono: true }) + 0.1);
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
    const heights = parts.map(([p, o]) => sheet.need(p, w, o));
    const textH = heights.reduce((sum, h, i) => sum + h + parts[i][2], 0);
    const labelH = sheet.need(label, colW, { size: PT.base, mono: true, color: c.teal });
    const figH = q + REM + labelH;
    const bottom = BOTTOM - foot.h - (d.footer ? 0.1 : 0);
    const top = TOP + Math.max(0, (bottom - TOP - Math.max(textH, figH)) / 2);
    let y = top;
    parts.forEach(([p, o, gap], i) => {
      y += gap;
      sheet.box(p, { x: EDGE, y, w, h: heights[i] }, o);
      y += heights[i];
    });
    const x = W - EDGE - colW + (colW - q) / 2;
    const pad = 2.5 * REM;
    sheet.rounded({ x, y: top, w: q, h: q }, { fill: "FFFFFF", line: c.border }, CORNER);
    sheet.picture(
      qr.src,
      { x: x + pad, y: top + pad, w: q - 2 * pad, h: q - 2 * pad },
      {
        alt: qrAlt(qr.href, sheet.lang),
        href: qr.href,
      },
    );
    sheet.box(
      { runs: [{ text: label, options: { hyperlink: { url: qr.href } } }] },
      { x: W - EDGE - colW, y: top + q + REM, w: colW, h: labelH },
      { size: PT.base, mono: true, color: c.teal, align: "center" },
    );
    footer(sheet, foot);
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
  const foot = footerOf(sheet, d.footer);
  sheet.box(paras, { x: EDGE, y: TOP, w, h: BOTTOM - TOP - foot.h }, o);
  footer(sheet, foot);
  if (side) {
    // A quotation's portrait is round at the web's size, 384 px at 1920, centred in the side.
    const [x, h] = [EDGE + w + 0.4, BOTTOM - TOP - foot.h];
    const r = "round" in side && side.round ? 384 / 144 : 0;
    const metadata = { alt: side.alt, href: side.href };
    if (r) {
      sheet.avatar(side.src, { x: x + (imgW - r) / 2, y: TOP + (h - r) / 2, d: r }, metadata);
    } else {
      sheet.picture(side.src, { x, y: TOP, w: imgW, h }, metadata);
    }
  }
}
