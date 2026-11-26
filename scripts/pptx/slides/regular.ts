import type { RegularSlide } from "../../../types/slide";
import { header } from "../chrome";
import type { Palette } from "../palette";
import { profileLink } from "../people";
import type { Sheet } from "../sheet";
import { BODY, PT, TITLE, type Area } from "../stage";
import { md, type BoxOpts, type Para } from "../text";

/** Draws a regular slide's left profile sidebar (portrait, name, title, and optional LinkedIn
 *  link) and returns the narrowed remaining area for the sections column. */
export function profileSidebar(
  sheet: Sheet,
  profile: NonNullable<RegularSlide["profile"]>,
  area: Area,
): Area {
  const { c } = sheet;
  const pw = 2.6;
  sheet.portrait(profile, { x: area.x + (pw - 1.4) / 2, y: area.y + 0.2, d: 1.4 }, c.teal);
  const who: Para[] = [
    { runs: [{ text: profile.name }], ...TITLE, after: 4 },
    { runs: [{ text: profile.title, options: { color: c.teal } }], rel: 0.9 },
    ...(profile.linkedIn ? [{ ...profileLink(profile.linkedIn, c), rel: 0.9 }] : []),
  ];
  const o: BoxOpts = { size: PT.base, color: c.ink, align: "center" };
  sheet.box(
    who,
    { x: area.x, y: area.y + 1.75, w: pw, h: Math.max(0.9, sheet.need(who, pw, o)) },
    o,
  );
  return { ...area, x: area.x + pw + 0.5, w: area.w - pw - 0.5 };
}

/** Builds the flattened body paragraphs for all sections of a regular slide, setting a 14 pt gap
 *  after each section's last paragraph. */
export function sectionParas(sections: RegularSlide["sections"], c: Palette): Para[] {
  return sections.flatMap((sec) => {
    const paras: Para[] = [
      ...(sec.title
        ? [
            {
              runs: md(sec.title, c, { color: c.teal }),
              mono: true,
              bold: true,
              rel: PT.h4 / PT.base,
              after: 6,
            },
          ]
        : []),
      ...(sec.text ? [{ runs: md(sec.text, c), after: 6 }] : []),
      ...(sec.items ?? []).map((it) => ({ runs: md(it, c), bullet: true as const, after: 5 })),
      ...(sec.link
        ? [
            {
              runs: [
                {
                  text: sec.link.label,
                  options: { color: c.teal, hyperlink: { url: sec.link.url } },
                },
              ],
              after: 6,
            },
          ]
        : []),
    ];
    return paras.map((p, j, arr) => (j === arr.length - 1 ? { ...p, after: 14 } : p));
  });
}

export function drawRegular(sheet: Sheet, d: RegularSlide): void {
  const y = header(sheet, d);
  const body = BODY(y);
  const area = d.profile ? profileSidebar(sheet, d.profile, body) : body;
  sheet.box(sectionParas(d.sections, sheet.c), area, { size: PT.base, color: sheet.c.ink });
}
