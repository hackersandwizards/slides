import type { Slide } from "../../../types/slide";
import { code } from "../blocks/code";
import { footer, footerOf, header } from "../chrome";
import { chipArea, drawChip, drawChipRow, layoutChipRow, type ChipRow } from "../chips";
import type { Sheet, RowHeight } from "../sheet";
import { EDGE, BOTTOM, CW, PT, type Area } from "../stage";

const LANE_ROWS: RowHeight = { what: "lanes", cap: 0.87, floor: 0.27 };

function drawLaneStages(sheet: Sheet, labels: string[], lane: Area) {
  const { c } = sheet;
  const stages: ChipRow = {
    labels: labels.map((text) => ({ text, fill: c.card })),
    size: PT.sm,
    color: c.ink,
    gap: 0.3,
  };
  const origin = lane.x + 2;
  const layout = layoutChipRow(stages, origin, lane.x + lane.w - 0.25 - origin);
  const middle = lane.y + lane.h / 2;
  const y = middle - (layout.size * 1.9) / 144;
  // Advancing by width and then gap preserves the lane's existing PPTX coordinates.
  let x = origin;
  drawChipRow(sheet, layout, ({ chip, w }, i) => {
    const area = chipArea(chip, { x, y }, w);
    drawChip(sheet, chip, area);
    x = area.x + area.w;
    if (i === layout.cells.length - 1) return;
    sheet.arrow({ x: x + 0.05, y: middle }, { x: x + 0.25, y: middle }, c.purple);
    x += stages.gap;
  });
}

export function drawLanes(sheet: Sheet, d: Extract<Slide, { type: "lanes" }>): void {
  const { c } = sheet;
  const y = header(sheet, d);
  const codeH = d.codeSnippet
    ? (d.codeSnippet.code.split("\n").length * PT.sm * 1.3) / 72 + 0.45
    : 0;
  const foot = footerOf(sheet, d.footer);
  const lh = sheet.rowShare(LANE_ROWS, BOTTOM - y - codeH - foot.h - 0.3, d.lanes.length) - 0.12;
  let yy = y;
  if (d.codeSnippet) {
    code.draw(
      sheet,
      { type: "code", ...d.codeSnippet },
      { area: { x: EDGE, y: yy, w: CW, h: codeH - 0.1 }, k: 1, centered: false },
    );
    yy += codeH + 0.1;
  }
  d.lanes.forEach((lane, i) => {
    const ly = yy + i * (lh + 0.12);
    const first = i === 0;
    const area = { x: EDGE, y: ly, w: CW, h: lh };
    sheet.rounded(
      area,
      { fill: first ? c.purpleTint : c.card, line: first ? c.purple : c.border },
      0.08,
    );
    sheet.box(
      { runs: [{ text: lane.label }] },
      { x: EDGE + 0.25, y: ly, w: 1.6, h: lh },
      {
        size: PT.sm,
        mono: true,
        bold: true,
        color: first ? c.purple : c.muted,
        valign: "middle",
      },
    );
    drawLaneStages(sheet, lane.stages, area);
  });
  footer(sheet, foot);
}
