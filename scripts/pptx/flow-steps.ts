import { spansOf, textWidth } from "./fit";
import { longest } from "./lines";
import type { Sheet } from "./sheet";
import { PT, REM, TITLE, spacing } from "./stage";
import { caps, md, type BoxOpts, type Para } from "./text";

/** A step of `FlowSteps`: the flow block's, a pipeline's or a process slide's node. */
export interface FlowStep {
  title: string;
  text?: string;
  label?: string;
  subtitle?: string;
  badge?: string;
  dim?: boolean;
  numbered?: false;
  tone?: "red" | "green";
}

/** Steps on one line as the web's `FlowSteps` draws them: a tile each, numbered unless a label
 *  counts already, a grey line with an arrowhead from tile to tile, the title, subtitle, text and
 *  badge centred under the tile, and a `loop` back above, labelled when non-empty. Draws where `s`
 *  is given; returns the height either way. */
export function flowSteps(
  sheet: Sheet,
  steps: FlowStep[],
  a: { x: number; y: number; w: number },
  o: { highlight?: number; loop?: string; dense?: boolean; k: number },
): number {
  const { slide: s, c } = sheet;
  const { k } = o;
  const n = steps.length;
  const sp = (v: number) => spacing(v, k);
  const narrow = n >= 6;
  const colW = a.w / n;
  const inner = colW - 2 * sp(narrow ? 2 : 5);
  const tile = o.dense ? sp(10) : sp(24);
  const inTile = steps.every((st) => (st.label?.length ?? 0) <= 4);
  const counted = !steps.some((st) => /\d/.test(st.label ?? ""));
  let count = 0;
  const numbers = steps.map((st) => (st.numbered === false ? undefined : ++count));
  const loopH = o.loop === undefined ? 0 : sp(o.loop ? 24 : 16) + sp(2);
  const centre = (i: number) => a.x + (i + 0.5) * colW;
  const tileY = a.y + loopH;
  const titleO: BoxOpts = {
    size: (o.dense || narrow ? PT.h4 : PT.h3) * k,
    ...TITLE,
    color: c.ink,
    line: 1.25,
    tracking: -0.015,
    align: "center",
    balance: true,
  };
  const textO: BoxOpts = { size: PT.base * k, color: c.ink, line: 1.375, align: "center" };
  let h = 0;
  steps.forEach((st, i) => {
    const on = o.highlight === i;
    const tone = st.dim ? c.muted : st.tone ? c[st.tone] : c.ink;
    const accent = st.dim ? c.muted : c.teal;
    let y = tileY + tile;
    const parts: [Para, BoxOpts, number][] = [];
    if (st.label && !inTile)
      parts.push([
        { runs: [caps(st.label, { color: accent })] },
        { ...textO, size: PT.h4 * k, mono: true, tracking: 0.06, line: 1.4 },
        sp(5),
      ]);
    parts.push([
      { runs: md(st.title, c, { color: on ? c.teal : tone }) },
      titleO,
      sp(o.dense ? 2 : st.label && !inTile ? 3 : 7),
    ]);
    if (st.subtitle)
      parts.push([
        { runs: md(st.subtitle, c, { color: accent }), bold: true, balance: true },
        textO,
        sp(2),
      ]);
    if (st.text)
      parts.push([{ runs: md(st.text, c, { color: st.dim ? c.muted : c.ink }) }, textO, sp(3)]);
    if (st.badge)
      parts.push([{ runs: md(st.badge, c, { color: accent }), bold: true }, textO, sp(3)]);
    for (const [p, po, gap] of parts) {
      // A word wider than the text column, such as a path in a chip, stands past it into the
      // step's padding, as the web's chip does.
      const pw = Math.min(colW, Math.max(inner, longest(spansOf(p, po, 1)) / 72 + 0.02));
      const ph = sheet.need(p, pw, po);
      y += gap;
      if (!sheet.dry) sheet.box(p, { x: centre(i) - pw / 2, y, w: pw, h: ph }, po);
      y += ph;
    }
    h = Math.max(h, y - a.y);
    if (sheet.dry) return;
    const tx = centre(i) - tile / 2;
    s.addShape("roundRect", {
      x: tx,
      y: tileY,
      w: tile,
      h: tile,
      rectRadius: 10 / 144,
      fill: { color: on ? c.teal : c.bg },
      line: on ? { type: "none" } : { color: c.muted, width: 2 * k },
    });
    const mark = st.label && inTile ? st.label : counted ? numbers[i] : undefined;
    if (mark !== undefined)
      sheet.box(
        { runs: [{ text: String(mark) }] },
        { x: tx, y: tileY, w: tile, h: tile },
        {
          size: (o.dense ? 17.33 : PT.h3) * k,
          mono: true,
          bold: true,
          color: on ? c.card : tone,
          align: "center",
          valign: "middle",
          line: 1,
          floor: 0.5,
        },
      );
    if (i < n - 1) {
      // The line from this tile to the arrowhead, which stops `--slide-arrow-inset` short of the
      // next tile's centre.
      const head = { w: sp(6), h: sp(7) };
      const end = centre(i + 1) - 4 * REM * k;
      const mid = tileY + tile / 2;
      s.addShape("line", {
        x: centre(i) + tile / 2,
        y: mid,
        w: Math.max(0.01, end - head.w - centre(i) - tile / 2),
        h: 0,
        line: { color: c.muted, width: 2 * k },
      });
      s.addShape("triangle", {
        x: end - head.w / 2 - head.h / 2,
        y: mid - head.w / 2,
        w: head.h,
        h: head.w,
        rotate: 90,
        fill: { color: c.muted },
        line: { type: "none" },
      });
    }
  });
  if (!sheet.dry && o.loop !== undefined) {
    // Out of the last tile, back along the top and down into the first, with its arrowhead.
    const top = a.y + (o.loop ? sp(6) : sp(2));
    const [x0, x1] = [centre(0), centre(n - 1)];
    const line = { color: c.muted, width: 2 * k };
    s.addShape("line", { x: x0, y: top, w: x1 - x0, h: 0, line });
    s.addShape("line", { x: x1, y: top, w: 0, h: tileY - sp(2) - top, line });
    s.addShape("line", { x: x0, y: top, w: 0, h: tileY - sp(6) - top, line });
    s.addShape("triangle", {
      x: x0 - sp(3.5),
      y: tileY - sp(6) - sp(2),
      w: sp(7),
      h: sp(6),
      rotate: 180,
      fill: { color: c.muted },
      line: { type: "none" },
    });
    if (o.loop) {
      const lw = textWidth(o.loop, { size: PT.h4 * k, bold: true }) + sp(12);
      // At least a line high, so the fit keeps the label at its size.
      const lh = Math.max(sp(7), (PT.h4 * k * 1.4) / 72);
      sheet.box(
        { runs: [{ text: o.loop }], bold: true },
        { x: (x0 + x1) / 2 - lw / 2, y: top - lh / 2, w: lw, h: lh },
        {
          size: PT.h4 * k,
          color: c.ink,
          align: "center",
          valign: "middle",
          fill: c.bg,
          line: 1.4,
        },
      );
    }
  }
  return h;
}
