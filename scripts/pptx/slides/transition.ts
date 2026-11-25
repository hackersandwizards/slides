import type { Slide } from "../../../types/slide";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, BOTTOM, CW, PT } from "../stage";
import { caps, literal, type Para, type BoxOpts } from "../text";

export function drawTransition(sheet: Sheet, d: Extract<Slide, { type: "transition" }>): void {
  const { c } = sheet;
  const paras: Para[] = [];
  if (d.preText)
    paras.push({
      runs: [caps(d.preText, { color: c.teal })],
      mono: true,
      bold: true,
      rel: PT.lead / PT.display,
      after: 14,
    });
  paras.push({ ...literal(d.headline), mono: true, bold: true, after: 14 });
  if (d.subtitle) paras.push({ ...literal(d.subtitle), rel: PT.lead / PT.display });
  const speakerH = d.speakerName ? 1.1 : 0;
  const o: BoxOpts = {
    size: PT.display,
    color: c.ink,
    align: "center",
    valign: "middle",
    line: 1.1,
    floor: 0.5,
  };
  const th = Math.min(BOTTOM - TOP - speakerH, sheet.need(paras, CW - 1, o) + 0.2);
  const ty = TOP + (BOTTOM - TOP - th - speakerH) / 2;
  sheet.box(paras, { x: EDGE + 0.5, y: ty, w: CW - 1, h: th }, o);
  if (d.speakerName) {
    const sw = Math.max(2.6, (d.speakerName.length * PT.h3 * 0.62) / 72 + 0.8);
    sheet.card({ x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 }, sheet.c.plainCard);
    sheet.box(
      [
        {
          runs: [{ text: d.speakerName, options: { color: c.teal } }],
          mono: true,
          bold: true,
          after: 2,
        },
        ...(d.speakerCompany ? [{ runs: [{ text: d.speakerCompany }], rel: 0.65 }] : []),
      ],
      { x: (W - sw) / 2, y: ty + th + 0.2, w: sw, h: 0.85 },
      { size: PT.h3, color: c.ink, align: "center", valign: "middle" },
    );
  }
}
