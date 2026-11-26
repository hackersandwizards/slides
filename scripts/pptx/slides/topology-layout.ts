import type { TeamTopologySlide } from "../../../types/slide";
import { teamTypesDrawn } from "../../../lib/people-slides";
import { textWidth } from "../fit";
import type { Look } from "../look";
import { PT, TITLE, type Area, type Place, spacing } from "../stage";
import type { StackItem } from "../stack";
import { md, type Para, type BoxOpts } from "../text";

export type TeamKind = ReturnType<typeof teamTypesDrawn>[number];

export interface TeamFrame {
  kind: TeamKind;
  area: Area;
  radius?: number;
}

interface TopologyBox {
  text: Para | string;
  area: Area;
  o: BoxOpts;
}

interface TopologyBlock {
  frame?: TeamFrame;
  boxes: TopologyBox[];
}

/** The look and typography held for one fitting scale. */
export function topologyStyle(look: Look, k: number) {
  // Sizes as drawn, in the half points pptxgenjs writes, so a box sized to its text holds it.
  const size = Math.round(PT.h4 * k * 2) / 2;
  const titleO: BoxOpts = { size, ...TITLE, color: look.c.ink, line: 1.25, tracking: -0.015 };
  const textO: BoxOpts = { size, color: look.c.ink, line: 1.375 };
  return { look, k, bd: (3 / 144) * k, titleO, textO };
}

type ScaledTopology = ReturnType<typeof topologyStyle>;

/** Measures a stack's height and its text offsets before placing it. */
export function topologyStack(look: Look, parts: StackItem[], width: number) {
  let height = 0;
  // Accumulate the gap before the origin is added so the placed coordinates keep their grouping.
  const lines = parts.map(({ text, o, gap }) => {
    const h = look.need(text, width, o);
    height += gap;
    const line = { text, o, h, offset: height };
    height += h;
    return line;
  });
  return { width, height, lines };
}

type TopologyStack = ReturnType<typeof topologyStack>;

/** Positions a measured stack from its drawing origin. */
export function topologyText({ width, lines }: TopologyStack, { x, y }: Place): TopologyBox[] {
  return lines.map(({ text, o, h, offset }) => ({
    text,
    area: { x, y: y + offset, w: width, h },
    o,
  }));
}

/** A team's roles as one line, each whole behind its own bullet, so a wrap falls between roles. */
export function topologyRoles(look: Look, labels: string[]): Para {
  return {
    runs: labels.flatMap((l, i) => [
      { text: `${i ? "   " : ""}\u2022\u00a0`, options: { color: look.c.muted, bold: true } },
      { text: l.replace(/ /g, "\u00a0"), options: { color: look.c.tealDark, bold: true } },
    ]),
    balance: true,
  };
}

/** Renders a team's name or description as a coloured Markdown paragraph. */
export function topologyLabel(look: Look, text: string, color: string): Para {
  return { runs: md(text, look.c, { color }) };
}

/** Measures each enabling column at the width its longest word needs. */
export function enablingColumns(scaled: ScaledTopology, teams: TeamTopologySlide["enabling"]) {
  // The enabling columns: 14 rem wide, wider where a word needs it, as `md:w-56 md:min-w-min`.
  const { look, k, bd, titleO, textO } = scaled;
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  return teams.map((team) => {
    const words = [
      ...team.name.split(/\s+/).map((w) => textWidth(w, titleO)),
      ...team.experts.flatMap((e) => e.split(/\s+/).map((w) => textWidth(w, textO))),
    ];
    const width = Math.max(sp(56), Math.max(...words) + 0.02 + 2 * sp(4) + 2 * bd);
    const parts = [
      { text: topologyLabel(look, team.name, c.purple), o: titleO, gap: 0 },
      ...team.experts.map((expert, i) => ({
        text: topologyLabel(look, expert, c.ink),
        o: { ...textO, line: 1.25 },
        gap: sp(i ? 2 : 1),
      })),
    ];
    const stack = topologyStack(look, parts, width - 2 * sp(4) - 2 * bd);
    return { width, stack, height: stack.height + 2 * sp(3) + 2 * bd };
  });
}

