import { leadingWords, minus, numbersGrid } from "../../../lib/figure-layout";
import { SANS } from "../faces";
import type { Look } from "../look";
import { PT, REM, type Measure } from "../stage";
import { md, type BoxOpts, type Para } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

/** A numbers block as `Numbers` sets it: the grid `numbersGrid` picks, each figure at its one size
 *  with any leading words small, a rule over the label in one row, the label, its note. */
function numbersLayout(look: Look, b: Block<"numbers">, { w, k }: Measure) {
  const { c } = look;
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
    return { figure, paras, h: look.need(paras, cw, o) };
  });
  const rows = Math.ceil(cells.length / cols);
  const rowH = Array.from(
    { length: rows },
    (_, r) =>
      fig + over + Math.max(...cells.slice(r * cols, r * cols + cols).map((cell) => cell.h)),
  );
  const sourceGap = (wrapped ? 4 : 2.5) * REM * k;
  const sourceH = b.source ? sourceGap + look.need(b.source, w, { ...o, size: PT.sm * k }) : 0;
  let y = 0;
  const placed = cells.map((cell, i) => {
    const [r, col] = [Math.floor(i / cols), i % cols];
    if (col === 0 && r) y += rowH[r - 1] + gapY;
    return { ...cell, x: col * (cw + gapX), y };
  });
  const h = rowH.reduce((sum, rh) => sum + rh, 0) + gapY * (rows - 1) + sourceH;
  return { cells: placed, cw, fig, over, figO, o, rule: !wrapped, sourceGap, sourceH, h };
}

export const numbers: BlockKind<"numbers"> = {
  height(look, b, m) {
    return numbersLayout(look, b, m).h;
  },
  draw(sheet, b, { area: a, k, centered }) {
    const { slide: s, c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const L = numbersLayout(sheet, b, { w: a.w, k });
    L.cells.forEach((cell) => {
      const [x, y] = [a.x + cell.x, a.y + cell.y];
      sheet.box(cell.figure, { x, y, w: L.cw, h: L.fig }, L.figO);
      if (L.rule)
        s.addShape("line", {
          x,
          y: y + L.fig + 1.5 * REM * k,
          w: L.cw,
          h: 0,
          line: { color: c.border, width: 2 * k },
        });
      sheet.box(cell.paras, { x, y: y + L.fig + L.over, w: L.cw, h: cell.h }, L.o);
    });
    if (b.source)
      sheet.box(
        b.source,
        { x: a.x, y: a.y + L.h - L.sourceH + L.sourceGap, w: a.w, h: L.sourceH - L.sourceGap },
        {
          ...o,
          size: PT.sm * k,
          color: c.muted,
        },
      );
  },
};
