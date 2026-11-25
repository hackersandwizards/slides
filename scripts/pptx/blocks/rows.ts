import { chipArea, drawChip, type Chip } from "../chips";
import { MONO } from "../faces";
import { PT } from "../stage";
import { md } from "../text";
import { bodyO, type BlockKind } from "./kind";

export const hooks: BlockKind<"hooks"> = {
  height(_look, b, { k }) {
    return b.items.length * ((PT.base * k * 1.9) / 72 + 0.12);
  },
  draw(sheet, b, { area: a, k, centered }) {
    const { c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    // The web's hook list: one row per event, its name as a mono chip before the description.
    const rh = Math.min(
      (PT.base * k * 1.9) / 72,
      (a.h - (b.items.length - 1) * 0.12) / b.items.length,
    );
    b.items.forEach((it, i) => {
      const y = a.y + i * (rh + 0.12);
      sheet.rounded({ x: a.x, y, w: a.w, h: rh }, sheet.c.plainCard, rh / 2);
      const name: Chip = { text: it.name, size: PT.sm * k, fill: c.tint, color: c.ink };
      const chipBox = chipArea(name, { x: a.x + 0.1, y: y + rh / 2 - (PT.sm * k * 1.9) / 144 });
      drawChip(sheet, name, chipBox);
      const w = chipBox.w;
      sheet.box(
        { runs: md(it.description, c) },
        { x: a.x + w + 0.25, y, w: a.w - w - 0.4, h: rh },
        {
          ...o,
          size: PT.sm * k,
          color: c.muted,
          valign: "middle",
        },
      );
    });
  },
};

export const layers: BlockKind<"layers"> = {
  height(_look, b, { k }) {
    return b.layers.length * (0.5 * k + 0.1);
  },
  draw(sheet, b, { area: a, k, centered }) {
    const { c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const n = b.layers.length;
    const lh = (a.h - (n - 1) * 0.1) / n;
    b.layers.forEach((l, i) => {
      const y = a.y + i * (lh + 0.1);
      const hi = i === b.highlight;
      sheet.rounded({ x: a.x, y, w: a.w, h: lh }, hi ? sheet.c.litCard : sheet.c.plainCard, 0.05);
      sheet.box(
        {
          runs: [
            ...(b.ordered ? [{ text: `${i + 1}  `, options: { color: c.teal, bold: true } }] : []),
            { text: l.title, options: { bold: true, fontFace: MONO } },
            ...(l.text ? [{ text: "   " }, ...md(l.text, c, { color: c.muted })] : []),
          ],
        },
        { x: a.x + 0.25, y, w: a.w - 0.5, h: lh },
        { ...o, valign: "middle", align: "left" },
      );
    });
  },
};
