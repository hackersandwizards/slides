import type { TeamTopologySlide } from "../../../types/slide";
import { header } from "../chrome";
import { mixColor } from "../palette";
import type { Sheet } from "../sheet";
import { CORNER, REM, BODY } from "../stage";
import { topologyLayout, type TeamFrame, type TeamKind } from "./topology-layout";

interface TeamShapeStyle {
  tone: "teal" | "purple" | "neutral";
  large: "round2DiagRect" | "octagon";
  small: "roundRect" | "octagon";
  hollow?: true;
  octagonal?: true;
  dash?: "sysDot";
}

const ROUNDED = { large: "round2DiagRect", small: "roundRect" } as const;
const TEAM_SHAPES: Record<TeamKind, TeamShapeStyle> = {
  enabling: { ...ROUNDED, tone: "purple" },
  stream: { ...ROUNDED, tone: "teal" },
  subsystem: { large: "octagon", small: "octagon", tone: "neutral", octagonal: true },
  platform: { ...ROUNDED, tone: "teal", hollow: true, dash: "sysDot" },
};

/** Draws a team frame or the corresponding legend swatch. */
export function teamShape(sheet: Sheet, frame: TeamFrame, k: number): void {
  const {
    kind,
    area: { x, y, w, h },
    radius = CORNER * k,
  } = frame;
  const style = TEAM_SHAPES[kind];
  const color = sheet.c[style.tone];
  sheet.slide?.addShape(radius === CORNER * k ? style.large : style.small, {
    x,
    y,
    w,
    h,
    rectRadius: style.octagonal ? Math.min(0.9 * REM * k, h / 2) : Math.min(radius, w / 2, h / 2),
    fill: style.hollow ? { type: "none" } : { color: mixColor(color, sheet.c.bg, 0.07) },
    line: {
      color,
      width: 1.5 * k,
      ...(style.dash ? { dashType: style.dash } : {}),
    },
  });
}

/** A team-topology slide's body as `TeamTopologySlide` draws it, the Team Shape Templates in brand
 *  colours: the enabling teams in a row of columns on the left, the stream teams beside them one
 *  per row with their roles after the name where they fit, the complicated subsystems as octagons
 *  under them, the platform teams side by side in a dotted frame, then the legend and caption. */
export function drawTopology(
  sheet: Sheet,
  layout: ReturnType<typeof topologyLayout>,
  k: number,
): void {
  for (const { frame, boxes } of layout.bands) {
    if (frame) teamShape(sheet, frame, k);
    for (const { text, area, o } of boxes) sheet.box(text, area, o);
  }
}

export function drawTeamTopology(sheet: Sheet, d: TeamTopologySlide): void {
  const a = BODY(header(sheet, d));
  // The web's fit guard: the whole body shrinks until it fits.
  let k = 1;
  let layout = topologyLayout(sheet, d, { area: a, k });
  while (k > 0.6 && layout.height > a.h) {
    k -= 0.02;
    layout = topologyLayout(sheet, d, { area: a, k });
  }
  const area = { ...a, y: a.y + Math.max(0, a.h - layout.height) / 2.25 };
  drawTopology(sheet, topologyLayout(sheet, d, { area, k }), k);
}
