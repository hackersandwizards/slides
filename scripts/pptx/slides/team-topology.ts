import type { Slide } from "../../../types/slide";
import { header } from "../chrome";
import { mixColor } from "../palette";
import { drySheet, type Sheet } from "../sheet";
import { CORNER, REM, BODY, type Area } from "../stage";
import { topologyLayout } from "./topology-layout";

/** A team-topology slide's body as `TeamTopologySlide` draws it, the Team Shape Templates in brand
 *  colours: the enabling teams in a row of columns on the left, the stream teams beside them one
 *  per row with their roles after the name where they fit, the complicated subsystems as octagons
 *  under them, the platform teams side by side in a dotted frame, then the legend and caption.
 *  Draws where `s` is given; returns the height at scale k. */
function topology(
  sheet: Sheet,
  d: Extract<Slide, { type: "team-topology" }>,
  a: Area,
  k: number,
): number {
  const layout = topologyLayout(sheet, d, { area: a, k });
  if (sheet.dry) return layout.height;
  const { slide: s, c } = sheet;
  const hue = { enabling: c.purple, stream: c.teal, platform: c.teal, subsystem: c.neutral };
  const shape = (
    type: keyof typeof hue,
    x: number,
    y: number,
    w: number,
    h: number,
    r = CORNER * k,
  ) =>
    s?.addShape(
      type === "subsystem" ? "octagon" : r === CORNER * k ? "round2DiagRect" : "roundRect",
      {
        x,
        y,
        w,
        h,
        rectRadius:
          type === "subsystem" ? Math.min(0.9 * REM * k, h / 2) : Math.min(r, w / 2, h / 2),
        fill: type === "platform" ? { type: "none" } : { color: mixColor(hue[type], c.bg, 0.07) },
        line: {
          color: hue[type],
          width: 1.5 * k,
          ...(type === "platform" ? { dashType: "sysDot" as const } : {}),
        },
      },
    );
  for (const band of layout.bands) {
    if (band.frame) {
      const {
        kind,
        area: { x, y, w, h },
        radius,
      } = band.frame;
      shape(kind, x, y, w, h, radius);
    }
    for (const { text, area, o } of band.boxes) sheet.box(text, area, o);
  }
  return layout.height;
}

export function drawTeamTopology(sheet: Sheet, d: Extract<Slide, { type: "team-topology" }>): void {
  const y = header(sheet, d);
  const a = BODY(y);
  // The web's fit guard: the whole body shrinks until it fits.
  let k = 1;
  while (k > 0.6 && topology(drySheet(sheet), d, a, k) > a.h) k -= 0.02;
  const h = topology(drySheet(sheet), d, a, k);
  topology(sheet, d, { ...a, y: a.y + Math.max(0, a.h - h) / 2.25 }, k);
}
