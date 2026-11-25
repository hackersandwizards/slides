import type { Slide } from "../../../types/slide";
import { teamTypesDrawn } from "../../../lib/people-slides";
import { header } from "../chrome";
import { textWidth } from "../fit";
import { mixColor } from "../palette";
import { drySheet, type Sheet } from "../sheet";
import { PT, TITLE, CORNER, REM, BODY, spacing, type Area } from "../stage";
import { md, type Para, type BoxOpts } from "../text";

/** A team-topology slide's body as `TeamTopologySlide` draws it, the Team Shape Templates in brand
 *  colours: the enabling teams in a row of columns on the left, the stream teams beside them one
 *  per row with their roles after the name where they fit, the complicated subsystems as octagons
 *  under them, the platform teams side by side in a dotted frame, then the legend and caption.
 *  Draws where `s` is given; returns the height at scale k. */
function topology(
  sheet: Sheet,
  d: Extract<Slide, { type: "team-topology" }>,
  a: Area,
  k: number,
): number {
  const { slide: s } = sheet;
  const { c } = sheet;
  const sp = (v: number) => spacing(v, k);
  const bd = (3 / 144) * k;
  // Sizes as drawn, in the half points pptxgenjs writes, so a box sized to its text holds it.
  const pt = (v: number) => Math.round(v * k * 2) / 2;
  const titleO: BoxOpts = { size: pt(PT.h4), ...TITLE, color: c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size: pt(PT.h4), color: c.ink, line: 1.375 };
  const hue = { enabling: c.purple, stream: c.teal, platform: c.teal, subsystem: c.neutral };
  const shape = (
    type: keyof typeof hue,
    x: number,
    y: number,
    w: number,
    h: number,
    r = CORNER * k,
  ) =>
    s?.addShape(
      type === "subsystem" ? "octagon" : r === CORNER * k ? "round2DiagRect" : "roundRect",
      {
        x,
        y,
        w,
        h,
        rectRadius:
          type === "subsystem" ? Math.min(0.9 * REM * k, h / 2) : Math.min(r, w / 2, h / 2),
        fill: type === "platform" ? { type: "none" } : { color: mixColor(hue[type], c.bg, 0.07) },
        line: {
          color: hue[type],
          width: 1.5 * k,
          ...(type === "platform" ? { dashType: "sysDot" as const } : {}),
        },
      },
    );
  // A column of paragraphs in width w, drawn at x, y where both are given; returns its height.
  const column = (parts: [Para, BoxOpts, number][], w: number, x?: number, y = 0) => {
    let h = 0;
    for (const [p, o, gap] of parts) {
      const ph = sheet.need(p, w, o);
      h += gap;
      if (!sheet.dry && x !== undefined) sheet.box(p, { x, y: y + h, w, h: ph }, o);
      h += ph;
    }
    return h;
  };
  const name = (text: string, color: string): Para => ({ runs: md(text, c, { color }) });
  // A team's roles as one line, each whole behind its own bullet, so a wrap falls between roles.
  const roles = (labels: string[]): Para => ({
    runs: labels.flatMap((l, i) => [
      { text: `${i ? "   " : ""}\u2022\u00a0`, options: { color: c.muted, bold: true } },
      { text: l.replace(/ /g, "\u00a0"), options: { color: c.tealDark, bold: true } },
    ]),
    balance: true,
  });

  // The enabling columns: 14 rem wide, wider where a word needs it, as `md:w-56 md:min-w-min`.
  const enW = d.enabling.map((t) => {
    const words = [
      ...t.name.split(/\s+/).map((w) => textWidth(w, titleO)),
      ...t.experts.flatMap((e) => e.split(/\s+/).map((w) => textWidth(w, textO))),
    ];
    return Math.max(sp(56), Math.max(...words) + 0.02 + 2 * sp(4) + 2 * bd);
  });
  const enParts = (t: (typeof d.enabling)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.purple), titleO, 0],
    ...t.experts.map((e, i): [Para, BoxOpts, number] => [
      name(e, c.ink),
      { ...textO, line: 1.25 },
      sp(i ? 2 : 1),
    ]),
  ];
  const enH = d.enabling.map(
    (t, i) => column(enParts(t), enW[i] - 2 * sp(4) - 2 * bd) + 2 * sp(3) + 2 * bd,
  );
  const mx = a.x + enW.reduce((sum, w) => sum + w + sp(4), 0);
  const mw = a.x + a.w - mx;

  // The stream teams, a row each: the roles after the name where both fit one line.
  const sIn = mw - 2 * sp(5) - 2 * bd;
  const streams = d.streamAligned.map((t) => {
    const nw = textWidth(t.name, titleO) + 0.02;
    const r = roles(t.roles);
    const rw = textWidth(r.runs.map((x) => x.text).join(""), { size: textO.size, bold: true });
    const beside = t.roles.length > 0 && nw + sp(6) + rw <= sIn;
    const nh = sheet.need(name(t.name, c.ink), sIn, titleO);
    const rh = t.roles.length ? sheet.need(r, beside ? rw + 0.02 : sIn, textO) : 0;
    return {
      t,
      r,
      nw,
      rw,
      beside,
      nh,
      rh,
      h: 2 * sp(3) + 2 * bd + (beside ? Math.max(nh, rh) : nh + (rh && sp(2) + rh)),
    };
  });
  const subs = d.complicatedSubsystem ?? [];
  const subW = subs.length ? (mw - (subs.length - 1) * sp(4)) / subs.length : 0;
  const subParts = (t: (typeof subs)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.ink), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(0.5)] as [Para, BoxOpts, number]]
      : []),
  ];
  const subIn = subW - 2 * sp(7) - 2 * bd;
  const subH = subs.length
    ? Math.max(...subs.map((t) => column(subParts(t), subIn))) + 2 * sp(3) + 2 * bd
    : 0;
  const mainH = [...streams.map((st) => st.h), ...(subs.length ? [subH] : [])].reduce(
    (sum, h, i) => sum + h + (i ? sp(3) : 0),
    0,
  );
  const rowH = d.enabling.length || streams.length || subs.length ? Math.max(mainH, ...enH) : 0;

  const pw = d.platform.length
    ? (a.w - 2 * sp(3) - 2 * bd - (d.platform.length - 1) * sp(4)) / d.platform.length
    : 0;
  const platParts = (t: (typeof d.platform)[number]): [Para, BoxOpts, number][] => [
    [name(t.name, c.tealDark), titleO, 0],
    ...(t.description
      ? [[name(t.description, c.muted), textO, sp(1.5)] as [Para, BoxOpts, number]]
      : []),
    ...(t.roles?.length ? [[roles(t.roles), textO, sp(1.5)] as [Para, BoxOpts, number]] : []),
  ];
  const platH = d.platform.length
    ? Math.max(...d.platform.map((t) => column(platParts(t), pw - 2 * sp(2)))) +
      2 * sp(1) +
      2 * sp(3) +
      2 * bd
    : 0;

  const words = sheet.words.teams;
  const legO: BoxOpts = { size: pt(17.33), color: c.muted, line: 1.4, valign: "middle" };
  // The legend's items in rows as `flex-wrap` sets them: x and row of each.
  const legRow = Math.max(sp(8), (legO.size * 1.4) / 72);
  const legend: {
    type: ReturnType<typeof teamTypesDrawn>[number];
    x: number;
    row: number;
    tw: number;
  }[] = [];
  if (d.legend !== false)
    for (const type of teamTypesDrawn(d)) {
      const tw = textWidth(words[type], legO) + 0.02;
      const last = legend.at(-1);
      let lx = last ? last.x + sp(17) + last.tw + sp(10) : 0;
      let row = last?.row ?? 0;
      if (last && lx + sp(17) + tw > a.w) [lx, row] = [0, row + 1];
      legend.push({ type, x: lx, row, tw });
    }
  const legRows = legend.length ? legend.at(-1)!.row + 1 : 0;
  const legH = legRows && sp(4) + legRows * legRow + (legRows - 1) * sp(3);
  const capO: BoxOpts = { size: pt(PT.h4), color: c.muted, line: 1.4 };
  const capH = d.caption ? sp(2) + sheet.need(d.caption, a.w, capO) : 0;
  const rows = [rowH, platH, legH, capH].filter(Boolean);
  const total = rows.reduce((sum, h) => sum + h, 0) + (rows.length - 1) * sp(4);
  if (sheet.dry) return total;

  let y = a.y;
  let x = a.x;
  d.enabling.forEach((t, i) => {
    shape("enabling", x, y, enW[i], rowH);
    const inner = enW[i] - 2 * sp(4) - 2 * bd;
    column(enParts(t), inner, x + bd + sp(4), y + (rowH - enH[i]) / 2 + bd + sp(3));
    x += enW[i] + sp(4);
  });
  let sy = y;
  for (const st of streams) {
    shape("stream", mx, sy, mw, st.h);
    const tx = mx + bd + sp(5);
    const ty = sy + bd + sp(3);
    const line = st.beside ? Math.max(st.nh, st.rh) : st.nh;
    sheet.box(
      name(st.t.name, c.ink),
      { x: tx, y: ty + (line - st.nh) / 2, w: st.beside ? st.nw : sIn, h: st.nh },
      titleO,
    );
    if (st.t.roles.length)
      sheet.box(
        st.r,
        {
          x: st.beside ? tx + st.nw + sp(6) : tx,
          y: st.beside ? ty + (line - st.rh) / 2 : ty + st.nh + sp(2),
          w: st.beside ? st.rw + 0.02 : sIn,
          h: st.rh,
        },
        textO,
      );
    sy += st.h + sp(3);
  }
  subs.forEach((t, i) => {
    const ox = mx + i * (subW + sp(4));
    shape("subsystem", ox, sy, subW, subH);
    column(subParts(t), subIn, ox + bd + sp(7), sy + (subH - column(subParts(t), subIn)) / 2);
  });
  if (rowH) y += rowH + sp(4);
  if (platH) {
    shape("platform", a.x, y, a.w, platH);
    d.platform.forEach((t, i) =>
      column(
        platParts(t),
        pw - 2 * sp(2),
        a.x + bd + sp(3) + i * (pw + sp(4)) + sp(2),
        y + bd + sp(3) + sp(1),
      ),
    );
    y += platH + sp(4);
  }
  if (legRows) {
    // Each type drawn here, in the order drawn, a swatch before its name.
    for (const it of legend) {
      const ly = y + sp(4) + it.row * (legRow + sp(3));
      shape(it.type, a.x + it.x, ly + (legRow - sp(8)) / 2, sp(14), sp(8), (10 / 144) * k);
      sheet.box(words[it.type], { x: a.x + it.x + sp(17), y: ly, w: it.tw, h: legRow }, legO);
    }
    y += legH + sp(4);
  }
  if (d.caption) sheet.box(d.caption, { x: a.x, y: y + sp(2), w: a.w, h: capH - sp(2) }, capO);
  return total;
}

export function drawTeamTopology(sheet: Sheet, d: Extract<Slide, { type: "team-topology" }>): void {
  const y = header(sheet, d);
  const a = BODY(y);
  // The web's fit guard: the whole body shrinks until it fits.
  let k = 1;
  while (k > 0.6 && topology(drySheet(sheet), d, a, k) > a.h) k -= 0.02;
  const h = topology(drySheet(sheet), d, a, k);
  topology(sheet, d, { ...a, y: a.y + Math.max(0, a.h - h) / 2.25 }, k);
}
