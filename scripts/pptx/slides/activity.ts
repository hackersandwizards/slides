import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { MONO } from "../faces";
import type { Sheet } from "../sheet";
import { EDGE, BOTTOM, CW, PT } from "../stage";
import { md, type Para } from "../text";

export function drawActivity(sheet: Sheet, d: Extract<Slide, { type: "activity" }>): void {
  const { c } = sheet;
  const label = d.label ?? { exercise: "Hands-on", demo: "Live demo", debrief: "Debrief" }[d.kind];
  const y = header(sheet, { sectionLabel: label, headline: d.headline, subtitle: d.task });
  const frame = [d.duration, d.mode, d.outcome].filter((t): t is string => !!t);
  const fw = frame.length ? CW * 0.34 : 0;
  let top = y + 0.3;
  if (d.prompt) {
    const ph = sheet.need(d.prompt, CW - 0.6, { size: PT.lead, color: c.ink }) + 0.3;
    sheet.card({ x: EDGE, y: top, w: CW, h: ph }, sheet.c.litCard);
    sheet.box(
      d.prompt,
      { x: EDGE + 0.3, y: top + 0.15, w: CW - 0.6, h: ph - 0.3 },
      {
        size: PT.lead,
        color: c.ink,
      },
    );
    top += ph + 0.3;
  }
  const paras: Para[] = d.items.map((it, i) => ({
    runs: [
      ...(d.kind === "demo"
        ? []
        : [{ text: `${i + 1}.  `, options: { color: c.teal, bold: true, fontFace: MONO } }]),
      ...md(it, c),
    ],
    bullet: d.kind === "demo",
    after: 10,
  }));
  sheet.box(
    paras,
    { x: EDGE, y: top, w: CW - fw - (fw ? 0.5 : 0), h: BOTTOM - top },
    {
      size: PT.lead,
      color: c.ink,
    },
  );
  if (!frame.length) return;
  const fx = EDGE + CW - fw;
  const fh = 0.5 + frame.length * 0.55;
  sheet.card({ x: fx, y: top, w: fw, h: fh }, sheet.c.plainCard);
  sheet.box(
    frame.map((t, i) => ({
      runs: md(t, c, i === 0 && d.duration ? {} : { color: c.muted }),
      mono: i === 0 && !!d.duration,
      bold: i === 0 && !!d.duration,
      rel: i === 0 && d.duration ? 1.4 : 1,
      after: 8,
    })),
    { x: fx + 0.3, y: top + 0.25, w: fw - 0.6, h: fh - 0.5 },
    { size: PT.base, color: c.ink },
  );
}
