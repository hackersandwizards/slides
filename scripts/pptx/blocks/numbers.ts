import { leadingWords, minus, numbersGrid } from "../../../lib/figure-layout";
import { SANS } from "../faces";
import type { Look } from "../look";
import { PT, REM, type Measure } from "../stage";
import { md, type BoxOpts, type Para, type TextProps } from "../text";
import { rowGrid, type GridSlot } from "./grid";
import { bodyO, type Block, type BlockKind } from "./kind";

export type NumbersMode = "single" | "wrapped";

interface NumbersStyleSpec {
  gapX: number;
  gapY: (cols: number) => number;
  overRem: number;
  overRulePx: number;
  bodyLine: number;
  labelAfterRem: number;
  sourceGapRem: number;
  boldLabel: boolean;
  rule: boolean;
}

const NUMBERS_STYLES: Record<NumbersMode, NumbersStyleSpec> = {
  single: {
    gapX: 3.5,
    gapY: () => 3,
    overRem: 3,
    overRulePx: 4,
    bodyLine: 1.375,
    labelAfterRem: 0.75,
    sourceGapRem: 2.5,
    boldLabel: false,
    rule: true,
  },
  wrapped: {
    gapX: 4,
    gapY: (cols) => (cols === 3 ? 7 : 4),
    overRem: 1,
    overRulePx: 0,
    bodyLine: 1.25,
    labelAfterRem: 0.25,
    sourceGapRem: 4,
    boldLabel: true,
    rule: false,
  },
};

export interface NumberCellLayout {
  figure: Para;
  paras: Para[];
  textH: number;
  h: number;
}

export interface NumbersLayout {
  cells: (NumberCellLayout & GridSlot & { x: number })[];
  cw: number;
  fig: number;
  over: number;
  figO: BoxOpts;
  o: BoxOpts;
  rule: boolean;
  sourceGap: number;
  sourceH: number;
  h: number;
}

/** Splits a figure's leading words into a smaller prefix run and normalises a leading minus. */
export function figurePara(raw: string, leadStyle: TextProps): Para {
  const lead = leadingWords(raw);
  const value = minus(raw.slice(lead.length));
  return {
    runs: [...(lead ? [{ text: `${lead.trim()} `, options: leadStyle }] : []), { text: value }],
  };
}

/** A numbers block as `Numbers` sets it: the grid `numbersGrid` picks, each figure at its one size
 *  with any leading words small, a rule over the label in one row, the label, its note. */
export function numbersLayout(look: Look, b: Block<"numbers">, { w, k }: Measure): NumbersLayout {
  const { c } = look;
  const { cols, wrapped, size } = numbersGrid(b.items.map((i) => i.value));
  const style = NUMBERS_STYLES[wrapped ? "wrapped" : "single"];
  const gapX = style.gapX * REM * k;
  const gapY = style.gapY(cols) * REM * k;
  const cw = (w - gapX * (cols - 1)) / cols;
  const pt = size * REM * 72 * k;
  const fig = pt / 72;
  // Above the label: the rule between two gaps in one row, a small gap where the figures wrap.
  const over = style.overRem * REM * k + style.overRulePx / 144;
  const figO: BoxOpts = {
    size: pt,
    mono: true,
    bold: true,
    color: c.teal,
    line: 1,
    tracking: -0.025,
    floor: 1,
  };
  const o = bodyO(c, k, { line: style.bodyLine });
  const leadStyle: TextProps = wrapped
    ? { fontFace: SANS, bold: false, color: c.muted, fontSize: Math.round(PT.lead * k * 2) / 2 }
    : { fontSize: Math.round(pt * 0.55 * 2) / 2 };
  const measured = b.items.map((it): NumberCellLayout => {
    const figure = figurePara(it.value, leadStyle);
    const paras: Para[] = [
      {
        runs: md(it.label, c),
        rel: PT.lead / PT.base,
        bold: style.boldLabel,
        after: style.labelAfterRem * REM * 72 * k,
      },
      ...(it.text ? [{ runs: md(it.text, c, { color: c.muted }), line: 1.375 }] : []),
    ];
    const textH = look.need(paras, cw, o);
    return { figure, paras, textH, h: fig + over + textH };
  });
  const grid = rowGrid(measured, cols, gapY);
  const cells = grid.cells.map((cell) => ({ ...cell, x: cell.col * (cw + gapX) }));
  const sourceGap = style.sourceGapRem * REM * k;
  const sourceH = b.source ? sourceGap + look.need(b.source, w, { ...o, size: PT.sm * k }) : 0;
  const h = grid.h + sourceH;
  return { cells, cw, fig, over, figO, o, rule: style.rule, sourceGap, sourceH, h };
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
      sheet.box(cell.paras, { x, y: y + L.fig + L.over, w: L.cw, h: cell.textH }, L.o);
    });
    if (b.source)
      sheet.box(
        b.source,
        { x: a.x, y: a.y + L.h - L.sourceH + L.sourceGap, w: a.w, h: L.sourceH - L.sourceGap },
        { ...o, size: PT.sm * k, color: c.muted },
      );
  },
};
