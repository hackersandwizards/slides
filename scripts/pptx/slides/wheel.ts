import type { Slide, WheelSlide } from "../../../types/slide";
import { header } from "../chrome";
import { textWidth } from "../fit";
import type { Look } from "../look";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { PT, TITLE, REM, BODY, type Area } from "../stage";
import { md, type BoxOpts } from "../text";

/** The clockwise angles and top-to-bottom segment indices on either side of the ring. */
export function wheelSides(segments: WheelSlide["segments"]) {
  const n = segments.length;
  const centres = segments.map((_, k) => -90 + (360 * (k + 0.5)) / n);
  const cos = centres.map((deg) => Math.cos((deg * Math.PI) / 180));
  const right = cos.flatMap((v, k) => (v > 1e-6 ? [k] : []));
  const left = cos.flatMap((v, k) => (v < -1e-6 ? [k] : []));
  cos.forEach((v, k) => {
    if (Math.abs(v) <= 1e-6) (right.length <= left.length ? right : left).push(k);
  });
  const sin = (k: number) => Math.sin((centres[k] * Math.PI) / 180);
  for (const list of [left, right]) list.sort((p, q) => sin(p) - sin(q));
  return { centres, left, right };
}

interface WheelSide {
  indices: number[];
  x: number;
  w: number;
}

/** Measures the full-width rows and the natural width of the left column. */
export function wheelMeasure(look: Look, d: WheelSlide, width: number) {
  // As `WheelSlide`: a ring of segments at 40 % teal, a 1.5 degree gap each side, numbered from
  // the top clockwise, the centre on a soft disc; each segment's tile, title and text on the side
  // its centre lies on, both columns against the ring.
  const { c } = look;
  const dia = 24 * REM;
  const tile = 10 * 0.25 * REM;
  const colW = (width - dia - 2 * 2 * REM) / 2;
  const textW = colW - tile - 0.75 * REM;
  const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.375 };
  const { centres, left, right } = wheelSides(d.segments);
  const heights = d.segments.map((segment) =>
    Math.max(
      tile,
      look.need(segment.title, textW, titleO) + 0.25 * REM + look.need(segment.text, textW, textO),
    ),
  );
  // The left column stands against the ring, as `justify-self-end` sets it.
  const leftW = Math.max(
    0,
    ...left.map(
      (k) =>
        tile +
        0.75 * REM +
        Math.max(
          textWidth(d.segments[k].title, { size: PT.h4, ...TITLE }),
          textWidth(d.segments[k].text, textO),
        ) +
        0.02,
    ),
  );
  return { dia, tile, colW, textW, titleO, textO, centres, left, right, heights, leftW };
}

/** Positions the measured wheel and its two columns around the shared centre. */
export function wheelLayout(look: Look, d: WheelSlide, a: Area) {
  const { c } = look;
  const { dia, tile, colW, textW, titleO, textO, centres, left, right, heights, leftW } =
    wheelMeasure(look, d, a.w);
  const colH = (list: number[]) =>
    list.reduce((sum, k, i) => sum + heights[k] + (i ? 1.75 * REM : 0), 0);
  const capO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.45 };
  const capH = d.caption ? REM + look.need(d.caption, a.w, capO) : 0;
  const h = Math.max(dia, colH(left), colH(right));
  const top = a.y + Math.max(0, a.h - h - capH) / 2.25;
  const cx = a.x + colW + 2 * REM + dia / 2;
  const cy = top + h / 2;
  return {
    dia,
    cx,
    cy,
    centres,
    heights,
    tile,
    titleO,
    textO,
    segments: d.segments,
    left: {
      indices: left,
      x: a.x + colW - Math.min(colW, leftW),
      w: Math.min(textW, leftW - tile - 0.75 * REM),
    },
    right: { indices: right, x: cx + dia / 2 + 2 * REM, w: textW },
    caption: { area: { x: a.x, y: top + h + REM, w: a.w, h: capH - REM }, o: capO },
  };
}

type WheelLayout = ReturnType<typeof wheelLayout>;

