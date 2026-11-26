import type { Slide, SectionTheme } from "../../../types/slide";
import { header } from "../chrome";
import { chipArea, drawChip, drawChipRow, layoutChipRow, type ChipRow } from "../chips";
import { mixColor, THEME, themePaletteKey } from "../palette";
import type { Sheet } from "../sheet";
import { EDGE, TOP, BOTTOM, CW, PT, type Area } from "../stage";
import { caps } from "../text";

/** Phases of pills, numbered where an item carries one, as phased-pills and dual-pill-overview set them. */
function pillPhases(
  sheet: Sheet,
  phases: {
    label: string;
    theme?: SectionTheme;
    items: { number?: number; title: string; state?: string }[];
  }[],
  a: Area,
) {
  const { c } = sheet;
  const ph = Math.min(1, a.h / phases.length);
  phases.forEach((p, i) => {
    const py = a.y + i * ph;
    const tone = c[themePaletteKey(p.theme) ?? THEME.primary];
    sheet.box(
      { runs: [{ text: "• " }, caps(p.label)] },
      { x: a.x, y: py, w: a.w, h: 0.25 },
      {
        size: PT.label,
        mono: true,
        bold: true,
        color: tone,
      },
    );
    const pills: ChipRow = {
      labels: p.items.map((it) => ({
        text: it.number === undefined ? it.title : `#${it.number} ${it.title}`,
        fill: it.state === "active" || it.state === "new" ? mixColor(tone, c.bg, 0.15) : c.card,
      })),
      size: PT.sm * 0.9,
      color: c.ink,
      gap: 0.12,
    };
    const layout = layoutChipRow(pills, a.x, a.w);
    drawChipRow(sheet, layout, ({ chip, x, w }) => {
      drawChip(sheet, chip, chipArea(chip, { x, y: py + 0.32 }, w));
    });
  });
}

export function drawPhasedPills(sheet: Sheet, d: Extract<Slide, { type: "phased-pills" }>): void {
  const y = d.title ? header(sheet, { headline: d.title }) : TOP;
  pillPhases(sheet, d.phases, { x: EDGE + CW * 0.2, y, w: CW * 0.6, h: BOTTOM - y });
}
