import type { MarkerTone, RoadmapColumn, RoadmapItem, RoadmapSlide } from "../../../types/slide";
import { header } from "../chrome";
import { chipArea, drawChip, type Chip } from "../chips";
import { cellAreas } from "../cells";
import { MONO } from "../faces";
import { mixColor, THEME } from "../palette";
import type { Look } from "../look";
import type { Sheet } from "../sheet";
import { PT, BODY, type Area } from "../stage";
import { caps, md, type Para } from "../text";

/** The column's accent and its named phases or ungrouped items. */
export function columnGroups(look: Look, col: RoadmapColumn) {
  const { c } = look;
  const tone = col.accent === "deepdive" ? c.purple : c.teal;
  const groups: {
    label?: string;
    hue: string;
    items: (RoadmapItem & { number?: number })[];
  }[] = col.phases
    ? col.phases.map((p) => ({
        label: p.label,
        hue: c[THEME[p.theme ?? "secondary"]] as string,
        items: p.items,
      }))
    : [{ hue: tone, items: col.items ?? [] }];
  return { tone, groups };
}

/** A roadmap column's heading and paragraphs, including each group's marker colors. */
export function roadmapParas(
  look: Look,
  col: RoadmapColumn,
  groups: ReturnType<typeof columnGroups>["groups"],
): Para[] {
  const { c } = look;
  // A row's own marker colour: `tone`, or the class its deprecated `dotColor` names.
  const marker = (it: Pick<RoadmapItem, "tone" | "dotColor">) => {
    const t = it.tone ?? it.dotColor?.slice(3);
    return t ? (c[THEME[t as MarkerTone]] as string) : undefined;
  };
  return [
    { runs: md(col.title, c), mono: true, bold: true, rel: PT.h3 / PT.base, after: 4 },
    ...(col.subtitle ? [{ runs: md(col.subtitle, c, { color: c.muted }), after: 10 }] : []),
    ...groups.flatMap((g) => [
      ...(g.label
        ? [
            {
              runs: [caps(g.label, { color: g.hue })],
              mono: true,
              bold: true,
              rel: 0.8,
              after: 4,
            },
          ]
        : []),
      ...g.items.flatMap((it) => [
        {
          runs: [
            it.number === undefined
              ? { text: "•  ", options: { color: marker(it) ?? g.hue } }
              : {
                  text: `${it.number}  `,
                  options: { color: g.hue, bold: true, fontFace: MONO },
                },
            { text: it.title, options: { bold: true, fontFace: MONO } },
          ],
          after: 2,
        },
        ...(it.description ? [{ runs: md(it.description, c, { color: c.muted }), after: 8 }] : []),
      ]),
    ]),
  ];
}

/** Draws one roadmap column as a card, accent rule, chip and its text. */
export function roadmapColumn(sheet: Sheet, col: RoadmapColumn, r: Area): void {
  const { c } = sheet;
  const { tone, groups } = columnGroups(sheet, col);
  const paras = roadmapParas(sheet, col, groups);
  sheet.card(r, { fill: mixColor(tone, c.bg, 0.05), line: c.border });
  sheet.rect({ x: r.x + 0.15, y: r.y, w: r.w - 0.3, h: 0.05 }, tone);
  const label: Chip = {
    text: col.label,
    size: PT.label * 0.85,
    fill: mixColor(tone, c.bg, 0.15),
    color: tone,
  };
  drawChip(sheet, label, chipArea(label, { x: r.x + 0.25, y: r.y + 0.25 }));
  sheet.box(
    paras,
    { x: r.x + 0.25, y: r.y + 0.65, w: r.w - 0.5, h: r.h - 0.8 },
    { size: PT.base, color: c.ink },
  );
}

// As the web's RoadmapSlide: each column a card holding its items, or its phases as groups of
// rows under a caps label.
export function drawRoadmap(sheet: Sheet, d: RoadmapSlide): void {
  const y = header(sheet, d);
  cellAreas(d.columns.length, BODY(y), 0.35).forEach((r, i) =>
    roadmapColumn(sheet, d.columns[i], r),
  );
}
