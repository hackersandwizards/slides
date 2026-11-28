import type { Slide } from "../../../types/slide";
import { profileUrls } from "../../../lib/link-labels";
import { personAccent } from "../../../lib/people-slides";
import { footer, footerOf, header } from "../chrome";
import { profileLink } from "../people";
import { cellAreas } from "../cells";
import type { Sheet } from "../sheet";
import { BOTTOM, PT, TITLE, BODY } from "../stage";
import { bulletParas, type Para } from "../text";

export function drawProfiles(sheet: Sheet, d: Extract<Slide, { type: "profiles" }>): void {
  const { c } = sheet;
  const y = header(sheet, d);
  const foot = footerOf(sheet, d.footer);
  const a = { ...BODY(y), h: BOTTOM - y - foot.h };
  const body = (p: (typeof d.profiles)[number]): Para[] => [
    ...bulletParas(p.bullets ?? [], c),
    ...profileUrls(p).map((url) => profileLink(url, c)),
  ];
  const ch = Math.min(
    a.h,
    1.6 +
      Math.max(
        ...d.profiles.map((p) =>
          sheet.need(body(p), a.w / d.profiles.length - 0.6, {
            size: PT.base,
            color: c.ink,
          }),
        ),
      ),
  );
  const corner = d.profiles.length > 1 ? "small" : "brand";
  cellAreas(d.profiles.length, { ...a, h: ch }, 0.3).forEach((r, i) => {
    const p = d.profiles[i];
    const tone = personAccent(i) === "secondary" ? c.purple : c.teal;
    sheet.card(r, sheet.c.plainCard, corner);
    sheet.portrait(p, { x: r.x + 0.25, y: r.y + 0.25, d: 0.9 }, tone);
    sheet.box(
      [
        { runs: [{ text: p.name }], ...TITLE, rel: PT.h4 / PT.base, after: 2 },
        { runs: [{ text: p.title, options: { color: tone } }], after: 2 },
        { runs: [{ text: p.company, options: { color: c.muted } }] },
      ],
      { x: r.x + 1.35, y: r.y + 0.25, w: r.w - 1.6, h: 1.1 },
      { size: PT.base, color: c.ink, valign: "middle" },
    );
    sheet.box(
      body(p),
      { x: r.x + 0.25, y: r.y + 1.45, w: r.w - 0.5, h: r.h - 1.6 },
      {
        size: PT.base,
        color: c.ink,
      },
    );
  });
  footer(sheet, foot);
}
