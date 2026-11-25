import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import type { Sheet } from "../sheet";
import { PT, BODY } from "../stage";
import { md, type BoxOpts } from "../text";

export function drawGrid(
  sheet: Sheet,
  d: Extract<Slide, { type: "grid"; variant: "quotes" }>,
): void {
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
}
