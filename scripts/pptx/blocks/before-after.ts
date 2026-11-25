import type { Look } from "../look";
import { mixColor, type Palette, type Surface } from "../palette";
import type { Sheet } from "../sheet";
import { PT, TITLE, type Area, type Disc, type Measure } from "../stage";
import { caps, md, type BoxOpts, type Para } from "../text";
import { bodyO, type BlockKind } from "./kind";

export type CircleIconKind = "check" | "cross";

export interface CircleIcon {
  kind: CircleIconKind;
  color: string;
}

const ICON_STROKES: Record<CircleIconKind, readonly (readonly [number, number, number, number])[]> =
  {
    check: [
      [0.3, 0.52, 0.45, 0.67],
      [0.45, 0.67, 0.72, 0.36],
    ],
    cross: [
      [0.35, 0.35, 0.65, 0.65],
      [0.65, 0.35, 0.35, 0.65],
    ],
  };

/** Draws the web's circle-x or circle-check icon inside `disc` in line strokes. */
export function circleIcon(sheet: Sheet, disc: Disc, icon: CircleIcon): void {
  const { x, y, d } = disc;
  const line = { color: icon.color, width: 1.5 };
  sheet.slide.addShape("ellipse", { x, y, w: d, h: d, fill: { type: "none" }, line });
  for (const [x1, y1, x2, y2] of ICON_STROKES[icon.kind])
    sheet.slide.addShape("line", {
      x: x + d * Math.min(x1, x2),
      y: y + d * Math.min(y1, y2),
      w: d * Math.abs(x2 - x1),
      h: d * Math.abs(y2 - y1),
      flipV: (x2 - x1) * (y2 - y1) < 0,
      line,
    });
}

export type BeforeAfterMode = "replace" | "transition" | "add";

export interface BeforeAfterSide {
  label: string;
  items: string[];
  highlight?: string;
}

export interface BeforeAfter {
  before: BeforeAfterSide;
  after: BeforeAfterSide;
  mode: BeforeAfterMode;
}

export interface BeforeAfterSideLayout {
  surface: Surface;
  icon?: CircleIcon & { d: number };
  indent: number;
  label: Para;
  rest: Para[];
  labelH: number;
  restH: number;
}

export interface BeforeAfterLayout {
  k: number;
  pad: number;
  gap: number;
  half: number;
  o: BoxOpts;
  connector: "arrow" | "plus";
  sides: readonly [BeforeAfterSideLayout, BeforeAfterSideLayout];
  h: number;
}

/** A two-sided comparison side's highlight, as the web's caps label under the side's title. */
export const highlightPara = (text: string, color: string): Para => ({
  runs: [caps(text, { color })],
  mono: true,
  bold: true,
  rel: 0.8,
  after: 8,
});

interface SideSpec {
  tone: (c: Palette) => string;
  surface: (c: Palette) => Surface;
  icon?: CircleIconKind;
  struck: boolean;
}

interface ModeSpec {
  sides: readonly [SideSpec, SideSpec];
  connector: "arrow" | "plus";
}

const BEFORE_PLAIN: SideSpec = {
  tone: (c) => c.muted,
  surface: (c) => c.plainCard,
  struck: false,
};

const BEFORE_STRUCK: SideSpec = {
  tone: (c) => c.muted,
  surface: (c) => ({ fill: mixColor(c.muted, c.bg, 0.07), line: c.border }),
  icon: "cross",
  struck: true,
};

const AFTER_CHECK: SideSpec = {
  tone: (c) => c.teal,
  surface: (c) => c.litCard,
  icon: "check",
  struck: false,
};

const AFTER_PLAIN: SideSpec = {
  tone: (c) => c.teal,
  surface: (c) => c.litCard,
  struck: false,
};

const BEFORE_AFTER_MODES: Record<BeforeAfterMode, ModeSpec> = {
  replace: { sides: [BEFORE_STRUCK, AFTER_CHECK], connector: "arrow" },
  transition: { sides: [BEFORE_PLAIN, AFTER_CHECK], connector: "arrow" },
  add: { sides: [BEFORE_PLAIN, AFTER_PLAIN], connector: "plus" },
};

const BA_PAD = 0.25;
const BA_GAP = 0.7;

