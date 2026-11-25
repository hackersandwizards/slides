import type { Slide } from "../../../types/slide";
import { footer, footerOf, header } from "../chrome";
import { chipAdvance } from "../chips";
import { MONO } from "../faces";
import type { Sheet } from "../sheet";
import { EDGE, BOTTOM, CW, PT } from "../stage";
import { md, type Para } from "../text";

export function drawAgenda(sheet: Sheet, d: Extract<Slide, { type: "agenda" }>): void {
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
}
