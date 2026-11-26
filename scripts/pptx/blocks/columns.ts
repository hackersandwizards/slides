import { TWO_COLUMN_TONES, type SideTone } from "../../../lib/two-column-tones";
import type { Sheet } from "../sheet";
import { PT, TITLE } from "../stage";
import { md, type MarkerHue, type Para } from "../text";
import { bodyO, type BlockKind, type Slot } from "./kind";

/** The hue a two-column side's tone (`TWO_COLUMN_TONES`) takes. */
const SIDE_HUES: Record<SideTone, MarkerHue | "muted"> = {
  success: "green",
  error: "red",
  neutral: "muted",
};

export interface ItemCard {
  title?: string;
  subtitle?: string;
  items?: string[];
  text?: string;
  tone?: string;
  marker?: MarkerHue;
}

/** A card with a title and items or text, as two-column, four-column and comparison sides draw. */
export function itemCard(sheet: Sheet, card: ItemCard, slot: Slot): void {
  const { c } = sheet;
  const { area: a, k } = slot;
  sheet.card(a, { fill: c.card, line: card.tone ?? c.border });
  const pad = 0.2;
  const paras: Para[] = [];
  if (card.title)
    paras.push({
      runs: md(card.title, c, { color: card.tone ?? c.ink }),
      ...TITLE,
      rel: PT.h4 / PT.base,
      after: 6,
    });
  if (card.subtitle)
    paras.push({ runs: md(card.subtitle, c, { color: c.muted }), rel: 0.9, after: 6 });
  if (card.text) paras.push({ runs: md(card.text, c), after: 6 });
  for (const it of card.items ?? []) {
    paras.push({ runs: md(it, c), bullet: true, marker: card.marker, after: 5 });
  }
  sheet.box(paras, { x: a.x + pad, y: a.y + pad, w: a.w - 2 * pad, h: a.h - 2 * pad }, bodyO(c, k));
}

export const twoColumn: BlockKind<"two-column"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    const sides = [b.left, b.right];
    return (
      Math.max(
        ...sides.map((sd) =>
          look.need(
            [
              { runs: [{ text: "x" }], rel: 1.2, after: 6 },
              ...(sd.items ?? []).map((i) => ({
                runs: md(i, c),
                bullet: true as const,
                after: 5,
              })),
              ...(sd.text ? [{ runs: md(sd.text, c) }] : []),
            ],
            w / 2 - 0.6,
            o,
          ),
        ),
      ) + 0.45
    );
  },
  draw(sheet, b, slot) {
    const { c } = sheet;
    const { area: a } = slot;
    // A deck's JSON is read unchecked: a variant the map lacks draws neutral, as on the web.
    const variant = b.variant ?? "neutral";
    const tones = Object.hasOwn(TWO_COLUMN_TONES, variant)
      ? TWO_COLUMN_TONES[variant]
      : TWO_COLUMN_TONES.neutral;
    const [lt, rt] = tones.map((tone) => {
      const hue = SIDE_HUES[tone];
      return hue === "muted" ? {} : { tone: c[hue], marker: hue };
    });
    const half = a.w / 2 - 0.15;
    itemCard(sheet, { ...b.left, ...lt }, { ...slot, area: { ...a, w: half } });
    itemCard(
      sheet,
      { ...b.right, ...rt },
      { ...slot, area: { ...a, x: a.x + half + 0.3, w: half } },
    );
  },
};

export const fourColumn: BlockKind<"four-column"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return (
      Math.max(
        ...b.columns.map((col) =>
          look.need(
            [
              { runs: [{ text: col.title }], rel: 1.2, after: 6 },
              ...col.items.map((i) => ({ runs: md(i, c), bullet: true as const, after: 5 })),
            ],
            w / b.columns.length - 0.5,
            o,
          ),
        ),
      ) + 0.5
    );
  },
  draw(sheet, b, slot) {
    const { area: a } = slot;
    const n = b.columns.length;
    const cw = (a.w - (n - 1) * 0.2) / n;
    b.columns.forEach((col, i) =>
      itemCard(sheet, col, { ...slot, area: { ...a, x: a.x + i * (cw + 0.2), w: cw } }),
    );
  },
};
