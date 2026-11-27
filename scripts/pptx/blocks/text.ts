import { textWidth } from "../fit";
import { mixColor, type Palette } from "../palette";
import { PT, REM } from "../stage";
import { bulletParas, md, type Para } from "../text";
import { profileRow } from "../people";
import { bodyO, slotBodyO, type Block, type BlockKind } from "./kind";

/** The rule and its gap before a quote's words: brand's 2 px and 1.25 rem on the 1920 stage. */
const QUOTE_INDENT = 2 / 144 + 1.25 * REM;

/** brand's callout padding at 1920, 1.75 rem. */
export const CALLOUT_PAD = 1.75 * REM;

function quoteParas(b: Block<"quote">, c: Palette, k: number) {
  const words: [Para, number] = [{ runs: md(b.text, c), after: 8 }, PT.h3 * k];
  return b.source
    ? [words, [{ runs: md(b.source, c, { color: c.muted }) }, PT.lead * k] as [Para, number]]
    : [words];
}

export const paragraph: BlockKind<"paragraph"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return look.need(b.text, w, o);
  },
  draw(sheet, b, slot) {
    const { c } = sheet;
    return sheet.box(
      { runs: md(b.text, c), align: b.centered || slot.centered ? "center" : "left" },
      slot.area,
      slotBodyO(c, slot),
    );
  },
};

export const profileLinks: BlockKind<"profile-links"> = {
  height(look, b, { w, k }) {
    return look.need(profileRow(b, look.c), w, bodyO(look.c, k));
  },
  draw(sheet, b, { area: a, k }) {
    return sheet.box(profileRow(b, sheet.c), a, bodyO(sheet.c, k));
  },
};

export const bullets: BlockKind<"bullets"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return look.need(bulletParas(b.items, c, b.ordered), w, o);
  },
  draw(sheet, b, slot) {
    const { c } = sheet;
    return sheet.box(
      bulletParas(b.items, c, b.ordered),
      slot.area,
      bodyO(c, slot.k, { align: "left" }),
    );
  },
};

export const quote: BlockKind<"quote"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return quoteParas(b, c, k).reduce(
      (h, [p, size]) => h + look.need(p, w - QUOTE_INDENT * k, { ...o, size }) + 0.1,
      0,
    );
  },
  draw(sheet, b, slot) {
    const { c } = sheet;
    const { area: a, k } = slot;
    // Brand's quote: a purple rule, the words in ink behind it, the source under them.
    sheet.rect({ x: a.x, y: a.y, w: 2 / 144, h: a.h }, c.purple);
    return sheet.box(
      quoteParas(b, c, k).map(([p, size]) => ({ ...p, rel: size / (PT.base * k) })),
      { x: a.x + QUOTE_INDENT * k, y: a.y, w: a.w - QUOTE_INDENT * k, h: a.h },
      bodyO(c, k, { align: "left" }),
    );
  },
};

export const callout: BlockKind<"callout"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return look.need(b.text, w - 2 * CALLOUT_PAD * k, o) + 2 * CALLOUT_PAD * k;
  },
  draw(sheet, b, slot) {
    const { c } = sheet;
    const { area: a, k, centered } = slot;
    const o = slotBodyO(c, slot);
    if (centered) {
      const w = Math.min(a.w, 7.5);
      sheet.card({ x: a.x + (a.w - w) / 2, y: a.y, w, h: a.h }, sheet.c.plainCard);
      return sheet.box(
        b.text,
        { x: a.x + (a.w - w) / 2 + 0.3, y: a.y + 0.15, w: w - 0.6, h: a.h - 0.3 },
        {
          ...o,
          size: PT.lead * k,
          color: c.muted,
          align: "center",
          valign: "middle",
        },
      );
    }
    // The web's callouts: the info one brand's purple one, in ink; a warning or success the tone at 7 % on
    // the ground with its border at 25 %, the text the tone mixed 60 % with ink.
    const tone = b.variant === "warning" ? c.amber : b.variant === "success" ? c.green : undefined;
    const ink = tone ? mixColor(tone, c.ink, 0.6) : c.ink;
    // Fit the callout to its text and brand padding within the available width, or fill it with `fullWidth`.
    const pad = CALLOUT_PAD * k;
    const w = b.fullWidth ? a.w : Math.min(a.w, textWidth(b.text, o) + 2 * pad + 0.02);
    const fill = tone ? mixColor(tone, c.bg, 0.07) : c.callout(c.purple);
    sheet.card(
      { x: a.x, y: a.y, w, h: a.h },
      { fill: fill, line: tone && mixColor(tone, c.bg, 0.25) },
    );
    return sheet.box(
      b.text,
      { x: a.x + pad, y: a.y + pad, w: w - 2 * pad, h: a.h - 2 * pad },
      {
        ...o,
        color: ink,
        align: "left",
        valign: "middle",
      },
    );
  },
};