/** The stream-team frames and text with roles beside or below the name. */
export function streamRows(
  scaled: ScaledTopology,
  teams: TeamTopologySlide["streamAligned"],
  area: Area,
) {
  // The stream teams, a row each: the roles after the name where both fit one line.
  const { look, k, bd, titleO, textO } = scaled;
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  const sIn = area.w - 2 * sp(5) - 2 * bd;
  let sy = area.y;
  return teams.map((t) => {
    const nw = textWidth(t.name, titleO) + 0.02;
    const r = topologyRoles(look, t.roles);
    const rw = textWidth(r.runs.map((x) => x.text).join(""), { size: textO.size, bold: true });
    const beside = t.roles.length > 0 && nw + sp(6) + rw <= sIn;
    const name = topologyLabel(look, t.name, c.ink);
    const nh = look.need(name, sIn, titleO);
    const roleWidth = beside ? rw + 0.02 : sIn;
    const rh = t.roles.length ? look.need(r, roleWidth, textO) : 0;
    const h = 2 * sp(3) + 2 * bd + (beside ? Math.max(nh, rh) : nh + (rh && sp(2) + rh));
    const tx = area.x + bd + sp(5);
    const ty = sy + bd + sp(3);
    const line = beside ? Math.max(nh, rh) : nh;
    const frame: TeamFrame = { kind: "stream", area: { x: area.x, y: sy, w: area.w, h } };
    const boxes: TopologyBox[] = [
      {
        text: name,
        area: { x: tx, y: ty + (line - nh) / 2, w: beside ? nw : sIn, h: nh },
        o: titleO,
      },
    ];
    if (t.roles.length) {
      const place = beside
        ? { x: tx + nw + sp(6), y: ty + (line - rh) / 2 }
        : { x: tx, y: ty + nh + sp(2) };
      boxes.push({ text: r, area: { ...place, w: roleWidth, h: rh }, o: textO });
    }
    sy += h + sp(3);
    return { frame, boxes };
  });
}

/** Equal-width octagons below the streams, set to the tallest subsystem's text. */
export function subsystemRow(
  scaled: ScaledTopology,
  teams: NonNullable<TeamTopologySlide["complicatedSubsystem"]>,
  area: Area,
) {
  const { look, k, bd, titleO, textO } = scaled;
  if (!teams.length) return { blocks: [], height: 0 };
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  const w = (area.w - (teams.length - 1) * sp(4)) / teams.length;
  const inner = w - 2 * sp(7) - 2 * bd;
  const stacks = teams.map((team) =>
    topologyStack(
      look,
      [
        { text: topologyLabel(look, team.name, c.ink), o: titleO, gap: 0 },
        ...(team.description
          ? [{ text: topologyLabel(look, team.description, c.muted), o: textO, gap: sp(0.5) }]
          : []),
      ],
      inner,
    ),
  );
  const height = Math.max(...stacks.map((stack) => stack.height)) + 2 * sp(3) + 2 * bd;
  const blocks = stacks.map((stack, i): TopologyBlock => {
    const x = area.x + i * (w + sp(4));
    return {
      frame: { kind: "subsystem", area: { x, y: area.y, w, h: height } },
      boxes: topologyText(stack, { x: x + bd + sp(7), y: area.y + (height - stack.height) / 2 }),
    };
  });
  return { blocks, height };
}

/** Enabling columns, streams and subsystems share one body band. */
export function topologyMain(scaled: ScaledTopology, d: TeamTopologySlide, a: Area) {
  const sp = (v: number) => spacing(v, scaled.k);
  const enabling = enablingColumns(scaled, d.enabling);
  const mx = a.x + enabling.reduce((sum, team) => sum + team.width + sp(4), 0);
  const main = { x: mx, y: a.y, w: a.x + a.w - mx, h: a.h };
  const streams = streamRows(scaled, d.streamAligned, main);
  const last = streams.at(-1);
  const sy = last ? last.frame.area.y + (last.frame.area.h + sp(3)) : a.y;
  const subs = subsystemRow(scaled, d.complicatedSubsystem ?? [], { ...main, y: sy });
  const heights = [
    ...streams.map((st) => st.frame.area.h),
    ...(subs.blocks.length ? [subs.height] : []),
  ];
  const mainH = heights.reduce((sum, h, i) => sum + h + (i ? sp(3) : 0), 0);
  const height =
    enabling.length || heights.length ? Math.max(mainH, ...enabling.map((team) => team.height)) : 0;
  let x = a.x;
  const columns = enabling.map((team): TopologyBlock => {
    const frame: TeamFrame = { kind: "enabling", area: { x, y: a.y, w: team.width, h: height } };
    const boxes = topologyText(team.stack, {
      x: x + scaled.bd + sp(4),
      y: a.y + (height - team.height) / 2 + scaled.bd + sp(3),
    });
    x += team.width + sp(4);
    return { frame, boxes };
  });
  return { bands: [...columns, ...streams, ...subs.blocks], height };
}

