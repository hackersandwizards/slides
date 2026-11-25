import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import type {
  ComparisonSide,
  MarkerTone,
  Grounded,
  Presentation,
  RoadmapItem,
  Slide,
  SectionTheme,
  TitleSlide,
} from "../../types/slide";
import { trendTicks } from "../../components/slides/ChartPlots";
import { groundOf } from "../../components/slides/SlideShell";
import { HW_LOGO } from "../../lib/logo";
import { isDeepDive } from "../../lib/slide-framing";
import { isHighlightPhase } from "../../lib/process-layout";
import { isOpening, speakerLine } from "../../lib/title-slide";
import { linkLabel, profileLabel, qrAlt } from "../../lib/link-labels";
import { claimParts, companiesWithLogo } from "../../lib/closing-copy";
import { closingClaim, deckLang } from "../../lib/slide-utils";
import { personAccent, teamTypesDrawn } from "../../lib/people-slides";
import { blocks } from "./blocks";
import { beforeAfter, beforeAfterHeight, highlightPara } from "./blocks/before-after";
import { code } from "./blocks/code";
import { CALLOUT_PAD } from "./blocks/text";
import { centredMark, footer, footerAt, footerOf, frame, header } from "./chrome";
import {
  chipAdvance,
  chipArea,
  drawChip,
  drawChipRow,
  layoutChipRow,
  type Chip,
  type ChipRow,
} from "./chips";
import { brandCut } from "./images";
import { profileLink } from "./people";
import { cellAreas, rowShare, type RowHeight } from "./cells";
import { MONO, PITCH, SANS } from "./faces";
import { spansOf, textWidth } from "./fit";
import { wrap } from "./lines";
import { flowSteps, type FlowStep } from "./flow-steps";
import { Look } from "./look";
import { checkSlide } from "./overflow";
import { hex, mixColor, palette, THEME } from "./palette";
import { Sheet, drySheet, type ChartFix, type Output } from "./sheet";
import { slideDrawn } from "./slides";
import {
  W,
  H,
  EDGE,
  TOP,
  BOTTOM,
  CW,
  PT,
  LEADING,
  TITLE,
  CORNER,
  REM,
  BODY,
  spacing,
  type Area,
} from "./stage";
import {
  HUE_OF_MARKER,
  MARKER_SQUARE,
  CAPS,
  caps,
  md,
  plain,
  literal,
  bulletParas,
  type Para,
  type BoxOpts,
  type Run,
} from "./text";

/** A process slide's footer, `SlideCaption` on the web: brand's teal callout as wide as its
 *  text, centred, at `y`; returns its height. */
function caption(sheet: Sheet, text: string, y: number) {
  const { c } = sheet;
  const o: BoxOpts = { size: PT.base, color: c.ink, align: "center", valign: "middle" };
  const fw = Math.min(CW, 1365 / 144, textWidth(text, o) + 2 * CALLOUT_PAD + 0.02);
  const th = sheet.need(text, fw - 2 * CALLOUT_PAD, o);
  const h = th + 2 * CALLOUT_PAD;
  if (sheet.dry) return h;
  sheet.card({ x: (W - fw) / 2, y, w: fw, h }, { fill: c.callout(c.teal) });
  sheet.box(
    text,
    { x: (W - fw) / 2 + CALLOUT_PAD, y: y + CALLOUT_PAD, w: fw - 2 * CALLOUT_PAD, h: th },
    o,
  );
  return h;
}

/** A two-sided comparison's punchline and footnotes under its sides from y, as the web sets them:
 *  the punchline 2.5 rem under in a 48 rem column, balanced, the footnotes 1.5 rem under that in a
 *  56 rem column. Draws where `s` is given; returns the height. */
function comparisonFoot(sheet: Sheet, d: { punchline?: string; footnotes?: string[] }, y: number) {
  const { c } = sheet;
  const punchO: BoxOpts = {
    size: PT.h4,
    mono: true,
    bold: true,
    color: c.teal,
    align: "center",
    line: 1.35,
  };
  const noteO: BoxOpts = { size: 13.33, color: c.muted, line: 1.4 };
  const pw = Math.min(CW, 48 * REM);
  // The footnotes' column shrinks to their longest line, centred, as the web's.
  const nw = Math.min(
    CW,
    56 * REM,
    Math.max(0, ...(d.footnotes ?? []).map((f) => textWidth(f, { size: 13.33 }) + 0.02)),
  );
  const punch: Para = { runs: md(d.punchline ?? "", c), balance: true };
  const notes = (d.footnotes ?? []).map((f) => ({ runs: md(f, c) }));
  const ph = d.punchline ? sheet.need(punch, pw, punchO) : 0;
  const nh = notes.length ? sheet.need(notes, nw, noteO) : 0;
  let h = 0;
  if (ph) {
    h += 2.5 * REM;
    if (!sheet.dry) sheet.box(punch, { x: (W - pw) / 2, y: y + h, w: pw, h: ph }, punchO);
    h += ph;
  }
  if (nh) {
    h += 1.5 * REM;
    if (!sheet.dry) sheet.box(notes, { x: (W - nw) / 2, y: y + h, w: nw, h: nh }, noteO);
    h += nh;
  }
  return h;
}

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

/** A trend or bar chart as the print route draws it (`ChartFrame`, `Axes` and recharts' margins in
 *  `ChartPlots`): the card, its padding, a 16 pt label's line and the gaps round it, the legend's
 *  row over the card, the annotation under it, and the plot's edges inside its container. */
const CHART = {
  w: 1365 / 144,
  h: 560 / 144,
  pad: 42.67 / 144,
  line: 46 / 144,
  underHead: 10.67 / 144,
  overFoot: 5.33 / 144,
  legend: (46 + 21.33) / 144,
  note: 32 / 144,
  noteLine: 49 / 144,
  left: (8 + 64) / 144,
  right: 30 / 144,
  top: 12 / 144,
  /** recharts' `tickMargin`, `TICK_GAP` in `ChartPlots`. */
  tick: 12 / 144,
  bottom: (8 + 56) / 144,
};
/** A bar's name sizes, `CHART_TICK_STEPS` in `ChartCategoryLayout.tsx`: the web's text-base, text-sm and text-xs. */
const TICK_STEPS = [PT.sm, 13.33, 12];

const LANE_ROWS: RowHeight = { what: "lanes", cap: 0.87, floor: 0.27 };
const GANTT_ROWS: RowHeight = { what: "gantt", cap: 30 * 0.25 * REM, floor: 0.15 };

type Render = (sheet: Sheet, slide: never) => void;

/** A talk's opening as TitleSlide draws it, measured off the print route: kicker, name and title on
 *  the left, centred above the bottom row and kept 2rem clear of it, where speakers and event stand
 *  beside the QR code and its link. */
function opening(sheet: Sheet, d: TitleSlide) {
  const lang = d.lang ?? sheet.lang;
  const { c } = sheet;
  const qr = 256 / 144;
  const rowH = d.qr ? 324 / 144 : 119 / 144;
  const rowY = BOTTOM - rowH;
  const headEnd = rowY - 43 / 144;
  // Each line of the heading with its options and the gap above it.
  const lines: [Para, BoxOpts, number][] = [
    ...(d.kicker
      ? [
          [
            { runs: [caps(d.kicker)] },
            { size: PT.base, mono: true, color: c.teal, tracking: 0.06 },
            0,
          ],
        ]
      : []),
    ...(d.name
      ? [
          [
            literal(d.name),
            { size: 32, mono: true, bold: true, color: c.teal, tracking: -0.025 },
            22 / 144,
          ],
        ]
      : []),
    [
      literal(d.title),
      {
        size: PT.s8,
        mono: true,
        bold: true,
        color: c.ink,
        line: LEADING.display,
        floor: 0.5,
        tracking: -0.04,
        balance: true,
      },
      d.name ? 34 / 144 : 22 / 144,
    ],
    ...(d.subtitle ? [[literal(d.subtitle), { size: PT.lead, color: c.muted }, 43 / 144]] : []),
  ] as [Para, BoxOpts, number][];
  // A heading taller than the space above the bottom row shrinks to fit it, as the fit guard does.
  const full = lines.map(([text, o]) => Math.min(3, sheet.need(text, CW, o)));
  const total = lines.reduce((sum, [, , gap], i) => sum + gap + full[i], 0) - lines[0][2];
  const k = Math.min(1, (headEnd - TOP) / total);
  const heights = full.map((h) => h * k);
  let y = TOP + (headEnd - TOP - total * k) / 2;
  lines.forEach(([text, o, gap], i) => {
    if (i) y += gap * k;
    sheet.box(text, { x: EDGE, y, w: CW, h: heights[i] }, o);
    y += heights[i];
  });
  const mid = rowY + rowH / 2;
  const label = d.qr && `↗ ${linkLabel(d.qr.href)}`;
  const colW = label ? Math.max(qr, textWidth(label, { size: PT.base, mono: true }) + 0.1) : 0;
  const textW = CW - (colW && colW + 0.5);
  const speakers = d.speakers?.length ? literal(speakerLine(d, lang)) : undefined;
  const left = (speakers ? 53 / 144 : 0) + (d.event ? (speakers ? 17 / 144 : 0) + 49 / 144 : 0);
  let ly = mid - left / 2;
  if (speakers) {
    sheet.box(
      speakers,
      { x: EDGE, y: ly, w: textW, h: 53 / 144 },
      {
        size: PT.h3,
        mono: true,
        bold: true,
        color: c.ink,
      },
    );
    ly += 70 / 144;
  }
  if (d.event)
    sheet.box(
      literal(d.event),
      { x: EDGE, y: ly, w: textW, h: 49 / 144 },
      { size: PT.base, color: c.muted },
    );
  if (d.qr && label) {
    const colX = W - EDGE - colW;
    sheet.picture(
      d.qr.src,
      { x: colX + (colW - qr) / 2, y: rowY, w: qr, h: qr },
      {
        alt: qrAlt(d.qr.href, lang),
        href: d.qr.href,
      },
    );
    sheet.box(
      { runs: [{ text: label, options: { hyperlink: { url: d.qr.href } } }] },
      { x: colX, y: rowY + qr + 12 / 144, w: colW, h: 52 / 144 },
      { size: PT.base, mono: true, color: c.teal, align: "center" },
    );
  }
}

