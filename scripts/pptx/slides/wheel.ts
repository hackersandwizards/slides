import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { textWidth } from "../fit";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { PT, TITLE, REM, BODY } from "../stage";
import { md, type BoxOpts } from "../text";

export function drawWheel(sheet: Sheet, d: Extract<Slide, { type: "wheel" }>): void {
  const { slide: s } = sheet;
  // As `WheelSlide`: a ring of segments at 40 % teal, a 1.5 degree gap each side, numbered from
  // the top clockwise, the centre on a soft disc; each segment's tile, title and text on the side
  // its centre lies on, both columns against the ring.
  const { c } = sheet;
  const y = header(sheet, d);
  const a = BODY(y);
  const n = d.segments.length;
  const dia = 24 * REM;
  const unit = dia / 200;
  const tile = 10 * 0.25 * REM;
  const colW = (a.w - dia - 2 * 2 * REM) / 2;
  const textW = colW - tile - 0.75 * REM;
  const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.375 };
  const centres = d.segments.map((_, k) => -90 + (360 * (k + 0.5)) / n);
  const cos = centres.map((deg) => Math.cos((deg * Math.PI) / 180));
  const right = cos.flatMap((v, k) => (v > 1e-6 ? [k] : []));
  const left = cos.flatMap((v, k) => (v < -1e-6 ? [k] : []));
  cos.forEach((v, k) => {
    if (Math.abs(v) <= 1e-6) (right.length <= left.length ? right : left).push(k);
  });
  const sin = (k: number) => Math.sin((centres[k] * Math.PI) / 180);
  for (const list of [left, right]) list.sort((p, q) => sin(p) - sin(q));
  const itemH = (k: number) =>
    Math.max(
      tile,
      sheet.need(d.segments[k].title, textW, titleO) +
        0.25 * REM +
        sheet.need(d.segments[k].text, textW, textO),
    );
  const colH = (list: number[]) =>
    list.reduce((sum, k, i) => sum + itemH(k) + (i ? 1.75 * REM : 0), 0);
  const capO: BoxOpts = { size: PT.sm, color: c.muted, line: 1.45 };
  const capH = d.caption ? REM + sheet.need(d.caption, a.w, capO) : 0;
  const h = Math.max(dia, colH(left), colH(right));
  const top = a.y + Math.max(0, a.h - h - capH) / 2.25;
  const cx = a.x + colW + 2 * REM + dia / 2;
  const cy = top + h / 2;
  d.segments.forEach((_, k) => {
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
    const rad = (centres[k] * Math.PI) / 180;
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
    { runs: md(d.center, c), bold: true },
    { x: cx - hub / 2 + REM, y: cy - hub / 2 + REM, w: hub - 2 * REM, h: hub - 2 * REM },
    {
      size: PT.sm,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.25,
    },
  );
  const column = (list: number[], x: number, w = textW) => {
    let ly = cy - colH(list) / 2;
    for (const k of list) {
      const sg = d.segments[k];
      sheet.rounded({ x, y: ly, w: tile, h: tile }, { fill: c.teal }, 10 / 144);
      sheet.box(
        { runs: [{ text: String(k + 1) }] },
        { x, y: ly, w: tile, h: tile },
        {
          size: 17.33,
          mono: true,
          bold: true,
          color: c.card,
          align: "center",
          valign: "middle",
          line: 1,
        },
      );
      const th = sheet.need(sg.title, w, titleO);
      sheet.box(sg.title, { x: x + tile + 0.75 * REM, y: ly, w, h: th }, titleO);
      sheet.box(
        sg.text,
        {
          x: x + tile + 0.75 * REM,
          y: ly + th + 0.25 * REM,
          w,
          h: sheet.need(sg.text, w, textO),
        },
        textO,
      );
      ly += itemH(k) + 1.75 * REM;
    }
  };
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
  column(left, a.x + colW - Math.min(colW, leftW), Math.min(textW, leftW - tile - 0.75 * REM));
  column(right, cx + dia / 2 + 2 * REM);
  if (d.caption) sheet.box(d.caption, { x: a.x, y: top + h + REM, w: a.w, h: capH - REM }, capO);
}
