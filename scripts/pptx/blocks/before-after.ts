import type { Look } from "../look";
import { mixColor } from "../palette";
import type { PSlide, Sheet } from "../sheet";
import { PT, TITLE, type Area } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import { bodyO, type BlockKind } from "./kind";

/** The web's circle-x or circle-check icon at x, y in diameter d, drawn in lines. */
function circleMark(s: PSlide, x: number, y: number, d: number, color: string, check: boolean) {
  const line = { color, width: 1.5 };
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { type: "none" }, line });
  const strokes = check
    ? [
        [0.3, 0.52, 0.45, 0.67],
        [0.45, 0.67, 0.72, 0.36],
      ]
    : [
        [0.35, 0.35, 0.65, 0.65],
        [0.65, 0.35, 0.35, 0.65],
      ];
  for (const [x1, y1, x2, y2] of strokes)
    s.addShape("line", {
      x: x + d * Math.min(x1, x2),
      y: y + d * Math.min(y1, y2),
      w: d * Math.abs(x2 - x1),
      h: d * Math.abs(y2 - y1),
      flipV: (x2 - x1) * (y2 - y1) < 0,
      line,
    });
}

type BeforeAfterSide = { label: string; items: string[]; highlight?: string };

/** A two-sided comparison side's highlight, as the web's caps label under the side's title. */
export const highlightPara = (text: string, color: string): Para => ({
  runs: [caps(text, { color })],
  mono: true,
  bold: true,
  rel: 0.8,
  after: 8,
});

/** Side i of a before-after in width w: its label row, with the web's circle icon on an after
 *  side that does not add and on a struck before side, and its highlight and plain items under it, struck through
 *  on a struck before side, with the heights both need. */
function beforeAfterSide(
  look: Look,
  sd: BeforeAfterSide,
  i: number,
  strike: boolean,
  w: number,
  o: BoxOpts,
  k: number,
  adds: boolean,
) {
  const { c } = look;
  const tone = i ? c.teal : c.muted;
  const icon = (i && !adds) || (!i && strike) ? (o.size * 1.3) / 72 : 0;
  const indent = icon && icon + 0.12;
  const item = !i && strike ? { color: c.muted, strike: "sngStrike" as const } : {};
  // The web prints a before-after label as typed.
  const label: Para = {
    runs: [{ text: sd.label, options: { color: tone } }],
    ...TITLE,
    rel: PT.h4 / PT.base,
  };
  const rest = [
    ...(sd.highlight ? [highlightPara(sd.highlight, tone)] : []),
    ...sd.items.map((it) => ({ runs: md(it, c, item), after: 6 })),
  ];
  const inner = w - 2 * BA_PAD * k;
  return {
    tone,
    icon,
    indent,
    label,
    rest,
    labelH: Math.max(icon, look.need(label, inner - indent, o)),
    restH: look.need(rest, inner, o),
  };
}

const BA_PAD = 0.25;
const BA_GAP = 0.7;

export function beforeAfterHeight(
  look: Look,
  sides: BeforeAfterSide[],
  strike: boolean,
  w: number,
  o: BoxOpts,
  k = 1,
  adds = false,
) {
  return Math.max(
    ...sides.map((sd, i) => {
      const l = beforeAfterSide(look, sd, i, strike, (w - BA_GAP * k) / 2, o, k, adds);
      return (2 * BA_PAD + 0.15 + 0.1) * k + l.labelH + l.restH;
    }),
  );
}

/** The before and the after side by side with an arrow between, as the web's BeforeAfterSides
 *  draws a comparison's `before-after` and the transform block: plain items, the before side
 *  muted on white and, with `strike`, crossed out, struck through and greyed. */
export function beforeAfter(
  sheet: Sheet,
  a: Area,
  o: BoxOpts,
  sides: BeforeAfterSide[],
  strike: boolean,
  k = 1,
  adds = false,
) {
  const { slide: s } = sheet;
  const { c } = sheet;
  // The web shrinks a block whole: its paddings and gap with its text.
  const pad = BA_PAD * k;
  const gap = BA_GAP * k;
  const half = (a.w - gap) / 2;
  sides.forEach((sd, i) => {
    const x = a.x + i * (half + gap);
    const l = beforeAfterSide(sheet, sd, i, strike, half, o, k, adds);
    if (i) sheet.card({ x, y: a.y, w: half, h: a.h }, sheet.c.litCard);
    else
      sheet.card(
        { x, y: a.y, w: half, h: a.h },
        { fill: strike ? mixColor(c.muted, c.bg, 0.07) : c.card, line: c.border },
      );
    const top = a.y + pad;
    if (l.icon) circleMark(s, x + pad, top + (l.labelH - l.icon) / 2, l.icon, l.tone, i === 1);
    sheet.box(
      l.label,
      { x: x + pad + l.indent, y: top, w: half - 2 * pad - l.indent, h: l.labelH },
      {
        ...o,
        valign: "middle",
      },
    );
    const ry = top + l.labelH + 0.15 * k;
    sheet.box(l.rest, { x: x + pad, y: ry, w: half - 2 * pad, h: a.y + a.h - pad - ry }, o);
  });
  const ay = a.y + a.h / 2;
  if (adds)
    sheet.box(
      "+",
      { x: a.x + half, y: ay - gap / 2, w: gap, h: gap },
      {
        size: PT.title * k,
        bold: true,
        color: c.teal,
        align: "center",
        valign: "middle",
      },
    );
  else
    sheet.arrow(
      { x: a.x + half + 0.12 * k, y: ay },
      { x: a.x + half + gap - 0.12 * k, y: ay },
      c.teal,
    );
}

export const transform: BlockKind<"transform"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return beforeAfterHeight(look, [b.before, b.after], false, w, o, k);
  },
  draw(sheet, b, { area: a, k }) {
    const { c } = sheet;
    return beforeAfter(sheet, a, bodyO(c, k), [b.before, b.after], false, k);
  },
};
