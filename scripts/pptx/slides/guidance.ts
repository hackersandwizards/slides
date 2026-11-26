import type { GuidanceExample, GuidanceSlide } from "../../../types/slide";
import { header } from "../chrome";
import { cellAreas } from "../cells";
import type { Sheet } from "../sheet";
import { EDGE, CW, PT, BODY, type Area } from "../stage";
import { caps, md, bulletParas, type Para } from "../text";

/** Draws an example title and the paired bad and good cards. */
export function guidanceExample(sheet: Sheet, ex: GuidanceExample, area: Area): void {
  const { c } = sheet;
  sheet.box(
    { runs: md(ex.title, c) },
    { x: area.x, y: area.y, w: area.w, h: 0.3 },
    {
      size: PT.base,
      mono: true,
      bold: true,
      color: c.ink,
    },
  );
  const sides = [
    [sheet.words.bad, ex.bad, c.red, c.redTint],
    [sheet.words.good, ex.good, c.green, c.greenTint],
  ] as const;
  cellAreas(
    sides.length,
    { x: area.x, y: area.y + 0.35, w: area.w, h: area.h - 0.35 },
    0.25,
  ).forEach((r, i) => {
    const [label, text, tone, tint] = sides[i];
    sheet.card(r, { fill: tint, line: tone });
    sheet.box(
      [
        {
          runs: [caps(label, { color: tone })],
          bold: true,
          rel: 0.75,
          after: 4,
        },
        ...text.split("\n").map((l) => ({ runs: [{ text: l || " " }] })),
      ],
      { x: r.x + 0.2, y: r.y + 0.15, w: r.w - 0.4, h: r.h - 0.25 },
      { size: PT.sm, mono: true, color: c.muted, line: 1.3 },
    );
  });
}

export function drawGuidance(sheet: Sheet, d: GuidanceSlide): void {
  const { c } = sheet;
  let y = header(sheet, d);
  const intro: Para[] = [
    ...(d.intro ? [{ runs: md(d.intro, c), after: 6 }] : []),
    ...bulletParas(d.points ?? [], c),
  ];
  if (intro.length) {
    const ih = Math.min(1.6, sheet.need(intro, CW, { size: PT.base, color: c.muted }));
    sheet.box(intro, { x: EDGE, y, w: CW, h: ih }, { size: PT.base, color: c.muted });
    y += ih + 0.2;
  }
  const a = BODY(y);
  const lines = Math.max(
    ...d.examples.flatMap((ex) => [ex.bad, ex.good].map((t) => t.split("\n").length)),
  );
  const eh = Math.min(
    (a.h - (d.examples.length - 1) * 0.2) / d.examples.length,
    0.9 + (lines * PT.sm * 1.3) / 72,
  );
  d.examples.forEach((ex, i) => {
    const ey = a.y + i * (eh + 0.2);
    guidanceExample(sheet, ex, { x: a.x, y: ey, w: a.w, h: eh });
  });
}
