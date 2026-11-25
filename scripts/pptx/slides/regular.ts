import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { profileLink } from "../people";
import type { Sheet } from "../sheet";
import { PT, TITLE, BODY } from "../stage";
import { md, type Para, type BoxOpts } from "../text";

export function drawRegular(sheet: Sheet, d: Extract<Slide, { type: "regular" }>): void {
  const { c } = sheet;
  const y = header(sheet, d);
  let a = BODY(y);
  if (d.profile) {
    const pw = 2.6;
    sheet.portrait(d.profile, { x: a.x + (pw - 1.4) / 2, y: a.y + 0.2, d: 1.4 }, c.teal);
    const who: Para[] = [
      { runs: [{ text: d.profile.name }], ...TITLE, after: 4 },
      { runs: [{ text: d.profile.title, options: { color: c.teal } }], rel: 0.9 },
      ...(d.profile.linkedIn ? [{ ...profileLink(d.profile.linkedIn, c), rel: 0.9 }] : []),
    ];
    const o: BoxOpts = { size: PT.base, color: c.ink, align: "center" };
    sheet.box(who, { x: a.x, y: a.y + 1.75, w: pw, h: Math.max(0.9, sheet.need(who, pw, o)) }, o);
    a = { ...a, x: a.x + pw + 0.5, w: a.w - pw - 0.5 };
  }
  const secs = d.sections;
  const paras = (sec: (typeof secs)[number]): Para[] => [
    ...(sec.title
      ? [
          {
            runs: md(sec.title, c, { color: c.teal }),
            mono: true,
            bold: true,
            rel: PT.h4 / PT.base,
            after: 6,
          },
        ]
      : []),
    ...(sec.text ? [{ runs: md(sec.text, c), after: 6 }] : []),
    ...(sec.items ?? []).map((it) => ({ runs: md(it, c), bullet: true as const, after: 5 })),
    ...(sec.link
      ? [
          {
            runs: [
              {
                text: sec.link.label,
                options: { color: c.teal, hyperlink: { url: sec.link.url } },
              },
            ],
            after: 6,
          },
        ]
      : []),
  ];
  sheet.box(
    secs.flatMap((sec) =>
      paras(sec).map((p, j, arr) => (j === arr.length - 1 ? { ...p, after: 14 } : p)),
    ),
    a,
    { size: PT.base, color: c.ink },
  );
}