/** The platform band has a single dotted frame around equal-width stacks. */
export function platformRow(scaled: ScaledTopology, teams: TeamTopologySlide["platform"], a: Area) {
  const { look, k, bd, titleO, textO } = scaled;
  if (!teams.length) return { height: 0, bands: [] };
  const { c } = look;
  const sp = (v: number) => spacing(v, k);
  const pw = (a.w - 2 * sp(3) - 2 * bd - (teams.length - 1) * sp(4)) / teams.length;
  const stacks = teams.map((team) =>
    topologyStack(
      look,
      [
        { text: topologyLabel(look, team.name, c.tealDark), o: titleO, gap: 0 },
        ...(team.description
          ? [{ text: topologyLabel(look, team.description, c.muted), o: textO, gap: sp(1.5) }]
          : []),
        ...(team.roles?.length
          ? [{ text: topologyRoles(look, team.roles), o: textO, gap: sp(1.5) }]
          : []),
      ],
      pw - 2 * sp(2),
    ),
  );
  const height = Math.max(...stacks.map((stack) => stack.height)) + 2 * sp(1) + 2 * sp(3) + 2 * bd;
  const bands: TopologyBlock[] = height
    ? [
        {
          frame: { kind: "platform", area: { x: a.x, y: a.y, w: a.w, h: height } },
          boxes: stacks.flatMap((stack, i) =>
            topologyText(stack, {
              x: a.x + bd + sp(3) + i * (pw + sp(4)) + sp(2),
              y: a.y + bd + sp(3) + sp(1),
            }),
          ),
        },
      ]
    : [];
  return { height, bands };
}

/** The legend's items in rows as `flex-wrap` sets them: x and row of each. */
export function topologyLegend(scaled: ScaledTopology, d: TeamTopologySlide, a: Area) {
  const { look, k } = scaled;
  const sp = (v: number) => spacing(v, k);
  const words = look.words.teams;
  const o: BoxOpts = {
    size: Math.round(17.33 * k * 2) / 2,
    color: look.c.muted,
    line: 1.4,
    valign: "middle",
  };
  const legRow = Math.max(sp(8), (o.size * 1.4) / 72);
  const types = d.legend === false ? [] : teamTypesDrawn(d);
  let x = 0;
  let row = 0;
  let lastWidth = 0;
  // Each type drawn here, in the order drawn, a swatch before its name.
  const bands = types.map((type, i): TopologyBlock => {
    const tw = textWidth(words[type], o) + 0.02;
    if (i) {
      x = x + sp(17) + lastWidth + sp(10);
      if (x + sp(17) + tw > a.w) [x, row] = [0, row + 1];
    }
    lastWidth = tw;
    const ly = a.y + sp(4) + row * (legRow + sp(3));
    const frame = {
      kind: type,
      radius: (10 / 144) * k,
      area: { x: a.x + x, y: ly + (legRow - sp(8)) / 2, w: sp(14), h: sp(8) },
    };
    const box = { text: words[type], area: { x: a.x + x + sp(17), y: ly, w: tw, h: legRow }, o };
    return { frame, boxes: [box] };
  });
  const rows = types.length ? row + 1 : 0;
  const height = rows && sp(4) + rows * legRow + (rows - 1) * sp(3);
  return { height, bands };
}

/** Measures and places the bands of a team topology at scale k. */
export function topologyLayout(scaled: ScaledTopology, d: TeamTopologySlide, a: Area) {
  const { look, k, textO } = scaled;
  const sp = (v: number) => spacing(v, k);
  const main = topologyMain(scaled, d, a);
  let y = a.y;
  if (main.height) y += main.height + sp(4);
  const platform = platformRow(scaled, d.platform, { ...a, y });
  if (platform.height) y += platform.height + sp(4);
  const legend = topologyLegend(scaled, d, { ...a, y });
  if (legend.bands.length) y += legend.height + sp(4);
  const o: BoxOpts = { size: textO.size, color: look.c.muted, line: 1.4 };
  const capH = d.caption ? sp(2) + look.need(d.caption, a.w, o) : 0;
  const caption: TopologyBlock[] = d.caption
    ? [{ boxes: [{ text: d.caption, area: { x: a.x, y: y + sp(2), w: a.w, h: capH - sp(2) }, o }] }]
    : [];
  const rows = [main.height, platform.height, legend.height, capH].filter(Boolean);
  const height = rows.reduce((sum, h) => sum + h, 0) + Math.max(0, rows.length - 1) * sp(4);
  return { k, height, bands: [...main.bands, ...platform.bands, ...legend.bands, ...caption] };
}
