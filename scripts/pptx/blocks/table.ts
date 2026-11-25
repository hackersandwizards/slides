import type PptxGenJS from "pptxgenjs";
import { MONO, SANS } from "../faces";
import type { Look } from "../look";
import { PT, type Measure } from "../stage";
import { breaks, CAPS, md } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

/** The height of each row of a table at scale k in width w, its header first. */
function tableRows(look: Look, b: Block<"table">, { w, k }: Measure) {
  const { c } = look;
  const cols = Math.max(b.headers?.length ?? 0, ...b.rows.map((r) => r.length));
  const o = bodyO(c, k);
  const row = (r: string[]) =>
    Math.max(...r.map((t) => look.need(t, w / cols - 0.2, { ...o, size: PT.base * 0.875 * k }))) +
    0.3;
  return [...(b.headers ? [row(b.headers)] : []), ...b.rows.map(row)];
}

export const table: BlockKind<"table"> = {
  height(look, b, m) {
    return tableRows(look, b, m).reduce((x, y) => x + y, 0);
  },
  draw(sheet, b, { area: a, k }) {
    const { slide: s, c } = sheet;
    const cols = Math.max(b.headers?.length ?? 0, ...b.rows.map((r) => r.length));
    const total = b.widths?.reduce((x, y) => x + y, 0);
    const colW = Array.from({ length: cols }, (_, i) =>
      b.widths && total ? (b.widths[i] / total) * a.w : a.w / cols,
    );
    // The web's table: body and headers at the small step, headers as mono capitals, the head
    // and every second body row tinted alike.
    const size = Math.max(7, Math.round(PT.base * 0.875 * k * 2) / 2);
    const cell = (t: string, head: boolean, tinted = head): PptxGenJS.TableCell => ({
      text: breaks(
        md(
          t,
          c,
          head ? { bold: true, fontFace: MONO, color: c.ink, fontSize: size, lang: CAPS } : {},
        ),
      ) as PptxGenJS.TableCell[],
      options: { fill: { color: tinted ? c.tint : c.card } },
    });
    const rows = [
      ...(b.headers ? [b.headers.map((t) => cell(t, true))] : []),
      // The web sets a table's first column in bold, as the row's name.
      ...b.rows.map((r, i) =>
        r.map((t, j) => {
          const td = cell(t, false, i % 2 === 1);
          return j === 0 ? { ...td, options: { ...td.options, bold: true } } : td;
        }),
      ),
    ];
    s.addTable(rows, {
      x: a.x,
      y: a.y,
      w: a.w,
      colW,
      // The planned row heights, so the table fills the area the layout gave it.
      rowH: tableRows(sheet, b, { w: a.w, k }),
      fontFace: SANS,
      fontSize: size,
      color: c.ink,
      border: { type: "solid", pt: 0.75, color: c.border },
      // Inches, as pptxgenjs reads a table's margin.
      margin: [0.1, 0.1, 0.1, 0.1],
      valign: "middle",
      autoPage: false,
    });
  },
};
