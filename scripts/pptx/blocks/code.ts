import { mixColor } from "../palette";
import { PT } from "../stage";
import { CAPS, md } from "../text";
import { bodyO, type BlockKind } from "./kind";

/** A code block's lines without their common indent, as the web shows them. */
function codeLines(code: string) {
  const lines = code.split("\n");
  const cut = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  );
  return lines.map((l) => l.slice(Number.isFinite(cut) ? cut : 0));
}

export const code = {
  height(look, b, { w, k }) {
    const { c } = look;
    const codeW = b.type === "annotated-code" && b.notes.length ? w * 0.62 : w;
    const lines = codeLines(b.code).map((l) => ({ runs: [{ text: l || " " }] }));
    return (
      look.need(lines, codeW - 0.4, {
        size: PT.sm * k,
        mono: true,
        line: 1.3,
        color: c.codeInk,
      }) + 0.4
    );
  },
  draw(sheet, b, { area: a, k }) {
    const { c } = sheet;
    sheet.rounded(a, { fill: c.code }, 0.06);
    const lines = codeLines(b.code);
    const notes = b.type === "annotated-code" ? b.notes : [];
    const codeW = notes.length ? a.w * 0.62 : a.w;
    const lh = (PT.sm * k * 1.3) / 72;
    for (const n of notes)
      sheet.rect(
        { x: a.x, y: a.y + 0.2 + (n.line - 1) * lh, w: codeW, h: lh },
        mixColor(c.teal, c.code, 0.35),
      );
    sheet.box(
      lines.map((l) => ({ runs: [{ text: l || " " }] })),
      { x: a.x + 0.25, y: a.y + 0.2, w: codeW - 0.4, h: a.h - 0.3 },
      { size: PT.sm * k, mono: true, color: c.codeInk, line: 1.3, floor: 0.5 },
    );
    notes.forEach((n, i) => {
      const y = a.y + 0.2 + (n.line - 1) * lh;
      sheet.box(
        {
          runs: [{ text: `${i + 1}  `, options: { bold: true, color: c.teal } }, ...md(n.text, c)],
        },
        { x: a.x + a.w * 0.64 + 0.2, y: y - 0.02, w: a.w * 0.36 - 0.3, h: Math.max(lh * 2, 0.4) },
        { size: PT.sm * k, color: c.codeInk, floor: 0.7 },
      );
    });
  },
} satisfies BlockKind<"code" | "annotated-code">;

export const terminal: BlockKind<"terminal"> = {
  height(_look, b, { k }) {
    return (b.commands.length * PT.sm * k * 1.5) / 72 + 0.45;
  },
  draw(sheet, b, { area: a, k }) {
    const { c } = sheet;
    sheet.rounded(a, { fill: c.code }, 0.06);
    sheet.box(
      b.commands.map((cmd) => ({
        runs: [{ text: `${cmd.prefix} `, options: { color: c.codeGreen } }, { text: cmd.text }],
        after: 4,
      })),
      { x: a.x + 0.25, y: a.y + 0.2, w: a.w - 0.5, h: a.h - 0.3 },
      { size: PT.sm * k, mono: true, color: c.codeInk, line: 1.3 },
    );
  },
};

export const codeAndText: BlockKind<"code-and-text"> = {
  height(look, b, { w, k }) {
    const { c } = look;
    const o = bodyO(c, k);
    return Math.max(
      (b.code.split("\n").length * PT.sm * k * 1.3) / 72 + 0.4,
      look.need(
        b.sections.flatMap((sc) => [
          { runs: [{ text: sc.title }], after: 4 },
          { runs: md(sc.text, c), after: 8 },
        ]),
        w / 2 - 0.2,
        o,
      ),
    );
  },
  draw(sheet, b, slot) {
    const { area: a, k, centered } = slot;
    const { c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const half = a.w / 2 - 0.15;
    code.draw(
      sheet,
      { type: "code", language: b.language ?? "", code: b.code },
      { ...slot, area: { ...a, w: half }, centered: false },
    );
    sheet.box(
      b.sections.flatMap((sc) => [
        {
          runs: md(sc.title, c, { color: c.amber, lang: CAPS }),
          mono: true,
          bold: true,
          after: 4,
        },
        { runs: md(sc.text, c), after: 10 },
      ]),
      { x: a.x + half + 0.3, y: a.y, w: half, h: a.h },
      o,
    );
  },
};
