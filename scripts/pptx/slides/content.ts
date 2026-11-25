import type { Slide } from "../../../types/slide";
import { blocks } from "../blocks";
import { footerAt, footerOf, header } from "../chrome";
import { chipArea, drawChip, type Chip } from "../chips";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, PT, BODY } from "../stage";

export function drawContent(sheet: Sheet, d: Extract<Slide, { type: "content" }>): void {
  const centered = d.layout === "centered";
  let y = header(sheet, d, centered);
  const markerStyle = { size: PT.label, fill: sheet.c.tealTint, color: sheet.c.teal };
  if (d.badge) {
    const badge: Chip = { ...markerStyle, text: d.badge };
    const area = chipArea(badge, {
      x: W - EDGE - (d.badge.length * PT.label * 0.62) / 72 - 0.24,
      y: TOP - 0.32,
    });
    drawChip(sheet, badge, area);
  }
  if (d.stageMarker?.length) {
    let x = EDGE;
    if (d.stagePrefix) {
      sheet.box(
        d.stagePrefix,
        { x, y: y - 0.15, w: 1.5, h: 0.25 },
        {
          size: PT.label,
          mono: true,
          bold: true,
          color: sheet.c.muted,
          valign: "middle",
        },
      );
      x += (d.stagePrefix.length * PT.label * 0.62) / 72 + 0.15;
    }
    for (const text of d.stageMarker) {
      const marker: Chip = { ...markerStyle, text };
      const area = chipArea(marker, { x, y: y - 0.15 });
      drawChip(sheet, marker, area);
      x += area.w + 0.1;
    }
    y += 0.25;
  }
  const foot = footerOf(sheet, d.footer);
  const end = blocks(sheet, d.content, BODY(y), centered, foot.h && foot.h + 0.1);
  footerAt(sheet, { ...foot, centered }, end + 0.1);
}
