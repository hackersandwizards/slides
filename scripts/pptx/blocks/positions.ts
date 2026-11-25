import { drySheet, type Sheet } from "../sheet";
import { LEADING, PT, REM, TITLE } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import type { Block, BlockKind } from "./kind";

/** Two stances and their resolution as the web's `Positions`: in a 72 rem column, each stance on
 *  a card under its holder's name, its quote under it, then the middle word and the resolution as
 *  a display line, centred. Draws where `s` is given; returns the height at scale k. */
function positions(
  sheet: Sheet,
  b: Block<"positions">,
  a: { x: number; y: number; w: number },
  k: number,
): number {
  const { c } = sheet;
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
      const ph = sheet.need(p, pw, o);
      if (!sheet.dry && x !== undefined) sheet.box(p, { x, y: y + h + g, w: pw, h: ph }, o);
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
  if (!sheet.dry) {
    [b.left, b.right].forEach((sd, i) => {
      const x = x0 + i * (cw + gap);
      sheet.card({ x, y: a.y, w: cw, h: ch }, sheet.c.plainCard);
      stack(parts(sd), inner, x + pad, a.y + pad);
    });
    stack(res, w, x0, a.y + ch + 3 * rem);
  }
  return ch + 3 * rem + resH;
}

export const positionsKind: BlockKind<"positions"> = {
  height(look, b, { w, k }) {
    return positions(drySheet(look), b, { x: 0, y: 0, w }, k);
  },
  draw(sheet, b, { area: a, k }) {
    positions(sheet, b, a, k);
  },
};