/** Places the numbered arcs in clockwise order. */
export function wheelRing(sheet: Sheet, { dia, cx, cy, centres }: WheelLayout): void {
  const { slide: s, c } = sheet;
  const n = centres.length;
  const unit = dia / 200;
  centres.forEach((centre, k) => {
    const from = -90 + (360 * k) / n + 1.5;
    const to = -90 + (360 * (k + 1)) / n - 1.5;
    s.addShape("blockArc", {
      x: cx - dia / 2,
      y: cy - dia / 2,
      w: dia,
      h: dia,
      angleRange: [(from + 360) % 360, (to + 360) % 360],
      arcThicknessRatio: 36 / 96,
      fill: { color: mixColor(c.teal, c.bg, 0.4) },
      line: { type: "none" },
    });
    const r = 78 * unit;
    const rad = (centre * Math.PI) / 180;
    sheet.box(
      { runs: [{ text: String(k + 1) }] },
      { x: cx + r * Math.cos(rad) - 0.2, y: cy + r * Math.sin(rad) - 0.15, w: 0.4, h: 0.3 },
      {
        size: Math.round(14 * unit * 72 * 2) / 2,
        bold: true,
        color: c.ink,
        align: "center",
        valign: "middle",
        line: 1,
      },
    );
  });
}

/** Draws the disc and label at the centre of the ring. */
export function wheelHub(sheet: Sheet, center: string, { dia, cx, cy }: WheelLayout): void {
  const { slide: s, c } = sheet;
  const hub = dia * 0.56;
  s.addShape("ellipse", {
    x: cx - hub / 2,
    y: cy - hub / 2,
    w: hub,
    h: hub,
    fill: { color: mixColor(c.ink, c.bg, 0.07) },
    line: { type: "none" },
  });
  sheet.box(
    { runs: md(center, c), bold: true },
    { x: cx - hub / 2 + REM, y: cy - hub / 2 + REM, w: hub - 2 * REM, h: hub - 2 * REM },
    {
      size: PT.sm,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.25,
    },
  );
}

/** Measures the title and body in this column's actual text width. */
export function wheelColumnLayout(look: Look, layout: WheelLayout, side: WheelSide) {
  const { cy, heights, segments, tile, titleO, textO } = layout;
  const { indices, x, w } = side;
  const height = indices.reduce((sum, k, i) => sum + heights[k] + (i ? 1.75 * REM : 0), 0);
  let y = cy - height / 2;
  const items = indices.map((k) => {
    const { title, text } = segments[k];
    const th = look.need(title, w, titleO);
    const item = {
      number: String(k + 1),
      title,
      text,
      tile: { x, y, w: tile, h: tile },
      titleArea: { x: x + tile + 0.75 * REM, y, w, h: th },
      textArea: {
        x: x + tile + 0.75 * REM,
        y: y + th + 0.25 * REM,
        w,
        h: look.need(text, w, textO),
      },
    };
    y += heights[k] + 1.75 * REM;
    return item;
  });
  return { items, titleO, textO };
}

/** Draws the tiles, titles and descriptions in one measured column. */
export function wheelColumn(sheet: Sheet, column: ReturnType<typeof wheelColumnLayout>): void {
  const { c } = sheet;
  for (const item of column.items) {
    sheet.rounded(item.tile, { fill: c.teal }, 10 / 144);
    sheet.box({ runs: [{ text: item.number }] }, item.tile, {
      size: 17.33,
      mono: true,
      bold: true,
      color: c.card,
      align: "center",
      valign: "middle",
      line: 1,
    });
    sheet.box(item.title, item.titleArea, column.titleO);
    sheet.box(item.text, item.textArea, column.textO);
  }
}

export function drawWheel(sheet: Sheet, d: Extract<Slide, { type: "wheel" }>): void {
  const layout = wheelLayout(sheet, d, BODY(header(sheet, d)));
  wheelRing(sheet, layout);
  wheelHub(sheet, d.center, layout);
  wheelColumn(sheet, wheelColumnLayout(sheet, layout, layout.left));
  wheelColumn(sheet, wheelColumnLayout(sheet, layout, layout.right));
  if (d.caption) sheet.box(d.caption, layout.caption.area, layout.caption.o);
}
