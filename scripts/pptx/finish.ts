import type JSZip from "jszip";
import type { deckLang } from "../../lib/slide-utils";
import { PITCH } from "./faces";
import { hex, type Palette } from "./palette";
import type { ChartFix } from "./sheet";
import { CAPS, HUE_OF_MARKER, MARKER_SQUARE } from "./text";

type Lang = ReturnType<typeof deckLang>;

export type PartFix = (xml: string, part: string) => string;

const XML_LANG: Record<Lang, string> = { de: "de-DE", en: "en-US" };

// pptxgenjs sets a line's dash, its data markers and labels and where categories stand per chart.
// A trend's categories stand on the plot's edges, as recharts draws them. A marked trend's series
// alternate measured and planned: the planned ones get the dash and leave the legend, its first
// measured one the dot on the marked point. Its category names leave the axis for the text boxes
// the slide sets under the points.
export function finishChart(xml: string, fix: ChartFix): string {
  // pptxgenjs writes no angle of 0, and without one PowerPoint tilts long names.
  if ("level" in fix)
    return fix.level
      ? xml.replace(/(<c:catAx>.*?)<a:bodyPr\/>/s, '$1<a:bodyPr rot="0" vert="horz"/>')
      : xml;
  const { now, unnamed } = fix;
  const hideEntries = (out: string, hidden: number[]) =>
    out.replace(
      '<c:legendPos val="t"/>',
      `<c:legendPos val="t"/>${hidden
        .sort((a, b) => a - b)
        .map((i) => `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`)
        .join("")}`,
    );
  const edged = xml.replace('<c:crossBetween val="between"/>', '<c:crossBetween val="midCat"/>');
  if (now < 0) return hideEntries(edged, unnamed);
  const all = edged.match(/<c:ser>.*?<\/c:ser>/gs) ?? [];
  const planned = all.filter((_, i) => i % 2 === 1);
  const hue = /srgbClr val="(\w+)"/.exec(all[0] ?? "")?.[1];
  const dot = `<c:dPt><c:idx val="${now}"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="${hue}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${hex("--color-white")}"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt>`;
  return hideEntries(edged, [...planned.map((_, i) => 2 * i + 1), ...unnamed])
    .replace(/(<c:catAx>.*?<c:tickLblPos val=")\w+("\/>)/s, "$1none$2")
    .replace(/<c:ser>.*?<\/c:ser>/gs, (ser) =>
      planned.includes(ser)
        ? ser.replace('<a:prstDash val="solid"/>', '<a:prstDash val="dash"/>')
        : ser === all[0]
          ? ser.replace(
              /<c:dLbls>(.*?<\/c:dLbls>)\s*(<c:marker>.*?<\/c:marker>)/s,
              `$2${dot}<c:dLbls>$1`,
            )
          : ser,
    );
}

export function chartPartFix(zip: JSZip, charts: Map<number, ChartFix>): PartFix {
  // pptxgenjs numbers charts across every deck of the process: within one, they run in drawing order.
  const chartFiles = Object.keys(zip.files)
    .flatMap((file) => {
      const match = /^ppt\/charts\/chart(\d+)\.xml$/.exec(file);
      return match ? [[file, Number(match[1])] as const] : [];
    })
    .sort(([, a], [, b]) => a - b)
    .map(([file]) => file);
  return (xml, part) => {
    const fix = charts.get(chartFiles.indexOf(part) + 1);
    return fix ? finishChart(xml, fix) : xml;
  };
}

// Each font reference names its pitch and family class, so PowerPoint on a machine without
// the brand fonts substitutes a sans for Inter and a monospace for JetBrains Mono instead of
// its default face. pptxgenjs writes the typeface alone, or a sans pitch for every face in
// a table.
export function setFontPitch(xml: string): string {
  return xml.replace(
    /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
    (m, face: string) =>
      PITCH[face] ? `typeface="${face}" pitchFamily="${PITCH[face]}" charset="0"` : m,
  );
}

// pptxgenjs marks every run en-US, so PowerPoint's spelling and hyphenation take a German
// deck for English.
export function setTextLanguage(xml: string, language: Lang): string {
  const lang = XML_LANG[language];
  return xml
    .replaceAll('lang="en-US"', `lang="${lang}"`)
    .replaceAll(`lang="${CAPS}"`, `lang="${lang}" cap="all"`);
}

// pptxgenjs writes one `adj` for any preset: the brand corner's two radii, 4 to 1.
export function setBrandCorners(xml: string): string {
  return xml.replace(
    /prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val (\d+)"\/>/g,
    (_, v: string) =>
      `prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val ${v}"/><a:gd name="adj2" fmla="val ${Math.round(+v / 4)}"/>`,
  );
}

// A bullet in the brand colour, as the web's square marker; pptxgenjs writes no bullet
// colour. The brand faces have no square, so the bullet names Arial's, which every
// PowerPoint has: at 130 % it is 0.29 em and stands 0.07 em above the web marker's
// centre, a third of the text's size centred on its first line.
export function setBulletMarkers(xml: string, c: Palette): string {
  return xml.replace(
    /<a:buSzPct val="100000"\/><a:buChar char="&#x(\w+);"\/>/g,
    (_, code: string) => {
      const hue = HUE_OF_MARKER[code];
      const marked = hue ? c[hue] : c.teal;
      return `<a:buClr><a:srgbClr val="${marked}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${hue ? MARKER_SQUARE : code};"/>`;
    },
  );
}

export async function finishParts(zip: JSZip, fixes: readonly PartFix[]): Promise<void> {
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || !/^ppt\/.+\.xml$/.test(name)) continue;
    let xml = await entry.async("string");
    for (const fix of fixes) xml = fix(xml, name);
    zip.file(name, xml);
  }
}
