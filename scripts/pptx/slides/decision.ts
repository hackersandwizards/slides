import type { DecisionSlide } from "../../../types/slide";
import { header } from "../chrome";
import type { Look } from "../look";
import { mixColor, type Palette } from "../palette";
import type { Sheet } from "../sheet";
import { drawStack, stackHeight, type StackItem } from "../stack";
import { BODY, PT, REM, TITLE, type Area, type Place } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";

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
  labelArea: Area;
}

export interface DecisionNode {
  card: Area;
  box: Area;
  text: string | Para;
  o: BoxOpts;
}

export interface DecisionCaption {
  text: string;
  area: Area;
  o: BoxOpts;
}

export interface DecisionLayout {
  cols: DecisionColumns;
  need: DecisionNode;
  question: DecisionNode;
  outcome: DecisionNode;
  rowH: number;
  mid: number;
  forkX: number;
  joinX: number;
  labelO: BoxOpts;
  branches: DecisionBranchLayout[];
  caption?: DecisionCaption;
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
export function decisionBranchItems(
  br: DecisionSlide["yes"],
  c: Palette,
  tone: string,
): StackItem[] {
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
  const { tone, line } = decisionTeamColors(br.team, look.c);
  const items = decisionBranchItems(br, look.c, tone);
  return {
    label: br.label,
    lineColor: line,
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

function decisionNodes(
  look: Look,
  d: DecisionSlide,
  at: { cols: DecisionColumns; mid: number },
): Pick<DecisionLayout, "need" | "question" | "outcome"> {
  const { c } = look;
  const { cols, mid } = at;
  const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
  const needIn = cols.w[0] - 2 * 1.25 * REM;
  const needH = look.need(d.need, needIn, bold) + 2 * REM;
  const qPara: Para = { runs: md(d.question, c), align: "center" };
  const qIn = cols.w[2] - 2 * 1.25 * REM;
  const qH = look.need(qPara, qIn, bold) + 2 * 1.25 * REM;
  const oIn = cols.w[6] - 2 * 1.25 * REM;
  const oH = look.need(d.outcome, oIn, bold) + 2 * REM;
  return {
    need: {
      card: { x: cols.x[0], y: mid - needH / 2, w: cols.w[0], h: needH },
      box: { x: cols.x[0] + 1.25 * REM, y: mid - needH / 2 + REM, w: needIn, h: needH - 2 * REM },
      text: d.need,
      o: bold,
    },
    question: {
      card: { x: cols.x[2], y: mid - qH / 2, w: cols.w[2], h: qH },
      box: {
        x: cols.x[2] + 1.25 * REM,
        y: mid - qH / 2 + 1.25 * REM,
        w: qIn,
        h: qH - 2.5 * REM,
      },
      text: qPara,
      o: { ...bold, align: "center" },
    },
    outcome: {
      card: { x: cols.x[6], y: mid - oH / 2, w: cols.w[6], h: oH },
      box: { x: cols.x[6] + 1.25 * REM, y: mid - oH / 2 + REM, w: oIn, h: oH - 2 * REM },
      text: d.outcome,
      o: bold,
    },
  };
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
  const labelLine = 1.4;
  const labelO = { size: PT.h4, mono: true, color: c.muted, tracking: 0.06, line: labelLine };
  const lh = (PT.h4 * labelLine) / 72;
  const branches = measured.map((m, r): DecisionBranchLayout => {
    const by = top + r * (rowH + gapY);
    const cy = by + rowH / 2;
    const labelY = r ? cy + 3 * REM - lh : cy - 3 * REM;
    return {
      ...m,
      by,
      cy,
      labelArea: { x: forkX + 0.75 * REM, y: labelY, w: cols.w[3] - 2.75 * REM, h: lh },
    };
  });
  const caption: DecisionCaption | undefined = d.caption
    ? {
        text: d.caption,
        area: { x: area.x, y: top + gridH + 1.5 * REM, w: area.w, h: capH - 1.5 * REM },
        o: capO,
      }
    : undefined;
  return {
    cols,
    ...decisionNodes(look, d, { cols, mid }),
    rowH,
    mid,
    forkX,
    joinX,
    labelO,
    branches,
    caption,
  };
}

/** Draws one decision branch: fork connectors, caps label, tinted card, text stack, and join
 *  connectors. */
export function drawDecisionBranch(
  sheet: Sheet,
  layout: DecisionLayout,
  br: DecisionBranchLayout,
): void {
  const { slide: s, c } = sheet;
  const { cols, rowH, mid, forkX, joinX, labelO } = layout;
  const line = { color: c.teal, width: 2 };
  s.addShape("line", { x: forkX, y: Math.min(br.cy, mid), w: 0, h: Math.abs(mid - br.cy), line });
  s.addShape("line", { x: forkX, y: br.cy, w: cols.x[4] - forkX, h: 0, line });
  drawDecisionHead(sheet, { x: cols.x[4], y: br.cy });
  sheet.box({ runs: [caps(br.label)] }, br.labelArea, labelO);
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

/** Draws the decision diagram body and optional caption from its measured layout. */
export function drawDecisionBody(sheet: Sheet, layout: DecisionLayout): void {
  const { c } = sheet;
  const { cols, need, question, outcome, mid, joinX, caption } = layout;
  sheet.card(need.card, {
    fill: mixColor(c.teal, c.card, 0.07),
    line: mixColor(c.teal, c.card, 0.4),
  });
  sheet.box(need.text, need.box, need.o);
  drawDecisionBar(sheet, { x: cols.x[1], y: mid }, cols.w[1]);
  drawDecisionHead(sheet, { x: cols.x[2], y: mid });
  sheet.card(question.card, { fill: c.card, line: c.teal });
  sheet.box(question.text, question.box, question.o);
  drawDecisionBar(sheet, { x: cols.x[3], y: mid }, 2 * REM);
  for (const br of layout.branches) drawDecisionBranch(sheet, layout, br);
  drawDecisionBar(sheet, { x: joinX, y: mid }, cols.x[6] - joinX);
  drawDecisionHead(sheet, { x: cols.x[6], y: mid });
  sheet.card(outcome.card, { fill: mixColor(c.ink, c.bg, 0.07) });
  sheet.box(outcome.text, outcome.box, outcome.o);
  if (caption) sheet.box(caption.text, caption.area, caption.o);
}

export function drawDecision(sheet: Sheet, d: DecisionSlide): void {
  drawDecisionBody(sheet, decisionLayout(sheet, d, BODY(header(sheet, d))));
}
