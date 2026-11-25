import type { Slide } from "../../../types/slide";
import { footer, footerOf, header } from "../chrome";
import { mixColor } from "../palette";
import type { Sheet, RowHeight } from "../sheet";
import { W, EDGE, BOTTOM, PT, REM } from "../stage";
import { caps } from "../text";

const GANTT_ROWS: RowHeight = { what: "gantt", cap: 30 * 0.25 * REM, floor: 0.15 };

export function drawGantt(sheet: Sheet, d: Extract<Slide, { type: "gantt" }>): void {
  const { c } = sheet;
  const y = header(sheet, d);
  const foot = footerOf(sheet, d.footer);
  // GanttSlide's grid, in the spacing scale: a 20 rem label column, 0.25 rem between columns, and
  // per row a label line over a bar that fills the row, the row at most 7 rem tall.
  const sp = (v: number) => v * 0.25 * REM;
  const gx = EDGE + sp(84);
  const gap = sp(1);
  const colW = (W - EDGE - gx - gap * (d.columns.length - 1)) / d.columns.length;
  const cx = (col: number) => gx + (col - 1) * (colW + gap);
  const span = (n: number) => n * colW + (n - 1) * gap;
  const radius = (0.46875 * W) / 90;
  const lh = (PT.label * 1.25) / 72;
  const head = (PT.label * 1.4) / 72;
  d.columns.forEach((col, i) => {
    sheet.box(
      { runs: [caps(col)] },
      { x: cx(i + 1), y, w: colW, h: head },
      {
        size: PT.label,
        mono: true,
        color: c.muted,
        tracking: 0.06,
        align: "center",
      },
    );
    sheet.rect({ x: cx(i + 1), y: y + head + sp(1.5), w: colW, h: 2 / 144 }, c.border);
  });
  const top = y + head + sp(1.5) + 2 / 144 + sp(2);
  const stack = Math.max(
    0,
    ...[...Map.groupBy(d.milestones ?? [], (m) => m.column).values()].map((ms) => ms.length),
  );
  const msH = stack ? sp(3) + 2 / 144 + sp(1.5) + stack * lh : 0;
  const pitch = sheet.rowShare(GANTT_ROWS, BOTTOM - top - foot.h - msH + sp(2), d.rows.length);
  // Rows squeezed below their gap and label line keep a share of each.
  const rh = pitch - Math.min(sp(2), pitch / 4);
  d.rows.forEach((r, i) => {
    const ry = top + i * pitch;
    sheet.box(
      [
        { runs: [{ text: r.label }] },
        ...(r.sublabel
          ? [
              {
                runs: [{ text: r.sublabel, options: { color: c.muted } }],
                rel: PT.label / PT.base,
              },
            ]
          : []),
      ],
      { x: EDGE, y: ry, w: sp(80), h: rh },
      { size: PT.base, color: c.ink, align: "right", valign: "middle", line: 1.25 },
    );
    const by = ry + Math.min(lh + sp(1.5), rh / 2);
    d.columns.forEach((_, k) =>
      sheet.rounded({ x: cx(k + 1), y: by, w: colW, h: ry + rh - by }, { fill: c.card }, radius),
    );
    for (const bar of r.bars) {
      // One data hue, as on the web slide; continuous work at the ladder's 40 % with a 70 % edge.
      const tone = c.teal;
      sheet.rounded(
        { x: cx(bar.start), y: by, w: span(bar.span), h: ry + rh - by },
        {
          fill: bar.continuous ? mixColor(tone, c.card, 0.4) : tone,
          line: bar.continuous ? mixColor(tone, c.card, 0.7) : undefined,
        },
        radius,
      );
      sheet.box(
        bar.label,
        { x: cx(bar.start), y: ry, w: span(bar.span), h: lh },
        {
          size: PT.label,
          bold: true,
          color: tone,
          valign: "bottom",
          line: 1.25,
        },
      );
    }
  });
  if (stack) {
    const my = top + d.rows.length * pitch - (pitch - rh) + sp(3);
    sheet.box(
      { runs: [caps(d.milestonesLabel ?? sheet.words.milestones)] },
      { x: EDGE, y: my, w: sp(80), h: lh },
      {
        size: PT.label,
        mono: true,
        color: c.muted,
        tracking: 0.06,
        align: "right",
      },
    );
    // Milestones of one column stack under one rule, as on the web.
    for (const [column, ms] of Map.groupBy(d.milestones!, (m) => m.column)) {
      sheet.rect({ x: cx(column), y: my, w: colW, h: 2 / 144 }, c.purple);
      ms.forEach((m, k) =>
        sheet.box(
          m.label,
          {
            x: cx(column),
            y: my + 2 / 144 + sp(1.5) + k * lh,
            w: Math.min(colW * 1.5, W - EDGE - cx(column)),
            h: lh,
          },
          { size: PT.label, bold: true, color: c.purple, line: 1.25 },
        ),
      );
    }
  }
  footer(sheet, foot);
}
