import type { ContentSlide } from "../../../types/slide";
import { blocksLayout, drawBlocks } from "../blocks";
import { footerAt, header } from "../chrome";
import { chipArea, drawChip, type Chip } from "../chips";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { W, EDGE, TOP, PT, BODY } from "../stage";

/** Builds the teal label chip used for a content slide's badge and stage markers. */
export function markerChip(look: Look, text: string): Chip {
  return { size: PT.label, fill: look.c.tealTint, color: look.c.teal, text };
}

/** Draws the top-right badge chip of a content slide. */
export function drawContentBadge(sheet: Sheet, text: string): void {
  const badge = markerChip(sheet, text);
  const area = chipArea(badge, {
    x: W - EDGE - (text.length * PT.label * 0.62) / 72 - 0.24,
    y: TOP - 0.32,
  });
  drawChip(sheet, badge, area);
}

/** Draws the optional stage prefix and stage-marker chips at `y`, returning the body start `y`. */
export function drawStageMarkers(sheet: Sheet, d: ContentSlide, y: number): number {
  if (!d.stageMarker?.length) return y;
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
    const marker = markerChip(sheet, text);
    const area = chipArea(marker, { x, y: y - 0.15 });
    drawChip(sheet, marker, area);
    x += area.w + 0.1;
  }
  return y + 0.25;
}

/** Draws a content slide's header, optional badge, and optional stage markers, returning the
 *  vertical position where its body begins. */
export function contentHead(sheet: Sheet, d: ContentSlide): number {
  const y = header(sheet, d, d.layout === "centered");
  if (d.badge) drawContentBadge(sheet, d.badge);
  return drawStageMarkers(sheet, d, y);
}

export function drawContent(sheet: Sheet, d: ContentSlide): void {
  const y = contentHead(sheet, d);
  const layout = blocksLayout(sheet, d, BODY(y));
  drawBlocks(sheet, d.content, layout);
  footerAt(sheet, { ...layout.foot, centered: layout.centered }, layout.end + 0.1);
}
