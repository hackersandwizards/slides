import type { DecisionSlide } from "../../../types/slide";
import { header } from "../chrome";
import type { Look } from "../look";
import { mixColor, type Palette } from "../palette";
import type { Sheet } from "../sheet";
import { drawStack, stackHeight, type StackItem } from "../stack";
import { BODY, PT, REM, TITLE, type Area, type Place } from "../stage";
import { caps, md, type BoxOpts } from "../text";

export interface DecisionColumns {
  x: number[];
  w: number[];
}

export interface DecisionTeamColors {
  tone: string;
  line: string;
}

export interface MeasuredBranch {
  label: string;
  lineColor: string;
  items: StackItem[];
  innerH: number;
}

export interface DecisionBranchLayout extends MeasuredBranch {
  by: number;
  cy: number;
  labelY: number;
}

export interface DecisionLayout {
  cols: DecisionColumns;
  need: Area;
  question: Area;
  outcome: Area;
  rowH: number;
  gridH: number;
  capH: number;
  top: number;
  mid: number;
  forkX: number;
  joinX: number;
  branches: DecisionBranchLayout[];
}

const TEAM_COLORS: Record<string, (c: Palette) => DecisionTeamColors> = {
  enabling: (c) => ({ tone: c.purple, line: c.purple }),
  platform: (c) => ({ tone: c.tealDark, line: c.teal }),
};

/** Computes the seven column left edges and widths of the decision grid inside `area`. */
export function decisionColumns(area: Area): DecisionColumns {
  const w = [15, 4, 14, 7.5, 0, 3.5, 17].map((r) => r * REM);
  w[4] = Math.max(0, area.w - w.reduce((sum, v) => sum + v, 0));
  const x = w.map((_, i) => area.x + w.slice(0, i).reduce((sum, v) => sum + v, 0));
  return { x, w };
}

/** Maps a decision branch's team kind to its title tone and card border colour. */
export function decisionTeamColors(team: string, c: Palette): DecisionTeamColors {
  const resolve = Object.hasOwn(TEAM_COLORS, team) ? TEAM_COLORS[team] : undefined;
  return resolve ? resolve(c) : { tone: c.factory, line: c.factory };
}

/** Builds the stacked title and body text items for one branch of a decision slide. */
export function decisionBranchItems(br: DecisionSlide["yes"], c: Palette): StackItem[] {
  const { tone } = decisionTeamColors(br.team, c);
  const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.375 };
  return [
    { text: { runs: md(br.title, c, { color: tone }) }, o: titleO, gap: 0 },
    { text: { runs: md(br.text, c) }, o: textO, gap: 0.5 * REM },
  ];
}

/** Builds and measures one decision branch's stacked items and border colour at inner width `w`. */
export function measureDecisionBranch(
  look: Look,
  br: DecisionSlide["yes"],
  w: number,
): MeasuredBranch {
  const items = decisionBranchItems(br, look.c);
  return {
    label: br.label,
    lineColor: decisionTeamColors(br.team, look.c).line,
    items,
    innerH: stackHeight(look, items, w),
  };
}

/** Draws a horizontal 0.25 rem teal connector bar starting at `from` with width `w`. */
export function drawDecisionBar(sheet: Sheet, from: Place, w: number): void {
  const thick = 0.25 * REM;
  sheet.rect({ x: from.x, y: from.y - thick / 2, w, h: thick }, sheet.c.teal);
}

/** Draws a right-pointing 0.9 rem teal arrowhead whose tip meets `tip`. */
export function drawDecisionHead(sheet: Sheet, tip: Place): void {
  const len = 0.9 * REM;
  const half = 0.6 * REM;
  sheet.slide.addShape("triangle", {
    x: tip.x - len / 2 - half,
    y: tip.y - len / 2,
    w: 2 * half,
    h: len,
    rotate: 90,
    fill: { color: sheet.c.teal },
    line: { type: "none" },
  });
}

/** Measures all boxes, branches, fork/join coordinates, and optional caption of a decision slide
 *  inside `area`. */
