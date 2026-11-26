import type { LanesSlide } from "../../../types/slide";
import { code } from "../blocks/code";
import { footer, footerOf, header } from "../chrome";
import { chipArea, drawChip, drawChipRow, layoutChipRow, type ChipRow } from "../chips";
import type { Look } from "../look";
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

/** Reserves space for the code snippet and footer and measures the room shared by the lanes. */
export function lanesBody(look: Look, d: LanesSlide, y: number) {
  const { codeSnippet } = d;
  let codeH = 0;
  let top = y;
  let snippet;
  if (codeSnippet) {
    codeH = (codeSnippet.code.split("\n").length * PT.sm * 1.3) / 72 + 0.45;
    snippet = {
      block: { type: "code" as const, ...codeSnippet },
      slot: { area: { x: EDGE, y, w: CW, h: codeH - 0.1 }, k: 1, centered: false },
    };
    top += codeH + 0.1;
  }
  const foot = footerOf(look, d.footer);
  const room = BOTTOM - y - codeH - foot.h - 0.3;
  return { foot, room, snippet, top };
}

/** Positions lane and label boxes at the allotted pitch. */
export function laneBands(lanes: LanesSlide["lanes"], top: number, lh: number) {
  return lanes.map((lane, i) => {
    const y = top + i * (lh + 0.12);
    return {
      lane,
      first: i === 0,
      area: { x: EDGE, y, w: CW, h: lh },
      label: { x: EDGE + 0.25, y, w: 1.6, h: lh },
    };
  });
}

type LaneBand = ReturnType<typeof laneBands>[number];

/** Draws a lane's frame, label and connected stage chips. */
export function drawLane(sheet: Sheet, { lane, first, area, label }: LaneBand): void {
  const { c } = sheet;
  sheet.rounded(
    area,
    { fill: first ? c.purpleTint : c.card, line: first ? c.purple : c.border },
    0.08,
  );
  sheet.box({ runs: [{ text: lane.label }] }, label, {
    size: PT.sm,
    mono: true,
    bold: true,
    color: first ? c.purple : c.muted,
    valign: "middle",
  });
  drawLaneStages(sheet, lane.stages, area);
}

export function drawLanes(sheet: Sheet, d: LanesSlide): void {
  const body = lanesBody(sheet, d, header(sheet, d));
  const lh = sheet.rowShare(LANE_ROWS, body.room, d.lanes.length) - 0.12;
  if (body.snippet) code.draw(sheet, body.snippet.block, body.snippet.slot);
  for (const band of laneBands(d.lanes, body.top, lh)) drawLane(sheet, band);
  footer(sheet, body.foot);
}
