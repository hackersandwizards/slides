import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { PT, TITLE, REM, BODY } from "../stage";
import { caps, md, type Para, type BoxOpts } from "../text";

export function drawDecision(sheet: Sheet, d: Extract<Slide, { type: "decision" }>): void {
  const { slide: s } = sheet;
  // As the web's decision grid: the need, a stub arrow, the question, a fork to the yes branch
  // above and the no branch below, both labelled in caps, a join and an arrow into the outcome;
  // the columns `--slide-decision-columns` sets, the branches as tall as the taller, 4 px teal
  // lines with 0.9 rem arrowheads.
  const { c } = sheet;
  const y = header(sheet, d);
  const a = BODY(y);
  const fixed = [15, 4, 14, 7.5, 0, 3.5, 17].map((r) => r * REM);
  fixed[4] = Math.max(0, a.w - fixed.reduce((sum, v) => sum + v, 0));
  const col = (i: number) => a.x + fixed.slice(0, i).reduce((sum, v) => sum + v, 0);
  const teamTone = (t: string) =>
    t === "enabling" ? c.purple : t === "platform" ? c.tealDark : c.factory;
  const teamLine = (t: string) =>
    t === "enabling" ? c.purple : t === "platform" ? c.teal : c.factory;
  const bold: BoxOpts = { size: PT.h4, bold: true, color: c.ink, line: 1.25 };
  const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.375 };
  const needIn = fixed[0] - 2 * 1.25 * REM;
  const needH = sheet.need(d.need, needIn, bold) + 2 * REM;
  const qIn = fixed[2] - 2 * 1.25 * REM;
  const qH = sheet.need({ runs: md(d.question, c), align: "center" }, qIn, bold) + 2 * 1.25 * REM;
  const oIn = fixed[6] - 2 * 1.25 * REM;
  const oH = sheet.need(d.outcome, oIn, bold) + 2 * REM;
  const bIn = fixed[4] - 2 * 1.5 * REM;
  const branch = (br: typeof d.yes): [Para, BoxOpts, number][] => [
    [{ runs: md(br.title, c, { color: teamTone(br.team) }) }, titleO, 0],
    [{ runs: md(br.text, c) }, textO, 0.5 * REM],
  ];
  const bh = (br: typeof d.yes) =>
    branch(br).reduce((sum, [p, o, gap]) => sum + gap + sheet.need(p, bIn, o), 0) + 2 * 1.25 * REM;
  const rowH = Math.max(bh(d.yes), bh(d.no));
  const gapY = 3.5 * REM;
  const gridH = 2 * rowH + gapY;
  const capO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.4, align: "center" };
  const capH = d.caption ? 1.5 * REM + sheet.need(d.caption, a.w, capO) : 0;
  const top = a.y + Math.max(0, a.h - gridH - capH) / 2.25;
  const mid = top + gridH / 2;
  const thick = 0.25 * REM;
  const line = { color: c.teal, width: 2 };
  const bar = (x: number, w: number, yy: number) =>
    sheet.rect({ x, y: yy - thick / 2, w, h: thick }, c.teal);
  const head = (tip: number, yy: number) => {
    const [len, half] = [0.9 * REM, 0.6 * REM];
    s.addShape("triangle", {
      x: tip - len / 2 - half,
      y: yy - len / 2,
      w: 2 * half,
      h: len,
      rotate: 90,
      fill: { color: c.teal },
      line: { type: "none" },
    });
  };
  sheet.card(
    { x: col(0), y: mid - needH / 2, w: fixed[0], h: needH },
    { fill: mixColor(c.teal, c.card, 0.07), line: mixColor(c.teal, c.card, 0.4) },
  );
  sheet.box(
    d.need,
    { x: col(0) + 1.25 * REM, y: mid - needH / 2 + REM, w: needIn, h: needH - 2 * REM },
    bold,
  );
  bar(col(1), fixed[1], mid);
  head(col(2), mid);
  sheet.card({ x: col(2), y: mid - qH / 2, w: fixed[2], h: qH }, { fill: c.card, line: c.teal });
  sheet.box(
    { runs: md(d.question, c), align: "center" },
    { x: col(2) + 1.25 * REM, y: mid - qH / 2 + 1.25 * REM, w: qIn, h: qH - 2.5 * REM },
    { ...bold, align: "center" },
  );
  bar(col(3), 2 * REM, mid);
  // The fork's vertical 2 rem into its column, the join's 2 rem before the outcome.
  const forkX = col(3) + 2 * REM;
  const joinX = col(6) - 2 * REM;
  [d.yes, d.no].forEach((br, r) => {
    const by = top + r * (rowH + gapY);
    const cy = by + rowH / 2;
    s.addShape("line", { x: forkX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
    s.addShape("line", { x: forkX, y: cy, w: col(4) - forkX, h: 0, line });
    head(col(4), cy);
    const lh = (PT.h4 * 1.4) / 72;
    sheet.box(
      { runs: [caps(br.label)] },
      {
        x: forkX + 0.75 * REM,
        y: r ? cy + 3 * REM - lh : cy - 3 * REM,
        w: fixed[3] - 2.75 * REM,
        h: lh,
      },
      {
        size: PT.h4,
        mono: true,
        color: c.muted,
        tracking: 0.06,
        line: 1.4,
      },
    );
    sheet.card(
      { x: col(4), y: by, w: fixed[4], h: rowH },
      { fill: mixColor(teamLine(br.team), c.card, 0.15), line: teamLine(br.team) },
    );
    const parts = branch(br);
    const inner = parts.reduce((sum, [p, o, gap]) => sum + gap + sheet.need(p, bIn, o), 0);
    let ty = cy - inner / 2;
    for (const [p, o, gap] of parts) {
      const ph = sheet.need(p, bIn, o);
      ty += gap;
      sheet.box(p, { x: col(4) + 1.5 * REM, y: ty, w: bIn, h: ph }, o);
      ty += ph;
    }
    s.addShape("line", { x: col(5), y: cy, w: joinX - col(5), h: 0, line });
    s.addShape("line", { x: joinX, y: Math.min(cy, mid), w: 0, h: Math.abs(mid - cy), line });
  });
  bar(joinX, col(6) - joinX, mid);
  head(col(6), mid);
  sheet.card(
    { x: col(6), y: mid - oH / 2, w: fixed[6], h: oH },
    { fill: mixColor(c.ink, c.bg, 0.07) },
  );
  sheet.box(
    d.outcome,
    { x: col(6) + 1.25 * REM, y: mid - oH / 2 + REM, w: oIn, h: oH - 2 * REM },
    bold,
  );
  if (d.caption)
    sheet.box(d.caption, { x: a.x, y: top + gridH + 1.5 * REM, w: a.w, h: capH - 1.5 * REM }, capO);
}