export function decisionLayout(look: Look, d: DecisionSlide, area: Area): DecisionLayout {
  const { c } = look;
  // As the web's decision grid: the need, a stub arrow, the question, a fork to the yes branch
  // above and the no branch below, both labelled in caps, a join and an arrow into the outcome;
  // the columns `--slide-decision-columns` sets, the branches as tall as the taller, 4 px teal
  // lines with 0.9 rem arrowheads.
  const cols = decisionColumns(area);
  const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
  const needH = look.need(d.need, cols.w[0] - 2 * 1.25 * REM, bold) + 2 * REM;
  const qH =
    look.need({ runs: md(d.question, c), align: "center" }, cols.w[2] - 2 * 1.25 * REM, bold) +
    2 * 1.25 * REM;
  const oH = look.need(d.outcome, cols.w[6] - 2 * 1.25 * REM, bold) + 2 * REM;
  const bIn = cols.w[4] - 2 * 1.5 * REM;
  const measured = [d.yes, d.no].map((br) => measureDecisionBranch(look, br, bIn));
  const rowH = Math.max(...measured.map((m) => m.innerH + 2 * 1.25 * REM));
  const gapY = 3.5 * REM;
  const gridH = 2 * rowH + gapY;
  const capO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.4, align: "center" };
  const capH = d.caption ? 1.5 * REM + look.need(d.caption, area.w, capO) : 0;
  const top = area.y + Math.max(0, area.h - gridH - capH) / 2.25;
  const mid = top + gridH / 2;
  // The fork's vertical 2 rem into its column, the join's 2 rem before the outcome.
  const forkX = cols.x[3] + 2 * REM;
  const joinX = cols.x[6] - 2 * REM;
  const lh = (PT.h4 * 1.4) / 72;
  const branches = measured.map((m, r): DecisionBranchLayout => {
    const by = top + r * (rowH + gapY);
    const cy = by + rowH / 2;
    return { ...m, by, cy, labelY: r ? cy + 3 * REM - lh : cy - 3 * REM };
  });
  const need: Area = { x: cols.x[0], y: mid - needH / 2, w: cols.w[0], h: needH };
  const question: Area = { x: cols.x[2], y: mid - qH / 2, w: cols.w[2], h: qH };
  const outcome: Area = { x: cols.x[6], y: mid - oH / 2, w: cols.w[6], h: oH };
  return { cols, need, question, outcome, rowH, gridH, capH, top, mid, forkX, joinX, branches };
}

/** Draws one decision branch: fork connectors, caps label, tinted card, text stack, and join
 *  connectors. */
export function drawDecisionBranch(
  sheet: Sheet,
  layout: DecisionLayout,
  br: DecisionBranchLayout,
): void {
  const { slide: s, c } = sheet;
  const { cols, rowH, mid, forkX, joinX } = layout;
  const line = { color: c.teal, width: 2 };
  const lh = (PT.h4 * 1.4) / 72;
  s.addShape("line", { x: forkX, y: Math.min(br.cy, mid), w: 0, h: Math.abs(mid - br.cy), line });
  s.addShape("line", { x: forkX, y: br.cy, w: cols.x[4] - forkX, h: 0, line });
  drawDecisionHead(sheet, { x: cols.x[4], y: br.cy });
  sheet.box(
    { runs: [caps(br.label)] },
    { x: forkX + 0.75 * REM, y: br.labelY, w: cols.w[3] - 2.75 * REM, h: lh },
    { size: PT.h4, mono: true, color: c.muted, tracking: 0.06, line: 1.4 },
  );
  sheet.card(
    { x: cols.x[4], y: br.by, w: cols.w[4], h: rowH },
    { fill: mixColor(br.lineColor, c.card, 0.15), line: br.lineColor },
  );
  drawStack(sheet, br.items, {
    x: cols.x[4] + 1.5 * REM,
    y: br.cy - br.innerH / 2,
    w: cols.w[4] - 2 * 1.5 * REM,
  });
  s.addShape("line", { x: cols.x[5], y: br.cy, w: joinX - cols.x[5], h: 0, line });
  s.addShape("line", { x: joinX, y: Math.min(br.cy, mid), w: 0, h: Math.abs(mid - br.cy), line });
}

export function drawDecision(sheet: Sheet, d: DecisionSlide): void {
  const { c } = sheet;
  const a = BODY(header(sheet, d));
  const layout = decisionLayout(sheet, d, a);
  const { cols, need, question, outcome, gridH, capH, top, mid, joinX } = layout;
  const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
  const padX = 1.25 * REM;
  sheet.card(need, { fill: mixColor(c.teal, c.card, 0.07), line: mixColor(c.teal, c.card, 0.4) });
  sheet.box(
    d.need,
    { x: need.x + padX, y: need.y + REM, w: need.w - 2 * padX, h: need.h - 2 * REM },
    bold,
  );
  drawDecisionBar(sheet, { x: cols.x[1], y: mid }, cols.w[1]);
  drawDecisionHead(sheet, { x: cols.x[2], y: mid });
  sheet.card(question, { fill: c.card, line: c.teal });
  sheet.box(
    { runs: md(d.question, c), align: "center" },
    {
      x: question.x + padX,
      y: question.y + padX,
      w: question.w - 2 * padX,
      h: question.h - 2 * padX,
    },
    { ...bold, align: "center" },
  );
  drawDecisionBar(sheet, { x: cols.x[3], y: mid }, 2 * REM);
  for (const br of layout.branches) drawDecisionBranch(sheet, layout, br);
  drawDecisionBar(sheet, { x: joinX, y: mid }, cols.x[6] - joinX);
  drawDecisionHead(sheet, { x: cols.x[6], y: mid });
  sheet.card(outcome, { fill: mixColor(c.ink, c.bg, 0.07) });
  sheet.box(
    d.outcome,
    { x: outcome.x + padX, y: outcome.y + REM, w: outcome.w - 2 * padX, h: outcome.h - 2 * REM },
    bold,
  );
  if (d.caption)
    sheet.box(
      d.caption,
      { x: a.x, y: top + gridH + 1.5 * REM, w: a.w, h: capH - 1.5 * REM },
      { size: PT.h4, color: c.muted, line: 1.4, align: "center" },
    );
}
