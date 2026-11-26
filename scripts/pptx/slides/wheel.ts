import type { WheelSlide } from "../../../types/slide";
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

const WHEEL_TILE = 10 * 0.25 * REM;

interface WheelText {
  title: BoxOpts;
  body: BoxOpts;
}

interface WheelRow {
  segment: WheelSlide["segments"][number];
  number: number;
  height: number;
}

/** Heights of the rows at one common text width. */
export function wheelRowHeights(
  look: Look,
  segments: WheelSlide["segments"],
  measure: { width: number; style: WheelText },
) {
  return segments.map((segment) =>
    Math.max(
      WHEEL_TILE,
      look.need(segment.title, measure.width, measure.style.title) +
        0.25 * REM +
        look.need(segment.text, measure.width, measure.style.body),
    ),
  );
}

/** Natural width of the left column, including its tiles and text inset. */
export function wheelLeftWidth(segments: WheelSlide["segments"], left: number[]): number {
  // The left column stands against the ring, as `justify-self-end` sets it.
  return Math.max(
    0,
    ...left.map(
      (k) =>
        WHEEL_TILE +
        0.75 * REM +
        Math.max(
          textWidth(segments[k].title, { size: PT.h4, ...TITLE }),
          textWidth(segments[k].text, { size: PT.sm }),
        ) +
        0.02,
    ),
  );
}

/** Height of a column with gaps between its rows. */
export function wheelColumnHeight(rows: readonly number[]): number {
  return rows.reduce((sum, height, i) => sum + height + (i ? 1.75 * REM : 0), 0);
}

/** Positions each part of the wheel at the body size. */
export function wheelLayout(look: Look, d: WheelSlide, a: Area) {
  const { c } = look;
  const dia = 24 * REM;
  const colW = (a.w - dia - 2 * 2 * REM) / 2;
  const common = {
    width: colW - WHEEL_TILE - 0.75 * REM,
    style: {
      title: { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 },
      body: { size: PT.sm, color: c.muted, line: 1.375 },
    },
  };
  const { centres, left, right } = wheelSides(d.segments);
  const heights = wheelRowHeights(look, d.segments, common);
  const leftH = wheelColumnHeight(left.map((i) => heights[i]));
  const rightH = wheelColumnHeight(right.map((i) => heights[i]));
  const capO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.45 };
  const capH = d.caption ? REM + look.need(d.caption, a.w, capO) : 0;
  const h = Math.max(dia, leftH, rightH);
  const top = a.y + Math.max(0, a.h - h - capH) / 2.25;
  const cx = a.x + colW + 2 * REM + dia / 2;
  const cy = top + h / 2;
  const leftW = wheelLeftWidth(d.segments, left);
  const rows = (indices: number[]) =>
    indices.map((i) => ({
      segment: d.segments[i],
      number: i + 1,
      height: heights[i],
    }));
  const leftColumn = {
    x: a.x + colW - Math.min(colW, leftW),
    y: cy - leftH / 2,
    w: Math.min(common.width, leftW - WHEEL_TILE - 0.75 * REM),
    style: common.style,
  };
  const rightColumn = {
    x: cx + dia / 2 + 2 * REM,
    y: cy - rightH / 2,
    w: common.width,
    style: common.style,
  };
  return {
    ring: { dia, cx, cy, centres },
    hub: { dia, cx, cy },
    columns: [
      wheelColumnLayout(look, rows(left), leftColumn),
      wheelColumnLayout(look, rows(right), rightColumn),
    ],
    caption: { area: { x: a.x, y: top + h + REM, w: a.w, h: capH - REM }, o: capO },
  };
}

type WheelLayout = ReturnType<typeof wheelLayout>;

/** Places the numbered arcs in clockwise order. */
export function wheelRing(sheet: Sheet, { dia, cx, cy, centres }: WheelLayout["ring"]): void {
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
export function wheelHub(sheet: Sheet, center: string, { dia, cx, cy }: WheelLayout["hub"]): void {
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
export function wheelColumnLayout(
  look: Look,
  rows: readonly WheelRow[],
  column: Pick<Area, "x" | "y" | "w"> & { style: WheelText },
) {
  const {
    x,
    w,
    style: { title: titleO, body: textO },
  } = column;
  let y = column.y;
  const items = rows.map(({ segment: { title, text }, number, height }) => {
    const th = look.need(title, w, titleO);
    const item = {
      number: String(number),
      title,
      text,
      tile: { x, y, w: WHEEL_TILE, h: WHEEL_TILE },
      titleArea: { x: x + WHEEL_TILE + 0.75 * REM, y, w, h: th },
      textArea: {
        x: x + WHEEL_TILE + 0.75 * REM,
        y: y + th + 0.25 * REM,
        w,
        h: look.need(text, w, textO),
      },
    };
    y += height + 1.75 * REM;
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

export function drawWheel(sheet: Sheet, d: WheelSlide): void {
  // As `WheelSlide`: a ring of segments at 40 % teal, a 1.5 degree gap each side, numbered from
  // the top clockwise, the centre on a soft disc; each segment's tile, title and text on the side
  // its centre lies on, both columns against the ring.
  const layout = wheelLayout(sheet, d, BODY(header(sheet, d)));
  wheelRing(sheet, layout.ring);
  wheelHub(sheet, d.center, layout.hub);
  for (const column of layout.columns) wheelColumn(sheet, column);
  if (d.caption) sheet.box(d.caption, layout.caption.area, layout.caption.o);
}
