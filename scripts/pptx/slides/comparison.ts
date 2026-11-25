import type { ComparisonSide, Slide } from "../../../types/slide";
import {
  beforeAfterLayout,
  drawBeforeAfter,
  highlightPara,
  type BeforeAfterMode,
} from "../blocks/before-after";
import { header } from "../chrome";
import { textWidth } from "../fit";
import { drySheet, type Sheet } from "../sheet";
import { W, CW, PT, TITLE, REM, BODY } from "../stage";
import { md, plain, type Para, type BoxOpts } from "../text";

/** A two-sided comparison's punchline and footnotes under its sides from y, as the web sets them:
 *  the punchline 2.5 rem under in a 48 rem column, balanced, the footnotes 1.5 rem under that in a
 *  56 rem column. Draws where `s` is given; returns the height. */
function comparisonFoot(sheet: Sheet, d: { punchline?: string; footnotes?: string[] }, y: number) {
  const { c } = sheet;
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
  const ph = d.punchline ? sheet.need(punch, pw, punchO) : 0;
  const nh = notes.length ? sheet.need(notes, nw, noteO) : 0;
  let h = 0;
  if (ph) {
    h += 2.5 * REM;
    if (!sheet.dry) sheet.box(punch, { x: (W - pw) / 2, y: y + h, w: pw, h: ph }, punchO);
    h += ph;
  }
  if (nh) {
    h += 1.5 * REM;
    if (!sheet.dry) sheet.box(notes, { x: (W - nw) / 2, y: y + h, w: nw, h: nh }, noteO);
    h += nh;
  }
  return h;
}

export function drawComparison(
  sheet: Sheet,
  d: Exclude<Extract<Slide, { type: "comparison" }>, { variant: "guidance" | "positions" }>,
): void {
  const { c } = sheet;
  const y = header(sheet, d);
  const footH = comparisonFoot(drySheet(sheet), d, 0);
  const area = BODY(y);
  const sides = [d.left, d.right];
  const variant = d.variant ?? "vs";
  // The sides, punchline and footnotes stand as one group where the web's slide body puts it.
  const place = (ch: number) => area.y + Math.max(0, area.h - ch - footH) / 2.25;
  if (variant === "before-after") {
    const mode: BeforeAfterMode = d.strike !== false ? "replace" : d.adds ? "add" : "transition";
    const layout = beforeAfterLayout(
      sheet,
      { before: d.left, after: d.right, mode },
      { w: area.w, k: 1 },
    );
    const ch = Math.min(area.h - footH, layout.h);
    const top = place(ch);
    drawBeforeAfter(sheet, layout, { ...area, y: top, h: ch });
    comparisonFoot(sheet, d, top + ch);
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
    const th = sheet.need(label(sd), cw - 2 * pad, titleO);
    const ih = sheet.need(items(sd), cw - 2 * pad, itemO);
    return { th, ih, h: 2 * pad + (sd.logo ? logoH : 0) + th + 1.5 * REM + ih };
  });
  const ch = Math.min(area.h - footH, Math.max(...parts.map((p) => p.h)));
  const top = place(ch);
  sides.forEach((sd, i) => {
    const x = area.x + i * (cw + gap);
    sheet.card({ x, y: top, w: cw, h: ch }, vs ? sheet.c.litCard : sheet.c.plainCard);
    let ty = top + pad;
    if (sd.logo) {
      sheet.picture(
        sd.logo,
        { x: x + pad, y: ty, w: 1.4, h: 48 / 144 },
        {
          align: "left",
          alt: plain(sd.label),
        },
      );
      ty += logoH;
    }
    sheet.box(label(sd), { x: x + pad, y: ty, w: cw - 2 * pad, h: parts[i].th }, titleO);
    ty += parts[i].th + 1.5 * REM;
    sheet.box(items(sd), { x: x + pad, y: ty, w: cw - 2 * pad, h: top + ch - pad - ty }, itemO);
  });
  comparisonFoot(sheet, d, top + ch);
}