/** Measures a before-after pair in width `m.w` at scale `m.k`, returning both sides' card
 *  geometry, paragraphs, icon specs, connector kind, and the taller side's height `h`. */
export function beforeAfterLayout(
  look: Look,
  pair: BeforeAfter,
  { w, k }: Measure,
): BeforeAfterLayout {
  const { c } = look;
  const o = bodyO(c, k);
  // The web shrinks a block whole: its paddings and gap with its text.
  const pad = BA_PAD * k;
  const gap = BA_GAP * k;
  const half = (w - gap) / 2;
  const inner = half - 2 * BA_PAD * k;
  const spec = BEFORE_AFTER_MODES[pair.mode];
  const measureSide = (sd: BeforeAfterSide, sideSpec: SideSpec): BeforeAfterSideLayout => {
    const tone = sideSpec.tone(c);
    const icon = sideSpec.icon
      ? { kind: sideSpec.icon, color: tone, d: (o.size * 1.3) / 72 }
      : undefined;
    const indent = icon ? icon.d + 0.12 : 0;
    const item = sideSpec.struck ? { color: c.muted, strike: "sngStrike" as const } : {};
    // The web prints a before-after label as typed.
    const label: Para = {
      runs: [{ text: sd.label, options: { color: tone } }],
      ...TITLE,
      rel: PT.h4 / PT.base,
    };
    const rest: Para[] = [
      ...(sd.highlight ? [highlightPara(sd.highlight, tone)] : []),
      ...sd.items.map((it) => ({ runs: md(it, c, item), after: 6 })),
    ];
    return {
      surface: sideSpec.surface(c),
      icon,
      indent,
      label,
      rest,
      labelH: Math.max(icon?.d ?? 0, look.need(label, inner - indent, o)),
      restH: look.need(rest, inner, o),
    };
  };
  const sides: readonly [BeforeAfterSideLayout, BeforeAfterSideLayout] = [
    measureSide(pair.before, spec.sides[0]),
    measureSide(pair.after, spec.sides[1]),
  ];
  const h = Math.max(...sides.map((sd) => (2 * BA_PAD + 0.15 + 0.1) * k + sd.labelH + sd.restH));
  return { k, pad, gap, half, o, connector: spec.connector, sides, h };
}

/** Draws a measured before-after pair into `area`: the before and after cards side by side, their
 *  circle icons, labels and items, and the arrow or plus connector between them. */
export function drawBeforeAfter(sheet: Sheet, layout: BeforeAfterLayout, area: Area): void {
  const { c } = sheet;
  const { k, pad, gap, half, o, connector, sides } = layout;
  sides.forEach((side, i) => {
    const x = area.x + i * (half + gap);
    sheet.card({ x, y: area.y, w: half, h: area.h }, side.surface);
    const top = area.y + pad;
    if (side.icon) {
      const { d } = side.icon;
      circleIcon(sheet, { x: x + pad, y: top + (side.labelH - d) / 2, d }, side.icon);
    }
    sheet.box(
      side.label,
      { x: x + pad + side.indent, y: top, w: half - 2 * pad - side.indent, h: side.labelH },
      { ...o, valign: "middle" },
    );
    const ry = top + side.labelH + 0.15 * k;
    sheet.box(
      side.rest,
      { x: x + pad, y: ry, w: half - 2 * pad, h: area.y + area.h - pad - ry },
      o,
    );
  });
  const ay = area.y + area.h / 2;
  if (connector === "plus")
    sheet.box(
      "+",
      { x: area.x + half, y: ay - gap / 2, w: gap, h: gap },
      { size: PT.title * k, bold: true, color: c.teal, align: "center", valign: "middle" },
    );
  else
    sheet.arrow(
      { x: area.x + half + 0.12 * k, y: ay },
      { x: area.x + half + gap - 0.12 * k, y: ay },
      c.teal,
    );
}

export const transform: BlockKind<"transform"> = {
  height(look, b, m) {
    return beforeAfterLayout(look, { before: b.before, after: b.after, mode: "transition" }, m).h;
  },
  draw(sheet, b, { area, k }) {
    const layout = beforeAfterLayout(
      sheet,
      { before: b.before, after: b.after, mode: "transition" },
      { w: area.w, k },
    );
    drawBeforeAfter(sheet, layout, area);
  },
};
