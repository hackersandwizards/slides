import { tokens } from "@hackersandwizards/brand/tokens";
import type { SectionTheme } from "../../types/slide";

export function hex(name: keyof typeof tokens): string {
  const value = tokens[name];
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`brand token ${name} is not a hex colour`);
  return value.slice(1).toUpperCase();
}

/** A brand percentage token as a fraction, `10%` as 0.1. */
export function share(name: keyof typeof tokens): number {
  const value = tokens[name];
  if (!/^\d+(\.\d+)?%$/.test(value)) throw new Error(`brand token ${name} is not a percentage`);
  return parseFloat(value) / 100;
}

/** `color-mix(in srgb, a p%, b)`, which the tokens use for their tints. */
export function mixColor(a: string, b: string, p: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  return [0, 2, 4]
    .map((i) =>
      Math.round(ch(a, i) * p + ch(b, i) * (1 - p))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}

const nightGround = hex("--color-night");

const DAY_TOKENS = {
  bg: hex("--color-bg"),
  card: hex("--color-white"),
  ink: hex("--color-ink"),
  muted: hex("--color-muted"),
  border: hex("--color-border"),
  tint: hex("--color-tint"),
  teal: hex("--color-teal"),
  purple: hex("--color-purple"),
  amber: hex("--color-amber-dark"),
  green: hex("--color-green-dark"),
  red: hex("--color-red"),
  factory: hex("--color-factory"),
  neutral: hex("--color-ampersand"),
  code: nightGround,
  tealDark: hex("--color-teal-dark"),
  chipShare: 0.07,
  calloutOn: hex("--color-white"),
  calloutShare: share("--tint-callout"),
};

const NIGHT_TOKENS = {
  bg: nightGround,
  card: hex("--color-night-2"),
  ink: mixColor("FFFFFF", nightGround, 0.92),
  muted: mixColor("FFFFFF", nightGround, 0.8),
  border: mixColor("FFFFFF", nightGround, 0.15),
  tint: mixColor("FFFFFF", nightGround, 0.06),
  teal: hex("--color-teal-night"),
  purple: hex("--color-purple-night"),
  amber: hex("--color-amber"),
  green: hex("--color-green"),
  red: hex("--color-red-night"),
  // The complicated-subsystem team's colour, as DecisionSlide's branch; night lightens it.
  factory: hex("--color-factory-light"),
  neutral: mixColor(hex("--color-ampersand"), "FFFFFF", 0.6),
  code: hex("--color-night-2"),
  tealDark: mixColor(hex("--color-teal-night"), "FFFFFF", 0.7),
  chipShare: 0.08,
  calloutOn: nightGround,
  calloutShare: share("--tint-callout-night"),
} satisfies typeof DAY_TOKENS;

export interface Surface {
  fill: string;
  line?: string;
}

export function palette(dark: boolean) {
  const t = dark ? NIGHT_TOKENS : DAY_TOKENS;
  const tealTint = mixColor(t.teal, t.bg, 0.12);
  return {
    bg: t.bg,
    card: t.card,
    ink: t.ink,
    muted: t.muted,
    border: t.border,
    tint: t.tint,
    teal: t.teal,
    purple: t.purple,
    amber: t.amber,
    green: t.green,
    red: t.red,
    factory: t.factory,
    neutral: t.neutral,
    // The brand's code palette: night (night-2 on a night deck), its text and its command green.
    code: t.code,
    codeInk: mixColor("FFFFFF", nightGround, 0.92),
    codeGreen: hex("--color-green"),
    chip: mixColor(t.ink, t.bg, t.chipShare),
    tealDark: t.tealDark,
    tealTint,
    purpleTint: mixColor(t.purple, t.bg, 0.12),
    greenTint: mixColor(t.green, t.bg, 0.1),
    redTint: mixColor(t.red, t.bg, 0.08),
    amberTint: mixColor(hex("--color-amber"), t.bg, 0.12),
    // brand's hw-callout, teal or data-hue="purple", without a line.
    callout: (hue: string) => mixColor(hue, t.calloutOn, t.calloutShare),
    plainCard: { fill: t.card, line: t.border },
    litCard: { fill: tealTint, line: t.teal },
  };
}

export type Palette = ReturnType<typeof palette>;

export const THEME = {
  primary: "teal",
  secondary: "purple",
  accent: "amber",
  warning: "amber",
  success: "green",
  deepdive: "purple",
} satisfies Record<SectionTheme, keyof Palette>;

export function themePaletteKey(theme?: string) {
  return theme && Object.hasOwn(THEME, theme) ? THEME[theme as SectionTheme] : undefined;
}
