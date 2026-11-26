import type { GanttSlide, Slide } from "../../../types/slide";
import { footer, footerOf, header } from "../chrome";
import type { Look } from "../look";
import { mixColor } from "../palette";
import type { Sheet, RowHeight } from "../sheet";
import { W, EDGE, BOTTOM, PT, REM } from "../stage";
import { caps } from "../text";

const GANTT_ROWS: RowHeight = { what: "gantt", cap: 30 * 0.25 * REM, floor: 0.15 };

/** The header, columns and room available for rows after reserving the footer and milestones. */
export function ganttGrid(look: Look, d: GanttSlide, y: number) {
  const foot = footerOf(look, d.footer);
  // GanttSlide's grid, in the spacing scale: a 20 rem label column, 0.25 rem between columns, and
  // per row a label line over a bar that fills the row, the row at most 7 rem tall.
  const gx = EDGE + 84 * 0.25 * REM;
  const gap = 1 * 0.25 * REM;
  const colW = (W - EDGE - gx - gap * (d.columns.length - 1)) / d.columns.length;
  const radius = (0.46875 * W) / 90;
  const lh = (PT.label * 1.25) / 72;
  const head = (PT.label * 1.4) / 72;
  const ruleY = y + head + 1.5 * 0.25 * REM;
  const top = ruleY + 2 / 144 + 2 * 0.25 * REM;
  // Milestones of one column stack under one rule, as on the web.
  const groups = Map.groupBy(d.milestones ?? [], (m) => m.column);
  const stack = Math.max(0, ...[...groups.values()].map((ms) => ms.length));
  const msH = stack ? 3 * 0.25 * REM + 2 / 144 + 1.5 * 0.25 * REM + stack * lh : 0;
  const room = BOTTOM - top - foot.h - msH + 2 * 0.25 * REM;
  return {
    y,
    head,
    ruleY,
    gx,
    colW,
    gap,
    radius,
    lh,
    top,
    foot,
    groups,
    room,
    columns: d.columns,
    rows: d.rows,
    milestoneHeading: d.milestonesLabel ?? look.words.milestones,
  };
}

type GanttGrid = ReturnType<typeof ganttGrid>;

/** The horizontal bounds of a run of one or more one-indexed columns. */
export function ganttSpan({ gx, colW, gap }: GanttGrid, start: number, count: number) {
  return { x: gx + (start - 1) * (colW + gap), w: count * colW + (count - 1) * gap };
}

/** Places each row's tracks and labels and reserves a line for the milestone heading. */
export function ganttSchedule(grid: GanttGrid, pitch: number) {
  const { top, rows, lh } = grid;
  // Rows squeezed below their gap and label line keep a share of each.
  const rh = pitch - Math.min(2 * 0.25 * REM, pitch / 4);
  const bands = rows.map((row, i) => {
    const y = top + i * pitch;
    const barY = y + Math.min(lh + 1.5 * 0.25 * REM, rh / 2);
    return { row, y, h: rh, barY, barH: y + rh - barY };
  });
  const milestoneY = top + rows.length * pitch - (pitch - rh) + 3 * 0.25 * REM;
  return { bands, milestoneY };
}

type GanttBand = ReturnType<typeof ganttSchedule>["bands"][number];

/** Draws the time labels and their rules. */
export function monthRow(sheet: Sheet, grid: GanttGrid): void {
  const { c } = sheet;
  const { columns, y, head, ruleY, colW } = grid;
  columns.forEach((col, i) => {
    const { x } = ganttSpan(grid, i + 1, 1);
    sheet.box(
      { runs: [caps(col)] },
      { x, y, w: colW, h: head },
      { size: PT.label, mono: true, color: c.muted, tracking: 0.06, align: "center" },
    );
    sheet.rect({ x, y: ruleY, w: colW, h: 2 / 144 }, c.border);
  });
}

/** Draws a scheduled row's caption, background tracks and work bars. */
export function ganttRow(sheet: Sheet, grid: GanttGrid, band: GanttBand): void {
  const { c } = sheet;
  const { row, y, h, barY, barH } = band;
  const { colW, radius, lh } = grid;
  sheet.box(
    [
      { runs: [{ text: row.label }] },
      ...(row.sublabel
        ? [{ runs: [{ text: row.sublabel, options: { color: c.muted } }], rel: PT.label / PT.base }]
        : []),
    ],
    { x: EDGE, y, w: 80 * 0.25 * REM, h },
    { size: PT.base, color: c.ink, align: "right", valign: "middle", line: 1.25 },
  );
  grid.columns.forEach((_, k) => {
    const { x } = ganttSpan(grid, k + 1, 1);
    sheet.rounded({ x, y: barY, w: colW, h: barH }, { fill: c.card }, radius);
  });
  for (const bar of row.bars) {
    // One data hue, as on the web slide; continuous work at the ladder's 40 % with a 70 % edge.
    const tone = c.teal;
    const { x, w } = ganttSpan(grid, bar.start, bar.span);
    sheet.rounded(
      { x, y: barY, w, h: barH },
      {
        fill: bar.continuous ? mixColor(tone, c.card, 0.4) : tone,
        line: bar.continuous ? mixColor(tone, c.card, 0.7) : undefined,
      },
      radius,
    );
    sheet.box(
      bar.label,
      { x, y, w, h: lh },
      { size: PT.label, bold: true, color: tone, valign: "bottom", line: 1.25 },
    );
  }
}

/** Draws the milestone heading and the grouped labels in column order. */
export function milestones(sheet: Sheet, grid: GanttGrid, y: number): void {
  const { c } = sheet;
  const { colW, lh, groups, milestoneHeading } = grid;
  if (!groups.size) return;
  sheet.box(
    { runs: [caps(milestoneHeading)] },
    { x: EDGE, y, w: 80 * 0.25 * REM, h: lh },
    { size: PT.label, mono: true, color: c.muted, tracking: 0.06, align: "right" },
  );
  for (const [column, entries] of groups) {
    const { x } = ganttSpan(grid, column, 1);
    sheet.rect({ x, y, w: colW, h: 2 / 144 }, c.purple);
    entries.forEach((m, k) =>
      sheet.box(
        m.label,
        {
          x,
          y: y + 2 / 144 + 1.5 * 0.25 * REM + k * lh,
          w: Math.min(colW * 1.5, W - EDGE - x),
          h: lh,
        },
        { size: PT.label, bold: true, color: c.purple, line: 1.25 },
      ),
    );
  }
}

export function drawGantt(sheet: Sheet, d: Extract<Slide, { type: "gantt" }>): void {
  const y = header(sheet, d);
  const grid = ganttGrid(sheet, d, y);
  monthRow(sheet, grid);
  const schedule = ganttSchedule(grid, sheet.rowShare(GANTT_ROWS, grid.room, d.rows.length));
  for (const band of schedule.bands) ganttRow(sheet, grid, band);
  milestones(sheet, grid, schedule.milestoneY);
  footer(sheet, grid.foot);
}