type RenderedSlide = Exclude<
  Slide,
  | { type: "evolution" | "media" | "overview" | "deep-dive-divider" | "dual-pill-overview" }
  | { type: "grid"; variant?: "pillars" | "stats" }
  | { type: "comparison"; variant: "guidance" | "positions" }
>;

const RENDER: {
  [K in RenderedSlide["type"]]: (sheet: Sheet, slide: Extract<RenderedSlide, { type: K }>) => void;
} = {
  title(sheet, d) {
    if (isOpening(d)) return opening(sheet, d);
    const { c } = sheet;
    const o: BoxOpts = {
      size: PT.display,
      mono: true,
      bold: true,
      color: c.ink,
      align: "center",
      line: LEADING.display,
      floor: 0.5,
      tracking: -0.03,
      balance: true,
    };
    const title = literal(d.title);
    const subtitle = d.subtitle ? literal(d.subtitle) : undefined;
    const th = Math.min(3, sheet.need(title, CW - 1, o));
    const sh = subtitle
      ? Math.min(1.2, sheet.need(subtitle, CW - 2, { size: PT.lead, color: c.ink }))
      : 0;
    const y = (H - th - sh - 0.5) / 2;
    sheet.box(title, { x: EDGE + 0.5, y, w: CW - 1, h: th }, o);
    if (subtitle)
      sheet.box(
        subtitle,
        { x: EDGE + 1, y: y + th + 0.5, w: CW - 2, h: sh },
        {
          size: PT.lead,
          color: c.ink,
          align: "center",
        },
      );
  },

  content(sheet, d) {
    const centered = d.layout === "centered";
    let y = header(sheet, d, centered);
    const markerStyle = { size: PT.label, fill: sheet.c.tealTint, color: sheet.c.teal };
    if (d.badge) {
      const badge: Chip = { ...markerStyle, text: d.badge };
      const area = chipArea(badge, {
        x: W - EDGE - (d.badge.length * PT.label * 0.62) / 72 - 0.24,
        y: TOP - 0.32,
      });
      drawChip(sheet, badge, area);
    }
    if (d.stageMarker?.length) {
      let x = EDGE;
      if (d.stagePrefix) {
        sheet.box(
          d.stagePrefix,
          { x, y: y - 0.15, w: 1.5, h: 0.25 },
          {
            size: PT.label,
            mono: true,
            bold: true,
            color: sheet.c.muted,
            valign: "middle",
          },
        );
        x += (d.stagePrefix.length * PT.label * 0.62) / 72 + 0.15;
      }
      for (const text of d.stageMarker) {
        const marker: Chip = { ...markerStyle, text };
        const area = chipArea(marker, { x, y: y - 0.15 });
        drawChip(sheet, marker, area);
        x += area.w + 0.1;
      }
      y += 0.25;
    }
    const foot = footerOf(sheet, d.footer);
    const end = blocks(sheet, d.content, BODY(y), centered, foot.h && foot.h + 0.1);
    footerAt(sheet, { ...foot, centered }, end + 0.1);
  },

  regular(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    let a = BODY(y);
    if (d.profile) {
      const pw = 2.6;
      sheet.portrait(d.profile, { x: a.x + (pw - 1.4) / 2, y: a.y + 0.2, d: 1.4 }, c.teal);
      const who: Para[] = [
        { runs: [{ text: d.profile.name }], ...TITLE, after: 4 },
        { runs: [{ text: d.profile.title, options: { color: c.teal } }], rel: 0.9 },
        ...(d.profile.linkedIn ? [{ ...profileLink(d.profile.linkedIn, c), rel: 0.9 }] : []),
      ];
      const o: BoxOpts = { size: PT.base, color: c.ink, align: "center" };
      sheet.box(who, { x: a.x, y: a.y + 1.75, w: pw, h: Math.max(0.9, sheet.need(who, pw, o)) }, o);
      a = { ...a, x: a.x + pw + 0.5, w: a.w - pw - 0.5 };
    }
    const secs = d.sections;
    const paras = (sec: (typeof secs)[number]): Para[] => [
      ...(sec.title
        ? [
            {
              runs: md(sec.title, c, { color: c.teal }),
              mono: true,
              bold: true,
              rel: PT.h4 / PT.base,
              after: 6,
            },
          ]
        : []),
      ...(sec.text ? [{ runs: md(sec.text, c), after: 6 }] : []),
      ...(sec.items ?? []).map((it) => ({ runs: md(it, c), bullet: true as const, after: 5 })),
      ...(sec.link
        ? [
            {
              runs: [
                {
                  text: sec.link.label,
                  options: { color: c.teal, hyperlink: { url: sec.link.url } },
                },
              ],
              after: 6,
            },
          ]
        : []),
    ];
    sheet.box(
      secs.flatMap((sec) =>
        paras(sec).map((p, j, arr) => (j === arr.length - 1 ? { ...p, after: 14 } : p)),
      ),
      a,
      { size: PT.base, color: c.ink },
    );
  },

  statement(sheet, d) {
    const { c } = sheet;
    // The picture beside the statement, as the slide picks it: a quotation keeps its portrait and
    // drops a QR code, and a screenshot's or QR code's link is on the picture.
    const qr = !d.attribution && d.qr;
    const side = qr
      ? { src: qr.src, alt: qrAlt(qr.href, sheet.lang), href: qr.href }
      : d.imageSrc
        ? { src: d.imageSrc, alt: d.imageAlt, href: undefined, round: !!d.attribution }
        : d.linkedImage;
    const imgW = side ? CW * 0.38 : 0;
    const w = CW - imgW - (imgW ? 0.4 : 0);
    const lineRuns = (line: string): Run[] => {
      const out: Run[] = [];
      const marks = [d.highlighted, d.crossedOut].filter(Boolean) as string[];
      let rest = line;
      while (rest) {
        const hits = marks
          .map((m) => [rest.indexOf(m), m] as const)
          .filter(([i]) => i >= 0)
          .sort((p, q) => p[0] - q[0]);
        if (!hits.length) {
          out.push(...md(rest, c));
          break;
        }
        const [i, m] = hits[0];
        if (i) out.push(...md(rest.slice(0, i), c));
        out.push({
          text: m,
          options:
            m === d.highlighted ? { color: c.teal } : { strike: "sngStrike", color: c.muted },
        });
        rest = rest.slice(i + m.length);
      }
      return out;
    };
    if (!side && !d.attribution) {
      // As the web's centred statement: the kicker, each line a display heading balanced on its
      // own, 64 pt where nothing else stands, 48 pt otherwise, the subtitle in its narrower column,
      // the points and closing under it, all centred in the slide or above its footer.
      const foot = footerOf(sheet, d.footer);
      const simple =
        !d.points?.length && !d.closing && !d.subtitle && !d.highlighted && !d.crossedOut;
      const w = d.footer ? CW : W - 2 * 4 * REM;
      const parts: [Para[], BoxOpts, number, number][] = [];
      if (d.kicker)
        parts.push([
          [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
          {
            size: PT.sm,
            mono: true,
            color: c.tealDark,
            tracking: 0.06,
            line: 1.4,
            align: "center",
          },
          w,
          0,
        ]);
      if (d.crossedOut && !d.lines.some((l) => l.includes(d.crossedOut!)))
        parts.push([
          [{ runs: [{ text: d.crossedOut, options: { strike: "sngStrike", color: c.muted } }] }],
          { size: PT.h3, mono: true, bold: true, color: c.muted, align: "center", line: 1.25 },
          w,
          parts.length ? 2 * REM : 0,
        ]);
      parts.push([
        d.lines.map((l) => ({ runs: lineRuns(l), balance: true })),
        {
          size: simple ? 64 : PT.s8,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
          align: "center",
        },
        w,
        parts.length ? 2 * REM : 0,
      ]);
      if (d.subtitle)
        parts.push([
          [{ runs: md(d.subtitle, c, { color: c.muted }), balance: true }],
          { size: PT.h3, color: c.muted, line: 1.375, align: "center" },
          Math.min(w, 64 * REM),
          2 * REM,
        ]);
      // The points as one list as wide as its longest point, centred, each its number in teal
      // mono a step larger; the closing centred under it, as the web's `w-fit` list.
      if (d.points?.length) {
        const pointO: BoxOpts = { size: PT.h4, color: c.muted, line: 1.375 };
        const number = (i: number) => `${String(i + 1).padStart(2, "0")}\u00a0`;
        const paras = d.points.map((pt, i) => ({
          runs: [
            {
              text: number(i),
              options: { color: c.teal, bold: true, fontFace: MONO, fontSize: PT.lead },
            },
            ...md(pt, c, { color: c.muted }),
          ],
          after: 1.25 * REM * 72,
        }));
        const longestPoint = Math.max(
          ...paras.map((p) => (wrap(spansOf(p, pointO, 1), Infinity)[0].width / 72) * 1.01 + 0.05),
        );
        parts.push([paras, pointO, Math.min(w, 56 * REM, longestPoint), 3.5 * REM]);
      }
      if (d.closing) {
        const quoted = d.closingStyle === "quote";
        const mark = { color: mixColor(c.teal, c.bg, 0.7) };
        parts.push([
          [
            {
              runs: quoted
                ? [
                    { text: "“", options: mark },
                    ...md(d.closing, c, { color: c.muted, italic: true }),
                    { text: "”", options: mark },
                  ]
                : md(d.closing, c),
              bold: true,
              balance: true,
            },
          ],
          { size: quoted ? PT.lead : PT.h3, color: c.ink, line: 1.375, align: "center" },
          Math.min(w, 56 * REM),
          2.5 * REM,
        ]);
      }
      const heights = parts.map(([p, o, pw]) => sheet.need(p, pw, o));
      const total = heights.reduce((sum, h, i) => sum + h + parts[i][3], 0);
      const [top, bottom] = d.footer ? [TOP, BOTTOM - foot.h - 0.1] : [0, BOTTOM];
      let y = top + Math.max(0, (bottom - top - total) / 2);
      parts.forEach(([p, o, pw, gap], i) => {
        y += gap;
        sheet.box(p, { x: (W - pw) / 2, y, w: pw, h: heights[i] }, o);
        y += heights[i];
      });
      footer(sheet, foot);
      return;
    }
    if (qr) {
      // As QrStatement: the words at the left, the code on the right in a white card whose padding
      // is its quiet zone, its address under it, the row top-aligned and centred above the footer.
      const foot = footerOf(sheet, d.footer);
      const q = (0.45 * 1.15 * 1080) / 144;
      const label = `↗ ${linkLabel(qr.href)}`;
      const colW = Math.max(q, textWidth(label, { size: PT.base, mono: true }) + 0.1);
      const w = CW - colW - 5 * REM;
      const parts: [Para[], BoxOpts, number][] = [];
      const support: BoxOpts = { size: PT.h3, color: c.ink, line: 1.375 };
      if (d.kicker)
        parts.push([
          [{ runs: [caps(d.kicker, { color: c.tealDark })] }],
          { size: PT.sm, mono: true, color: c.tealDark, tracking: 0.06, line: 1.4 },
          0,
        ]);
      parts.push([
        d.lines.map((l) => ({ runs: lineRuns(l), balance: true })),
        {
          size: PT.s8,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
        },
        parts.length ? 1.5 * REM : 0,
      ]);
      if (d.subtitle) parts.push([[{ runs: md(d.subtitle, c) }], support, 1.5 * REM]);
      if (d.points?.length)
        parts.push([
          d.points.map((pt, i) => ({
            runs: [
              {
                text: `${String(i + 1).padStart(2, "0")}  `,
                options: { color: c.teal, bold: true, fontFace: MONO },
              },
              ...md(pt, c, { color: c.muted }),
            ],
            after: 1.25 * REM * 72,
          })),
          { size: PT.base, color: c.muted, line: 1.375 },
          2 * REM,
        ]);
      if (d.closing) {
        const quoted = d.closingStyle === "quote";
        parts.push([
          [{ runs: md(quoted ? `“${d.closing}”` : d.closing, c), bold: true }],
          support,
          1.5 * REM,
        ]);
      }
      const heights = parts.map(([p, o]) => sheet.need(p, w, o));
      const textH = heights.reduce((sum, h, i) => sum + h + parts[i][2], 0);
      const labelH = sheet.need(label, colW, { size: PT.base, mono: true, color: c.teal });
      const figH = q + REM + labelH;
      const bottom = BOTTOM - foot.h - (d.footer ? 0.1 : 0);
      const top = TOP + Math.max(0, (bottom - TOP - Math.max(textH, figH)) / 2);
      let y = top;
      parts.forEach(([p, o, gap], i) => {
        y += gap;
        sheet.box(p, { x: EDGE, y, w, h: heights[i] }, o);
        y += heights[i];
      });
      const x = W - EDGE - colW + (colW - q) / 2;
      const pad = 2.5 * REM;
      sheet.rounded({ x, y: top, w: q, h: q }, { fill: "FFFFFF", line: c.border }, CORNER);
      sheet.picture(
        qr.src,
        { x: x + pad, y: top + pad, w: q - 2 * pad, h: q - 2 * pad },
        {
          alt: qrAlt(qr.href, sheet.lang),
          href: qr.href,
        },
      );
      sheet.box(
        { runs: [{ text: label, options: { hyperlink: { url: qr.href } } }] },
        { x: W - EDGE - colW, y: top + q + REM, w: colW, h: labelH },
        { size: PT.base, mono: true, color: c.teal, align: "center" },
      );
      footer(sheet, foot);
      return;
    }
    const paras: Para[] = d.lines.map((l) => ({
      runs: lineRuns(l),
      mono: true,
      bold: true,
      rel: PT.s8 / PT.base,
      after: 0,
    }));
    // The crossed-out claim stands above the statement, as the kicker of the web slide.
    const crossed = d.crossedOut && !d.lines.some((l) => l.includes(d.crossedOut!)) ? 1 : 0;
    if (crossed) {
      paras.unshift({
        runs: [{ text: d.crossedOut!, options: { strike: "sngStrike", color: c.muted } }],
        mono: true,
        bold: true,
        rel: PT.h3 / PT.base,
      });
    }
    paras.forEach((p, i) => (p.after = i >= crossed && i < crossed + d.lines.length - 1 ? 0 : 16));
    if (d.kicker)
      paras.unshift({
        runs: [caps(d.kicker, { color: c.teal })],
        mono: true,
        bold: true,
        rel: PT.label / PT.base,
        after: 16,
      });
    const support: Para[] = [];
    if (d.subtitle)
      support.push({
        runs: md(d.subtitle, c, { color: c.muted }),
        rel: PT.lead / PT.base,
        after: 16,
      });
    for (const [i, pt] of (d.points ?? []).entries()) {
      support.push({
        runs: [
          {
            text: `${String(i + 1).padStart(2, "0")}  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(pt, c),
        ],
        rel: PT.lead / PT.base,
        after: 6,
      });
    }
    const quoted = d.closingStyle === "quote";
    const closing: Para[] = d.closing
      ? [
          {
            runs: md(quoted ? `“${d.closing}”` : d.closing, c, quoted ? { italic: true } : {}),
            bold: !quoted,
            rel: PT.lead / PT.base,
            after: 4,
          },
        ]
      : [];
    if (d.attribution) {
      // The name follows the words said, the lines and a quoted closing; the slide's own words
      // come after it.
      const name = d.attribution.split(",")[0];
      const attribution: Para = {
        runs: [
          { text: name, options: { bold: true } },
          { text: d.attribution.slice(name.length), options: { color: c.muted } },
        ],
      };
      const own = [...support, ...(quoted ? [] : closing)];
      if (own.length) attribution.after = 16;
      paras.push(...(quoted ? closing : []), attribution, ...own);
    } else paras.push(...support, ...closing);
    const o: BoxOpts = {
      size: PT.base,
      color: c.ink,
      // A quotation and a closing with a QR code stand at the left edge, as on the slide.
      align: d.attribution || qr ? "left" : "center",
      valign: "middle",
      line: 1.2,
      floor: 0.5,
    };
    const foot = footerOf(sheet, d.footer);
    sheet.box(paras, { x: EDGE, y: TOP, w, h: BOTTOM - TOP - foot.h }, o);
    footer(sheet, foot);
    if (side) {
      // A quotation's portrait is round at the web's size, 384 px at 1920, centred in the side.
      const [x, h] = [EDGE + w + 0.4, BOTTOM - TOP - foot.h];
      const r = "round" in side && side.round ? 384 / 144 : 0;
      const metadata = { alt: side.alt, href: side.href };
      if (r) {
        sheet.avatar(side.src, { x: x + (imgW - r) / 2, y: TOP + (h - r) / 2, d: r }, metadata);
      } else {
        sheet.picture(side.src, { x, y: TOP, w: imgW, h }, metadata);
      }
    }
  },

  grid(sheet, d) {
    // Quotes as the web's QuoteCard: the brand quote, upright ink behind a purple rule with no
    // card, and under it the author in teal, a round portrait beside, in the web's columns.
    const { c } = sheet;
    const y = header(sheet, d);
    const cols = d.columns === 2 ? 2 : d.columns === 4 ? 4 : 3;
    const rows = Math.ceil(d.cards.length / cols);
    const a = BODY(y);
    const gap = 42.67 / 144;
    const w = Math.min(a.w, 1365 / 144);
    const cw = (w - (cols - 1) * gap) / cols;
    const rule = 2 / 144;
    const indent = rule + 26.67 / 144;
    const who = 74.67 / 144;
    const o: BoxOpts = { size: PT.lead, color: c.ink };
    const quote = (cd: (typeof d.cards)[number]) => ({ runs: md(cd.description ?? cd.title, c) });
    const qh = Math.max(...d.cards.map((cd) => sheet.need(quote(cd), cw - indent, o)));
    const ch = Math.min((a.h - (rows - 1) * gap) / rows, qh + 0.25 + who);
    const left = a.x + (a.w - w) / 2;
    const top = a.y + Math.max(0, (a.h - rows * ch - (rows - 1) * gap) / 2);
    d.cards.forEach((cd, i) => {
      const x = left + (i % cols) * (cw + gap);
      const yy = top + Math.floor(i / cols) * (ch + gap);
      const h = ch - 0.25 - who;
      sheet.rect({ x, y: yy, w: rule, h }, c.purple);
      sheet.box(quote(cd), { x: x + indent, y: yy, w: cw - indent, h }, o);
      let ax = x;
      if (cd.imageSrc) {
        sheet.avatar(cd.imageSrc, { x, y: yy + ch - who, d: who }, { alt: cd.author ?? "" });
        ax += who + 0.11;
      }
      if (cd.author)
        sheet.box(
          cd.author,
          { x: ax, y: yy + ch - who, w: cw - (ax - x), h: who },
          {
            size: PT.base,
            bold: true,
            color: c.teal,
            valign: "middle",
          },
        );
    });
  },

  comparison(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const footH = comparisonFoot(drySheet(sheet), d, 0);
    const area = BODY(y);
    const sides = [d.left, d.right];
    const variant = d.variant ?? "vs";
    const o = { size: PT.base, color: c.ink };
    // The sides, punchline and footnotes stand as one group where the web's slide body puts it.
    const place = (ch: number) => area.y + Math.max(0, area.h - ch - footH) / 2.25;
    if (variant === "before-after") {
      const strike = d.strike !== false;
      const adds = !strike && d.adds;
      const ch = Math.min(
        area.h - footH,
        beforeAfterHeight(sheet, sides, strike, area.w, o, 1, adds),
      );
      const top = place(ch);
      beforeAfter(sheet, { ...area, y: top, h: ch }, o, sides, strike, 1, adds);
      comparisonFoot(sheet, d, top + ch);
      return;
    }
    // The print route shows both sides of a `vs` slide active, as its last reveal step does: a vs
    // side lists its plus points, then the items starting with "-" as its minus points. A `split`
    // slide draws two plain cards of listed items, its labels read as markdown. Each card as the
    // web's: 2 rem padding, its title 1.5 rem over the items, the items 0.75 rem apart.
    const vs = variant === "vs";
    const pad = 2 * REM;
    const gap = 2 * REM;
    const cw = (area.w - gap) / 2;
    const titleO: BoxOpts = { size: PT.h4, ...TITLE, color: c.ink, line: 1.35, tracking: -0.015 };
    const itemO: BoxOpts = { size: PT.h4, color: c.ink, line: 1.4 };
    const items = (sd: ComparisonSide): Para[] => [
      ...(sd.highlight ? [highlightPara(sd.highlight, c.teal)] : []),
      ...(vs
        ? [
            ...sd.items.filter((it) => !it.startsWith("-")),
            ...sd.items.filter((it) => it.startsWith("-")),
          ].map((it) => {
            const minus = it.startsWith("-");
            return {
              runs: [
                {
                  text: minus ? "−  " : "+  ",
                  options: { color: minus ? c.red : c.green, bold: true },
                },
                ...md(it.replace(/^[-+]\s*/, ""), c),
              ],
              after: 0.75 * REM * 72,
            };
          })
        : sd.items.map((it) => ({
            runs: md(it, c),
            bullet: true as const,
            after: 0.75 * REM * 72,
          }))),
    ];
    const label = (sd: ComparisonSide): Para => ({
      runs: vs ? [{ text: sd.label }] : md(sd.label, c),
    });
    const logoH = 48 / 144 + REM;
    const parts = sides.map((sd) => {
      const th = sheet.need(label(sd), cw - 2 * pad, titleO);
      const ih = sheet.need(items(sd), cw - 2 * pad, itemO);
      return { th, ih, h: 2 * pad + (sd.logo ? logoH : 0) + th + 1.5 * REM + ih };
    });
    const ch = Math.min(area.h - footH, Math.max(...parts.map((p) => p.h)));
    const top = place(ch);
    sides.forEach((sd, i) => {
      const x = area.x + i * (cw + gap);
      sheet.card({ x, y: top, w: cw, h: ch }, vs ? sheet.c.litCard : sheet.c.plainCard);
      let ty = top + pad;
      if (sd.logo) {
        sheet.picture(
          sd.logo,
          { x: x + pad, y: ty, w: 1.4, h: 48 / 144 },
          {
            align: "left",
            alt: plain(sd.label),
          },
        );
        ty += logoH;
      }
      sheet.box(label(sd), { x: x + pad, y: ty, w: cw - 2 * pad, h: parts[i].th }, titleO);
      ty += parts[i].th + 1.5 * REM;
      sheet.box(items(sd), { x: x + pad, y: ty, w: cw - 2 * pad, h: top + ch - pad - ty }, itemO);
    });
    comparisonFoot(sheet, d, top + ch);
  },

  guidance(sheet, d) {
    const { c } = sheet;
    let y = header(sheet, d);
    const intro: Para[] = [
      ...(d.intro ? [{ runs: md(d.intro, c), after: 6 }] : []),
      ...bulletParas(d.points ?? [], c),
    ];
    if (intro.length) {
      const ih = Math.min(1.6, sheet.need(intro, CW, { size: PT.base, color: c.muted }));
      sheet.box(intro, { x: EDGE, y, w: CW, h: ih }, { size: PT.base, color: c.muted });
      y += ih + 0.2;
    }
    const a = BODY(y);
    const lines = Math.max(
      ...d.examples.flatMap((ex) => [ex.bad, ex.good].map((t) => t.split("\n").length)),
    );
    const eh = Math.min(
      (a.h - (d.examples.length - 1) * 0.2) / d.examples.length,
      0.9 + (lines * PT.sm * 1.3) / 72,
    );
    d.examples.forEach((ex, i) => {
      const ey = a.y + i * (eh + 0.2);
      sheet.box(
        { runs: md(ex.title, c) },
        { x: EDGE, y: ey, w: CW, h: 0.3 },
        {
          size: PT.base,
          mono: true,
          bold: true,
          color: c.ink,
        },
      );
      const sides = [
        [sheet.words.bad, ex.bad, c.red, c.redTint],
        [sheet.words.good, ex.good, c.green, c.greenTint],
      ] as const;
      cellAreas(sides.length, { x: EDGE, y: ey + 0.35, w: CW, h: eh - 0.35 }, 0.25).forEach(
        (r, i) => {
          const [label, text, tone, tint] = sides[i];
          sheet.card(r, { fill: tint, line: tone });
          sheet.box(
            [
              {
                runs: [caps(label, { color: tone })],
                bold: true,
                rel: 0.75,
                after: 4,
              },
              ...text.split("\n").map((l) => ({ runs: [{ text: l || " " }] })),
            ],
            { x: r.x + 0.2, y: r.y + 0.15, w: r.w - 0.4, h: r.h - 0.25 },
            { size: PT.sm, mono: true, color: c.muted, line: 1.3 },
          );
        },
      );
    });
  },

  profiles(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const foot = footerOf(sheet, d.footer);
    const a = { ...BODY(y), h: BOTTOM - y - foot.h };
    const body = (p: (typeof d.profiles)[number]): Para[] => [
      ...bulletParas(p.bullets ?? [], c),
      ...(p.linkedIn ? [profileLink(p.linkedIn, c)] : []),
    ];
    const ch = Math.min(
      a.h,
      1.6 +
        Math.max(
          ...d.profiles.map((p) =>
            sheet.need(body(p), a.w / d.profiles.length - 0.6, {
              size: PT.base,
              color: c.ink,
            }),
          ),
        ),
    );
    cellAreas(d.profiles.length, { ...a, h: ch }, 0.3).forEach((r, i) => {
      const p = d.profiles[i];
      const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
      sheet.card(r, sheet.c.plainCard);
      sheet.portrait(p, { x: r.x + 0.25, y: r.y + 0.25, d: 0.9 }, tone);
      sheet.box(
        [
          { runs: [{ text: p.name }], ...TITLE, rel: PT.h4 / PT.base, after: 2 },
          { runs: [{ text: p.title, options: { color: tone } }], after: 2 },
          { runs: [{ text: p.company, options: { color: c.muted } }] },
        ],
        { x: r.x + 1.35, y: r.y + 0.25, w: r.w - 1.6, h: 1.1 },
        { size: PT.base, color: c.ink, valign: "middle" },
      );
      sheet.box(
        body(p),
        { x: r.x + 0.25, y: r.y + 1.45, w: r.w - 0.5, h: r.h - 1.6 },
        {
          size: PT.base,
          color: c.ink,
        },
      );
    });
    footer(sheet, foot);
  },

  "phased-pills"(sheet, d) {
    const y = d.title ? header(sheet, { headline: d.title }) : TOP;
    pillPhases(sheet, d.phases, { x: EDGE + CW * 0.2, y, w: CW * 0.6, h: BOTTOM - y });
  },

  process(sheet, d) {
    // `ProcessSlide` on a desktop and in print: the nodes as the flow block's steps, the loop back
    // above unless `loop: false`, the named phase lit, the footer as the caption under them.
    const y = header(sheet, d);
    const steps: FlowStep[] = d.nodes.map((n) => ({
      title: n.title,
      text: n.description || undefined,
      label: n.label,
      subtitle: n.subtitle || undefined,
      badge: n.badge,
      dim: n.dimmed,
      numbered: n.numbered,
    }));
    const named = d.nodes.findIndex((n) => isHighlightPhase(n.title, d.highlightPhase));
    const o = {
      highlight: named < 0 ? undefined : named,
      loop: d.loop === false ? undefined : "",
      k: 1,
    };
    const a = BODY(y);
    const sh = flowSteps(drySheet(sheet), steps, a, o);
    const capH = d.footer ? caption(drySheet(sheet), d.footer, 0) + 0.37 : 0;
    const top = a.y + Math.max(0, a.h - sh - capH) / 2.25;
    flowSteps(sheet, steps, { ...a, y: top }, o);
    if (d.footer) caption(sheet, d.footer, top + sh + 0.37);
  },

  lanes(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const codeH = d.codeSnippet
      ? (d.codeSnippet.code.split("\n").length * PT.sm * 1.3) / 72 + 0.45
      : 0;
    const foot = footerOf(sheet, d.footer);
    const rows = rowShare(LANE_ROWS, BOTTOM - y - codeH - foot.h - 0.3, d.lanes.length);
    if (rows.warning) sheet.warn(rows.warning);
    const lh = rows.height - 0.12;
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
      sheet.rounded(
        { x: EDGE, y: ly, w: CW, h: lh },
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
      const stages: ChipRow = {
        labels: lane.stages.map((text) => ({ text, fill: c.card })),
        size: PT.sm,
        color: c.ink,
        gap: 0.3,
        arrowColor: c.purple,
      };
      const x = EDGE + 2;
      const layout = layoutChipRow(stages, { x, y: ly + lh / 2 }, EDGE + CW - 0.25 - x);
      drawChipRow(sheet, layout);
    });
    footer(sheet, foot);
  },

  chart(sheet, d) {
    const { slide: s } = sheet;
    const { pptx } = sheet.out;
    const { c } = sheet;
    const y = header(sheet, d);
    // The web's `Annotation`, under the card or the drawing.
    const annotate = (x: number, top: number, w: number, h: number) =>
      d.annotation &&
      sheet.box(
        d.annotation,
        { x, y: top, w, h },
        {
          size: PT.base,
          color: c.purple,
          align: "center",
        },
      );
    if ((d.variant === "trend" || d.variant === "bar") && d.data?.length) {
      const data = d.data;
      const trend = d.variant === "trend";
      const labels = data.map((p) => p.name);
      // A marked trend is measured up to the point and planned from it, both holding the point,
      // as on the web slide; `finishChart` dashes the planned half once the chart is written.
      const now = trend ? data.findIndex((p) => p.name === d.currentMarker) : -1;
      const halves = (name: string, pick: (p: (typeof data)[number]) => number | null) => [
        { name, labels, values: data.map((p, i) => (now < 0 || i <= now ? pick(p) : null)) },
        ...(now < 0
          ? []
          : [
              {
                name: `${name} (${sheet.words.planned})`,
                labels,
                values: data.map((p, i) => (i >= now ? pick(p) : null)),
              },
            ]),
      ];
      const two = data.some((p) => p.value2 !== undefined);
      const series = [
        ...halves(d.seriesLabel ?? d.yLabel ?? "", (p) => p.value),
        // A point without a second value is a gap, as on the web, never a zero.
        ...(two ? halves(d.series2Label ?? "", (p) => p.value2 ?? null) : []),
      ] as { name: string; labels: string[]; values: number[] }[];
      const hues = two ? [c.teal, c.purple] : [c.teal];
      // The card as `ChartFrame` draws it, the legend above it and the annotation below, centred
      // in the body as the web centres them; a long annotation may take two lines.
      const a = BODY(y);
      const legend = trend && !!(d.seriesLabel || d.series2Label);
      const above = legend ? CHART.legend : 0;
      const below = d.annotation ? CHART.note + CHART.noteLine : 0;
      const h = Math.min(CHART.h, a.h - above - below - (d.annotation ? CHART.noteLine : 0));
      const f = {
        x: (W - CHART.w) / 2,
        y: a.y + above + Math.max(0, (a.h - above - h - below) / 2),
        w: CHART.w,
        h,
      };
      sheet.card(f, sheet.c.plainCard);
      annotate(f.x, f.y + f.h + CHART.note, f.w, 2 * CHART.noteLine);
      // `Axes`: the y label and the note over the plot, the x label under it.
      const inner = {
        x: f.x + CHART.pad,
        y: f.y + CHART.pad,
        w: f.w - 2 * CHART.pad,
        h: f.h - 2 * CHART.pad,
      };
      const labelO: BoxOpts = { size: PT.sm, color: c.muted };
      const label = (
        text: string | undefined,
        x: number,
        top: number,
        w: number,
        align: BoxOpts["align"],
        h = CHART.line,
      ) => text && sheet.box(text, { x, y: top, w, h }, { ...labelO, align });
      const note = trend ? d.futureNote : undefined;
      // The y label and the note in one row 2 rem apart, each shrinking by its share of the
      // overflow and wrapping, as the web's flex row sets them.
      const gapX = 2 * REM;
      const basis = [d.yLabel, note].map((t) => (t ? textWidth(t, labelO) + 0.02 : 0));
      const over = Math.max(0, basis[0] + basis[1] + gapX - inner.w);
      const sum = basis[0] + basis[1] || 1;
      const [yw, nw] = basis.map((b) => b - (over * b) / sum);
      const lineH = (n: number) => Math.max(1, n) * CHART.line;
      const lines = (t: string | undefined, w: number) =>
        t ? Math.round(sheet.need(t, w, labelO) / ((PT.sm * LEADING.body) / 72)) : 0;
      const headH = lineH(Math.max(lines(d.yLabel, yw), lines(note, nw)));
      const head = d.yLabel || note ? headH + CHART.underHead : 0;
      label(d.yLabel, inner.x, inner.y, yw, "left", headH);
      label(note, inner.x + inner.w - nw, inner.y, nw, "right", headH);
      const foot = d.xLabel ? CHART.line + CHART.overFoot : 0;
      label(d.xLabel, inner.x, inner.y + inner.h - CHART.line, inner.w, "center");
      // The chart reaches up over the card for its legend, which PowerPoint sets at its top.
      const plot = { x: inner.x, y: inner.y + head, w: inner.w, h: inner.h - head - foot };
      const top = legend ? f.y - CHART.legend : plot.y;
      const r = { ...plot, y: top, h: plot.y + plot.h - top };
      let scale = {};
      // A marked trend's names, set under its points once the chart is drawn.
      let names = () => {};
      if (trend) {
        // The plot where recharts draws it, less its x axis's padding, which a chart's categories
        // cannot take; the value axis on the web's ticks.
        const ticks = trendTicks(data);
        const lo = ticks[0];
        const hi = ticks[ticks.length - 1];
        // A point's name centres on it, so the axis pads each end by what the first and last
        // names overhang the margin beside them, as `TrendPlot` does.
        const edge = (i: number) => textWidth(labels[i], { size: PT.sm, bold: i === now }) / 2;
        const padL = Math.max(24 / 144, edge(0) - CHART.left);
        const padR = Math.max(8 / 144, edge(labels.length - 1) - CHART.right);
        const g = {
          x: plot.x + CHART.left + padL,
          y: plot.y + CHART.top,
          w: plot.w - CHART.left - CHART.right - padL - padR,
          h: plot.h - CHART.top - CHART.bottom,
        };
        const xAt = (i: number) => (i / Math.max(1, data.length - 1)) * g.w;
        const yAt = (v: number) => ((hi - v) / (hi - lo)) * g.h;
        scale = {
          layout: { x: (g.x - r.x) / r.w, y: (g.y - r.y) / r.h, w: g.w / r.w, h: g.h / r.h },
          valAxisMinVal: lo,
          valAxisMaxVal: hi,
          valAxisMajorUnit: ticks[1] - lo,
        };
        // recharts fills a lone series' measured part down to 0; a chart's area series would
        // fall to zero after its last value, so the fill is a shape under the chart's plot.
        // A chart's category names take one style, so a marked trend sets each as text under its
        // point, the marked one in teal and bold as the web's tick, and a dashed guide from the dot
        // down to the axis.
        if (now >= 0)
          names = () => {
            const wide = g.w / Math.max(1, data.length - 1);
            // From under the dot, a marker of 11 pt, so the guide stays behind it as on the web.
            const dot = g.y + yAt(data[now].value) + 11 / 72 / 2;
            s.addShape("line", {
              x: g.x + xAt(now),
              y: dot,
              w: 0.001,
              h: Math.max(0, g.y + g.h - dot),
              line: { color: c.teal, width: 1.5, dashType: "dash" },
            });
            labels.forEach((name, i) => {
              const lw = Math.min(wide, 2 * edge(i) + 0.1);
              sheet.box(
                name,
                { x: g.x + xAt(i) - lw / 2, y: g.y + g.h + CHART.tick, w: lw, h: CHART.line },
                {
                  size: PT.sm,
                  color: i === now ? c.teal : c.muted,
                  bold: i === now,
                  align: "center",
                },
              );
            });
          };
        const filled = now < 0 ? data.length : now + 1;
        if (!two && filled > 1) {
          s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
            ...g,
            fill: { color: mixColor(c.teal, c.card, 0.07) },
            line: { type: "none" },
            points: [
              { x: 0, y: yAt(0), moveTo: true },
              ...data.slice(0, filled).map((p, i) => ({ x: xAt(i), y: yAt(p.value) })),
              { x: xAt(filled - 1), y: yAt(0) },
              { close: true },
            ],
          });
        }
      }
      // A bar's names wrap level at their band in the first of the web's steps where every word
      // fits it, else tilt at the last, as `tickLayout` sets them.
      const band = (plot.w / data.length) * 0.9;
      const step = TICK_STEPS.find(
        (pt) =>
          Math.max(...labels.flatMap((l) => l.split(" ").map((w) => textWidth(w, { size: pt })))) <=
          band,
      );
      // The web's legend has an entry for a named series only.
      const perSeries = now < 0 ? 1 : 2;
      const unnamed = [d.seriesLabel, ...(two ? [d.series2Label] : [])].flatMap((name, i) =>
        name ? [] : [i * perSeries],
      );
      sheet.out.charts.set(
        sheet.out.charts.size + 1,
        trend ? { now, unnamed } : { level: step !== undefined },
      );
      s.addChart(trend ? pptx.ChartType.line : pptx.ChartType.bar, series, {
        ...r,
        chartColors: now < 0 ? hues : hues.flatMap((hue) => [hue, hue]),
        lineSize: 2.5,
        lineDataSymbol: "none",
        barDir: "col",
        showLegend: legend,
        legendPos: "t",
        legendFontFace: SANS,
        legendFontSize: PT.sm,
        legendColor: c.ink,
        catAxisLabelFontFace: SANS,
        valAxisLabelFontFace: SANS,
        catAxisLabelColor: c.muted,
        valAxisLabelColor: c.muted,
        catAxisLabelFontSize: trend ? PT.sm : (step ?? TICK_STEPS[TICK_STEPS.length - 1]),
        valAxisLabelFontSize: PT.sm,
        valGridLine: { color: c.border, size: 0.5 },
        catAxisLineShow: true,
        valAxisLineShow: false,
        ...scale,
        // Bars carry their value on top instead of a value axis, as on the web slide.
        ...(!trend && {
          showValue: true,
          dataLabelPosition: "outEnd",
          dataLabelFontFace: MONO,
          dataLabelFontSize: PT.base,
          dataLabelFontBold: true,
          dataLabelColor: c.ink,
          valAxisHidden: true,
          valGridLine: { style: "none" },
        }),
      });
      names();
      return;
    }
    const a = { ...BODY(y), h: BOTTOM - y - (d.annotation ? 0.4 : 0) };
    if (d.variant === "cycle") {
      // The adoption curve as the web draws it: a bell curve, its area split into the segments'
      // shares, each segment's label and share under it.
      const segs = d.segments ?? [];
      const g = { x: a.x + 1, y: a.y + 0.3, w: a.w - 2, h: a.h - 1.1 };
      const bell = (t: number) => Math.exp(-0.5 * ((t - 0.5) / 0.18) ** 2);
      curve(sheet, g, bell);
      let acc = 0;
      segs.forEach((seg, i) => {
        const from = acc;
        acc += seg.percentage / 100;
        if (i < segs.length - 1) {
          const h = bell(acc) * g.h;
          s.addShape("line", {
            x: g.x + acc * g.w,
            y: g.y + g.h - h,
            w: 0.001,
            h,
            line: { color: c.bg, width: 1.5, dashType: "dash" },
          });
        }
        const cur = i === d.currentSegmentIndex;
        sheet.box(
          [
            { runs: [{ text: seg.label }], bold: cur },
            { runs: [{ text: `${seg.percentage}%`, options: { color: c.muted } }] },
          ],
          { x: g.x + from * g.w, y: g.y + g.h + 0.1, w: (acc - from) * g.w, h: 0.6 },
          { size: PT.sm, color: cur ? c.teal : c.ink, align: "center" },
        );
      });
    } else {
      // The graph variant as the web draws it: a curve rising to the right, a marked point at 60 of
      // its 100 steps, the axis labels beside it.
      const g = { x: a.x + 1.5, y: a.y + 0.2, w: a.w - 3, h: a.h - 0.8 };
      curve(sheet, g, (t) => Math.exp(t * 3) / Math.exp(3));
      s.addShape("line", {
        x: g.x,
        y: g.y + g.h,
        w: g.w,
        h: 0.001,
        line: { color: c.muted, width: 1 },
      });
      s.addShape("line", { x: g.x, y: g.y, w: 0.001, h: g.h, line: { color: c.muted, width: 1 } });
      if (d.xLabel)
        sheet.box(
          d.xLabel,
          { x: g.x, y: g.y + g.h + 0.1, w: g.w, h: 0.3 },
          {
            size: PT.sm,
            color: c.muted,
            align: "center",
          },
        );
      if (d.yLabel)
        sheet.box(
          d.yLabel,
          { x: a.x, y: g.y + g.h / 2 - 0.3, w: 1.4, h: 0.6 },
          {
            size: PT.sm,
            color: c.muted,
            align: "right",
            valign: "middle",
          },
        );
      if (d.futureNote)
        sheet.box(
          d.futureNote,
          { x: g.x + 0.1, y: g.y, w: g.w / 2, h: 0.3 },
          { size: PT.sm, color: c.muted },
        );
      if (d.currentMarker) {
        const t = 60 / 99;
        const mx = g.x + t * g.w;
        const my = g.y + g.h - (Math.exp(t * 3) / Math.exp(3)) * g.h;
        s.addShape("ellipse", {
          x: mx - 0.09,
          y: my - 0.09,
          w: 0.18,
          h: 0.18,
          fill: { color: c.teal },
          line: { color: c.card, width: 1.5 },
        });
        sheet.box(
          d.currentMarker,
          { x: mx - 1.6, y: my - 0.4, w: 1.5, h: 0.3 },
          {
            size: PT.sm,
            mono: true,
            bold: true,
            color: c.teal,
            align: "right",
          },
        );
      }
    }
    annotate(EDGE, BOTTOM - 0.35, CW, 0.35);
  },

  question(sheet, d) {
    // As QuestionSlide in print: the headline as a display heading, under it the options as white
    // cards in a 56 rem column, each its letter, its text and its count, centred above the footer band.
    const { c } = sheet;
    const head: BoxOpts = {
      size: PT.s6,
      mono: true,
      bold: true,
      color: c.ink,
      tracking: -0.04,
      line: LEADING.display,
      align: "center",
    };
    const hp: Para = { ...literal(d.headline), balance: true };
    const hh = sheet.need(hp, CW, head);
    const w = Math.min(CW, 56 * REM);
    const oh = 2.5 * REM + (PT.h4 * 1.4) / 72;
    const total = hh + 3.5 * REM + d.options.length * (oh + REM) - REM;
    const top = Math.max(TOP, (BOTTOM - total) / 2);
    sheet.box(hp, { x: EDGE, y: top, w: CW, h: hh }, head);
    const x = (W - w) / 2;
    d.options.forEach((op, i) => {
      const oy = top + hh + 3.5 * REM + i * (oh + REM);
      sheet.card({ x, y: oy, w, h: oh }, sheet.c.plainCard);
      const mid = { valign: "middle" } as const;
      sheet.box(
        literal(op.label),
        { x: x + 1.5 * REM, y: oy, w: 2 * REM, h: oh },
        {
          size: 14,
          mono: true,
          bold: true,
          color: c.muted,
          ...mid,
        },
      );
      sheet.box(
        op.text,
        { x: x + 4.5 * REM, y: oy, w: w - 10 * REM, h: oh },
        {
          size: 17.5,
          color: c.ink,
          line: 1.4,
          ...mid,
        },
      );
      sheet.box(
        literal("0"),
        { x: x + w - 5.5 * REM, y: oy, w: 4 * REM, h: oh },
        {
          size: PT.h4,
          mono: true,
          bold: true,
          color: c.teal,
          align: "right",
          ...mid,
        },
      );
    });
  },

  transition(sheet, d) {
    const { c } = sheet;
    const paras: Para[] = [];
    if (d.preText)
      paras.push({
        runs: [caps(d.preText, { color: c.teal })],
        mono: true,
        bold: true,
        rel: PT.lead / PT.display,
        after: 14,
      });
    paras.push({ ...literal(d.headline), mono: true, bold: true, after: 14 });
    if (d.subtitle) paras.push({ ...literal(d.subtitle), rel: PT.lead / PT.display });
    const speakerH = d.speakerName ? 1.1 : 0;
    const o: BoxOpts = {
      size: PT.display,
      color: c.ink,
      align: "center",
      valign: "middle",
      line: 1.1,
      floor: 0.5,
    };
    const th = Math.min(BOTTOM - TOP - speakerH, sheet.need(paras, CW - 1, o) + 0.2);
    const ty = TOP + (BOTTOM - TOP - th - speakerH) / 2;
    sheet.box(paras, { x: EDGE + 0.5, y: ty, w: CW - 1, h: th }, o);
    if (d.speakerName) {
      const sw = Math.max(2.6, (d.speakerName.length * PT.h3 * 0.62) / 72 + 0.8);
      sheet.card({ x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 }, sheet.c.plainCard);
      sheet.box(
        [
          {
            runs: [{ text: d.speakerName, options: { color: c.teal } }],
            mono: true,
            bold: true,
            after: 2,
          },
          ...(d.speakerCompany ? [{ runs: [{ text: d.speakerCompany }], rel: 0.65 }] : []),
        ],
        { x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 },
        { size: PT.h3, color: c.ink, align: "center", valign: "middle" },
      );
    }
  },

  closing(sheet, d) {
    const { c } = sheet;
    if (d.variant === "discussion") {
      const y = header(sheet, { headline: d.headline ?? d.line1 ?? sheet.words.discussion });
      // Each seed question on its own card, as the web's: 1.25 rem over and under it, 2 rem
      // beside, 1.5 rem between the cards, the question muted.
      const a = BODY(y);
      const [padY, padX, gap] = [1.25 * REM, 2 * REM, 1.5 * REM];
      const o: BoxOpts = { size: PT.h4, color: c.muted, line: 1.35 };
      const qs = d.seedQuestions ?? [];
      const hs = qs.map((q) => sheet.need(literal(q), a.w - 2 * padX, o));
      const total = hs.reduce((sum, h) => sum + h + 2 * padY, 0) + Math.max(0, qs.length - 1) * gap;
      let qy = a.y + Math.max(0, a.h - total) / 2.25;
      qs.forEach((q, i) => {
        sheet.card({ x: a.x, y: qy, w: a.w, h: hs[i] + 2 * padY }, sheet.c.plainCard);
        sheet.box(literal(q), { x: a.x + padX, y: qy + padY, w: a.w - 2 * padX, h: hs[i] }, o);
        qy += hs[i] + 2 * padY + gap;
      });
      return;
    }
    // As ContactVariant: the line, the mark row, the speakers and the closing lines 3.5 rem apart,
    // the column centred in the slide; drawn once on DRY to measure it.
    const gap = 3.5 * REM;
    const column = (sheet: Sheet, y: number) => {
      const { slide: s } = sheet;
      const head = d.line1;
      if (head) {
        const o: BoxOpts = {
          size: PT.display,
          mono: true,
          bold: true,
          color: c.ink,
          tracking: -0.04,
          line: LEADING.display,
          align: "center",
        };
        const hh = sheet.need(literal(head), CW, o);
        sheet.box({ ...literal(head), balance: true }, { x: EDGE, y, w: CW, h: hh }, o);
        y += hh + gap;
      }
      const speakers = d.speakers ?? [];
      if (centredMark(d)) {
        // The web's contact slide without portraits: the lockup in the centre column, each speaker's
        // name and contact lines under it.
        const lockH = 91.7 / 144;
        const [path, ratio] = brandCut(`lockup${sheet.dark ? "-night" : ""}`);
        const lockW = lockH * ratio;
        // As on the web: each partner's logo at the lockup's height, a × after it.
        const partners = d.partners ?? [];
        const times = 0.5;
        const pad = 0.35;
        const partnerW = partners.map((p) => (lockH * p.width) / p.height);
        let x = (W - lockW - partnerW.reduce((sum, w) => sum + w + 2 * pad + times, 0)) / 2;
        partners.forEach((p, i) => {
          sheet.picture(p.src, { x, y, w: partnerW[i], h: lockH }, { alt: p.alt ?? p.company });
          sheet.box(
            "×",
            { x: x + partnerW[i] + pad, y, w: times, h: lockH },
            {
              size: PT.s6,
              color: c.muted,
              align: "center",
              valign: "middle",
            },
          );
          x += partnerW[i] + 2 * pad + times;
        });
        s.addImage({
          path,
          x,
          y,
          w: lockW,
          h: lockH,
          altText: HW_LOGO.alt,
        });
        y += lockH + gap;
        const shown = companiesWithLogo(d);
        for (const sp of speakers) {
          const paras: Para[] = [
            { runs: [{ text: sp.name }], mono: true, bold: true, rel: PT.h4 / 17.5, after: 2 },
            ...(shown.has(sp.company.toLowerCase())
              ? []
              : [
                  {
                    runs: [caps(sp.company, { color: c.muted })],
                    rel: 0.8,
                    after: 2,
                  },
                ]),
            ...(sp.contact
              ? [
                  {
                    runs: [
                      {
                        text: sp.contact,
                        options: {
                          color: c.teal,
                          ...(sp.contact.includes("@")
                            ? { hyperlink: { url: `mailto:${sp.contact}` } }
                            : {}),
                        },
                      },
                    ],
                  },
                ]
              : []),
            ...(sp.linkedIn
              ? [
                  {
                    runs: [
                      {
                        text: profileLabel(sp.linkedIn),
                        options: { color: c.teal, hyperlink: { url: sp.linkedIn } },
                      },
                    ],
                  },
                ]
              : []),
          ];
          const po: BoxOpts = { size: 17.5, color: c.ink, line: 1.4, align: "center" };
          const ph = sheet.need(paras, CW, po);
          sheet.box(paras, { x: EDGE, y, w: CW, h: ph }, po);
          y += ph + 2 * REM;
        }
        y += gap - 2 * REM;
      } else if (speakers.length) {
        const sw = Math.min(3.2, CW / speakers.length);
        // The LinkedIn address under the contact, a line at 0.8 of the size.
        const linked = speakers.some((sp) => sp.linkedIn) ? 0.3 : 0;
        const sx = (W - sw * speakers.length) / 2;
        speakers.forEach((sp, i) => {
          const x = sx + i * sw;
          const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
          sheet.portrait(sp, { x: x + sw / 2 - 0.55, y, d: 1.1 }, tone);
          sheet.box(
            [
              { runs: [{ text: sp.name }], mono: true, bold: true, after: 2 },
              {
                runs: [caps(sp.company, { color: tone })],
                mono: true,
                bold: true,
                rel: 0.7,
                after: 6,
              },
              ...(sp.contact
                ? [
                    {
                      runs: [
                        {
                          text: sp.contact,
                          options: {
                            color: tone,
                            ...(sp.contact.includes("@")
                              ? { hyperlink: { url: `mailto:${sp.contact}` } }
                              : {}),
                          },
                        },
                      ],
                      rel: 0.8,
                    },
                  ]
                : []),
              ...(sp.linkedIn ? [{ ...profileLink(sp.linkedIn, c), rel: 0.8 }] : []),
            ],
            { x, y: y + 1.2, w: sw, h: 1 + linked },
            { size: PT.h4, color: c.ink, align: "center" },
          );
        });
        y += 2.35 + linked + gap;
      }
      const tail: Para[] = [];
      const claim = closingClaim(d, sheet.lang);
      if (claim) {
        // The claim in muted ink, the word brand names for it in teal, one step below a quote's
        // lead, as ClosingSlide draws it.
        const [before, word, after] = claimParts(claim);
        tail.push({
          rel: PT.h4 / PT.lead,
          runs: [
            { text: before, options: { color: c.muted } },
            { text: word, options: { color: c.teal } },
            { text: after, options: { color: c.muted } },
          ].filter((r) => r.text),
          mono: true,
          bold: true,
          after: gap * 72,
          align: "center",
          balance: true,
        });
      }
      if (d.closingQuote) {
        const mark = { color: mixColor(c.teal, c.bg, 0.7) };
        tail.push({
          runs: [
            { text: "“", options: mark },
            ...md(d.closingQuote, c, { color: c.muted }),
            { text: "”", options: mark },
          ],
          mono: true,
          bold: true,
          align: "center",
          balance: true,
        });
      }
      if (tail.length) {
        const o: BoxOpts = { size: PT.lead, color: c.muted, line: 1.25, tracking: -0.025 };
        // max-w-7xl less the web line's 5vw sides (--slide-closing-side), EDGE at the 1920 stage.
        const tw = Math.min(CW, 80 * REM) - 2 * EDGE;
        const th = sheet.need(tail, tw, o);
        sheet.box(tail, { x: (W - tw) / 2, y, w: tw, h: th }, o);
        return y + th;
      }
      return y - gap;
    };
    // The measuring pass warns as the drawing pass will: its warnings are dropped.
    const height = column(drySheet(sheet), 0);
    column(sheet, (H - height) / 2);
  },

  // As the web's RoadmapSlide: each column a card holding its items, or its phases as groups of
  // rows under a caps label.
  roadmap(sheet, d) {
    const { c } = sheet;
    // A row's own marker colour: `tone`, or the class its deprecated `dotColor` names.
    const marker = (it: Pick<RoadmapItem, "tone" | "dotColor">) => {
      const t = it.tone ?? it.dotColor?.slice(3);
      return t ? (c[THEME[t as MarkerTone]] as string) : undefined;
    };
    const y = header(sheet, d);
    cellAreas(d.columns.length, BODY(y), 0.35).forEach((r, i) => {
      const col = d.columns[i];
      const tone = col.accent === "deepdive" ? c.purple : c.teal;
      const groups: {
        label?: string;
        hue: string;
        items: (RoadmapItem & { number?: number })[];
      }[] = col.phases
        ? col.phases.map((p) => ({
            label: p.label,
            hue: c[THEME[p.theme ?? "secondary"]] as string,
            items: p.items,
          }))
        : [{ hue: tone, items: col.items ?? [] }];
      sheet.card(r, { fill: mixColor(tone, c.bg, 0.05), line: c.border });
      sheet.rect({ x: r.x + 0.15, y: r.y, w: r.w - 0.3, h: 0.05 }, tone);
      const label: Chip = {
        text: col.label,
        size: PT.label * 0.85,
        fill: mixColor(tone, c.bg, 0.15),
        color: tone,
      };
      drawChip(sheet, label, chipArea(label, { x: r.x + 0.25, y: r.y + 0.25 }));
      sheet.box(
        [
          { runs: md(col.title, c), mono: true, bold: true, rel: PT.h3 / PT.base, after: 4 },
          ...(col.subtitle ? [{ runs: md(col.subtitle, c, { color: c.muted }), after: 10 }] : []),
          ...groups.flatMap((g) => [
            ...(g.label
              ? [
                  {
                    runs: [caps(g.label, { color: g.hue })],
                    mono: true,
                    bold: true,
                    rel: 0.8,
                    after: 4,
                  },
                ]
              : []),
            ...g.items.flatMap((it) => [
              {
                runs: [
                  it.number === undefined
                    ? { text: "•  ", options: { color: marker(it) ?? g.hue } }
                    : {
                        text: `${it.number}  `,
                        options: { color: g.hue, bold: true, fontFace: MONO },
                      },
                  { text: it.title, options: { bold: true, fontFace: MONO } },
                ],
                after: 2,
              },
              ...(it.description
                ? [{ runs: md(it.description, c, { color: c.muted }), after: 8 }]
                : []),
            ]),
          ]),
        ],
        { x: r.x + 0.25, y: r.y + 0.65, w: r.w - 0.5, h: r.h - 0.8 },
        { size: PT.base, color: c.ink },
      );
    });
  },

  gantt(sheet, d) {
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
    const rows = rowShare(GANTT_ROWS, BOTTOM - top - foot.h - msH + sp(2), d.rows.length);
    if (rows.warning) sheet.warn(rows.warning);
    const pitch = rows.height;
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
  },

  "team-topology"(sheet, d) {
    const y = header(sheet, d);
    const a = BODY(y);
    // The web's fit guard: the whole body shrinks until it fits.
    let k = 1;
    while (k > 0.6 && topology(drySheet(sheet), d, a, k) > a.h) k -= 0.02;
    const h = topology(drySheet(sheet), d, a, k);
    topology(sheet, d, { ...a, y: a.y + Math.max(0, a.h - h) / 2.25 }, k);
  },

  agenda(sheet, d) {
    const { c } = sheet;
    const y = header(sheet, d);
    const items = d.items.map((it) => (typeof it === "string" ? { title: it } : it));
    const timed = items.some((it) => it.when);
    // A title stands after the widest time, its line under it after the tab too: the stop is the
    // widest time's, or the widest number's where no item names a time.
    const lead = timed ? items.map((it) => it.when ?? "") : [`${items.length}.  `];
    const tabs = [Math.max(...lead.map((t) => chipAdvance(t, true))) * PT.h3 + (timed ? 0.3 : 0)];
    const paras: Para[] = items.flatMap((it, i) => [
      {
        runs: [
          {
            text: timed
              ? `${it.when !== items[i - 1]?.when ? (it.when ?? "") : ""}\t`
              : `${i + 1}.  `,
            options: { color: c.teal, bold: true, fontFace: MONO },
          },
          ...md(it.title, c),
        ],
        after: it.text ? 2 : 10,
        tabs,
      },
      ...(it.text
        ? [
            {
              runs: [{ text: "\t" }, ...md(it.text, c, { color: c.muted })],
              rel: 0.75,
              after: 10,
              tabs,
            },
          ]
        : []),
    ]);
    const foot = footerOf(sheet, d.footer);
    sheet.box(
      paras,
      { x: EDGE, y: y + 0.2, w: CW * 0.8, h: BOTTOM - y - 0.2 - foot.h },
      {
        size: PT.h3,
        color: c.ink,
      },
    );
    footer(sheet, foot);
  },

  activity(sheet, d) {
    const { c } = sheet;
    const label =
      d.label ?? { exercise: "Hands-on", demo: "Live demo", debrief: "Debrief" }[d.kind];
    const y = header(sheet, { sectionLabel: label, headline: d.headline, subtitle: d.task });
    const frame = [d.duration, d.mode, d.outcome].filter((t): t is string => !!t);
    const fw = frame.length ? CW * 0.34 : 0;
    let top = y + 0.3;
    if (d.prompt) {
      const ph = sheet.need(d.prompt, CW - 0.6, { size: PT.lead, color: c.ink }) + 0.3;
      sheet.card({ x: EDGE, y: top, w: CW, h: ph }, sheet.c.litCard);
      sheet.box(
        d.prompt,
        { x: EDGE + 0.3, y: top + 0.15, w: CW - 0.6, h: ph - 0.3 },
        {
          size: PT.lead,
          color: c.ink,
        },
      );
      top += ph + 0.3;
    }
    const paras: Para[] = d.items.map((it, i) => ({
      runs: [
        ...(d.kind === "demo"
          ? []
          : [{ text: `${i + 1}.  `, options: { color: c.teal, bold: true, fontFace: MONO } }]),
        ...md(it, c),
      ],
      bullet: d.kind === "demo",
      after: 10,
    }));
    sheet.box(
      paras,
      { x: EDGE, y: top, w: CW - fw - (fw ? 0.5 : 0), h: BOTTOM - top },
      {
        size: PT.lead,
        color: c.ink,
      },
    );
    if (!frame.length) return;
    const fx = EDGE + CW - fw;
    const fh = 0.5 + frame.length * 0.55;
    sheet.card({ x: fx, y: top, w: fw, h: fh }, sheet.c.plainCard);
    sheet.box(
      frame.map((t, i) => ({
        runs: md(t, c, i === 0 && d.duration ? {} : { color: c.muted }),
        mono: i === 0 && !!d.duration,
        bold: i === 0 && !!d.duration,
        rel: i === 0 && d.duration ? 1.4 : 1,
        after: 8,
      })),
      { x: fx + 0.3, y: top + 0.25, w: fw - 0.6, h: fh - 0.5 },
      { size: PT.base, color: c.ink },
    );
  },

  wheel(sheet, d) {
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
  },

  decision(sheet, d) {
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
      branch(br).reduce((sum, [p, o, gap]) => sum + gap + sheet.need(p, bIn, o), 0) +
      2 * 1.25 * REM;
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
      sheet.box(
        d.caption,
        { x: a.x, y: top + gridH + 1.5 * REM, w: a.w, h: capH - 1.5 * REM },
        capO,
      );
  },
};

/** A function over [0, 1] drawn as a polyline in the area, its values in [0, 1] from the bottom,
 *  with the area under it tinted. */
function curve(sheet: Sheet, g: Area, f: (t: number) => number) {
  const { slide: s } = sheet;
  const n = 100;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: (i / (n - 1)) * g.w,
    y: g.h - f(i / (n - 1)) * g.h,
  }));
  s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
    x: g.x,
    y: g.y,
    w: g.w,
    h: g.h,
    fill: { color: mixColor(sheet.c.teal, sheet.c.bg, 0.18) },
    line: { type: "none" },
    points: [{ x: 0, y: g.h, moveTo: true }, ...pts, { x: g.w, y: g.h }, { close: true }],
  });
  s.addShape("custGeom" as PptxGenJS.SHAPE_NAME, {
    x: g.x,
    y: g.y,
    w: g.w,
    h: g.h,
    line: { color: sheet.c.teal, width: 2.25 },
    points: [{ ...pts[0], moveTo: true }, ...pts.slice(1)],
  });
}

/** Phases of pills, numbered where an item carries one, as phased-pills and dual-pill-overview set them. */
function pillPhases(
  sheet: Sheet,
  phases: {
    label: string;
    theme?: SectionTheme;
    items: { number?: number; title: string; state?: string }[];
  }[],
  a: Area,
) {
  const { c } = sheet;
  const ph = Math.min(1, a.h / phases.length);
  phases.forEach((p, i) => {
    const py = a.y + i * ph;
    const tone = c[THEME[p.theme ?? "primary"]] as string;
    sheet.box(
      { runs: [{ text: "• " }, caps(p.label)] },
      { x: a.x, y: py, w: a.w, h: 0.25 },
      {
        size: PT.label,
        mono: true,
        bold: true,
        color: tone,
      },
    );
    const pills: ChipRow = {
      labels: p.items.map((it) => ({
        text: it.number === undefined ? it.title : `#${it.number} ${it.title}`,
        fill: it.state === "active" || it.state === "new" ? mixColor(tone, c.bg, 0.15) : c.card,
      })),
      size: PT.sm * 0.9,
      color: c.ink,
      gap: 0.12,
    };
    const layout = layoutChipRow(pills, { x: a.x, y: py + 0.32 }, a.w);
    drawChipRow(sheet, layout);
  });
}

// pptxgenjs sets a line's dash, its data markers and labels and where categories stand per chart.
// A trend's categories stand on the plot's edges, as recharts draws them. A marked trend's series
// alternate measured and planned: the planned ones get the dash and leave the legend, its first
// measured one the dot on the marked point. Its category names leave the axis for the text boxes
// the slide sets under the points.
function finishChart(xml: string, fix: ChartFix) {
  // pptxgenjs writes no angle of 0, and without one PowerPoint tilts long names.
  if ("level" in fix)
    return fix.level
      ? xml.replace(/(<c:catAx>.*?)<a:bodyPr\/>/s, '$1<a:bodyPr rot="0" vert="horz"/>')
      : xml;
  const { now, unnamed } = fix;
  const hideEntries = (out: string, hidden: number[]) =>
    out.replace(
      '<c:legendPos val="t"/>',
      `<c:legendPos val="t"/>${hidden
        .sort((a, b) => a - b)
        .map((i) => `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`)
        .join("")}`,
    );
  const edged = xml.replace('<c:crossBetween val="between"/>', '<c:crossBetween val="midCat"/>');
  if (now < 0) return hideEntries(edged, unnamed);
  const all = edged.match(/<c:ser>.*?<\/c:ser>/gs) ?? [];
  const planned = all.filter((_, i) => i % 2 === 1);
  const hue = /srgbClr val="(\w+)"/.exec(all[0] ?? "")?.[1];
  const dot = `<c:dPt><c:idx val="${now}"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="${hue}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${hex("--color-white")}"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt>`;
  return hideEntries(edged, [...planned.map((_, i) => 2 * i + 1), ...unnamed])
    .replace(/(<c:catAx>.*?<c:tickLblPos val=")\w+("\/>)/s, "$1none$2")
    .replace(/<c:ser>.*?<\/c:ser>/gs, (ser) =>
      planned.includes(ser)
        ? ser.replace('<a:prstDash val="solid"/>', '<a:prstDash val="dash"/>')
        : ser === all[0]
          ? ser.replace(
              /<c:dLbls>(.*?<\/c:dLbls>)\s*(<c:marker>.*?<\/c:marker>)/s,
              `$2${dot}<c:dLbls>$1`,
            )
          : ser,
    );
}

/** Builds the deck and checks the finished slides for overflow. Returns warnings for images or
 *  videos it could not place. */
export async function renderPptx(
  deck: Presentation,
  assets: string,
): Promise<{ zip: JSZip; warnings: string[] }> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.name;
  const deckLanguage = deckLang(deck);
  const lang = { de: "de-DE", en: "en-US" }[deckLanguage] ?? "en-US";
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const dark = deck.theme === "brand-dark";
  const deckLook = new Look(palette(dark), deckLanguage, dark);
  const out: Output = {
    pptx,
    assets,
    warnings: [],
    charts: new Map(),
  };
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightLook = new Look(palette(true), deckLanguage, true);
  // A slide's ground as the web's `--slide-ground`: its hue at 7 % on the background, which every
  // fill in the ground's colour takes too.
  const grounded = new Map<string, Look>();
  const lookOf = (slide: Slide | undefined) => {
    const base = dark || !slide || !isDeepDive(slide) ? deckLook : nightLook;
    const ground = slide ? groundOf(slide as Grounded) : "intro";
    if (ground === "intro") return base;
    const key = `${base.dark}-${ground}`;
    if (!grounded.has(key)) {
      const { c } = base;
      const hue = { primary: c.teal, secondary: c.purple, accent: c.amber, success: c.green }[
        ground
      ];
      grounded.set(key, base.grounded(hue));
    }
    return grounded.get(key)!;
  };
  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const sheet = new Sheet(lookOf(slide), s, out);
    frame(sheet, deck, i);
    const drawn = slideDrawn(slide);
    const render = RENDER[drawn.type as RenderedSlide["type"]] as Render | undefined;
    if (!render)
      throw new Error(
        `slide ${i + 1} is a ${JSON.stringify(slide.type)}, which slides-pptx cannot draw`,
      );
    render(sheet, drawn as never);
  });
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  // pptxgenjs numbers charts across every deck of the process: within one, they run in drawing order.
  const chartFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/.+\.xml$/.test(f))) {
    const raw = await zip.file(name)!.async("string");
    const fix = out.charts.get(chartFiles.indexOf(name) + 1);
    const xml = fix ? finishChart(raw, fix) : raw;
    const n = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    const slideC = lookOf(n ? deck.slides[Number(n[1]) - 1] : undefined).c;
    zip.file(
      name,
      xml
        // Each font reference names its pitch and family class, so PowerPoint on a machine without
        // the brand fonts substitutes a sans for Inter and a monospace for JetBrains Mono instead of
        // its default face. pptxgenjs writes the typeface alone, or a sans pitch for every face in
        // a table.
        .replace(
          /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
          (m, face: string) =>
            PITCH[face] ? `typeface="${face}" pitchFamily="${PITCH[face]}" charset="0"` : m,
        )
        // pptxgenjs marks every run en-US, so PowerPoint's spelling and hyphenation take a German
        // deck for English.
        .replaceAll('lang="en-US"', `lang="${lang}"`)
        .replaceAll(`lang="${CAPS}"`, `lang="${lang}" cap="all"`)
        // pptxgenjs writes one `adj` for any preset: the brand corner's two radii, 4 to 1.
        .replace(
          /prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val (\d+)"\/>/g,
          (_, v: string) =>
            `prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val ${v}"/><a:gd name="adj2" fmla="val ${Math.round(+v / 4)}"/>`,
        )
        // A bullet in the brand colour, as the web's square marker; pptxgenjs writes no bullet
        // colour. The brand faces have no square, so the bullet names Arial's, which every
        // PowerPoint has: at 130 % it is 0.29 em and stands 0.07 em above the web marker's
        // centre, a third of the text's size centred on its first line.
        .replace(/<a:buSzPct val="100000"\/><a:buChar char="&#x(\w+);"\/>/g, (_, code: string) => {
          const hue = HUE_OF_MARKER[code];
          const marked = hue ? slideC[hue] : slideC.teal;
          return `<a:buClr><a:srgbClr val="${marked}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${hue ? MARKER_SQUARE : code};"/>`;
        }),
    );
    if (n)
      for (const found of checkSlide(await zip.file(name)!.async("string"), W, H))
        out.warnings.push(`slide ${n[1]}: ${found}`);
  }
  return { zip, warnings: out.warnings };
}
