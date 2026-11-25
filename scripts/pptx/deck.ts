import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import type { Grounded, Presentation, Slide } from "../../types/slide";
import { groundOf } from "../../components/slides/SlideShell";
import { isDeepDive } from "../../lib/slide-framing";
import { deckLang } from "../../lib/slide-utils";
import { frame } from "./chrome";
import { MONO, PITCH, SANS } from "./faces";
import { Look } from "./look";
import { checkSlide } from "./overflow";
import { hex, palette } from "./palette";
import { Sheet, type ChartFix, type Output } from "./sheet";
import { SLIDES, slideDrawn } from "./slides";
import { W, H } from "./stage";
import { HUE_OF_MARKER, MARKER_SQUARE, CAPS } from "./text";

type Render = (sheet: Sheet, slide: never) => void;

// pptxgenjs sets a line's dash, its data markers and labels and where categories stand per chart.
// A trend's categories stand on the plot's edges, as recharts draws them. A marked trend's series
// alternate measured and planned: the planned ones get the dash and leave the legend, its first
// measured one the dot on the marked point. Its category names leave the axis for the text boxes
// the slide sets under the points.
function finishChart(xml: string, fix: ChartFix) {
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

/** Builds the deck and checks the finished slides for overflow. Returns warnings for images or
 *  videos it could not place. */
export async function renderPptx(
  deck: Presentation,
  assets: string,
): Promise<{ zip: JSZip; warnings: string[] }> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.name;
  const deckLanguage = deckLang(deck);
  const lang = { de: "de-DE", en: "en-US" }[deckLanguage] ?? "en-US";
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const dark = deck.theme === "brand-dark";
  const deckLook = new Look(palette(dark), deckLanguage, dark);
  const out: Output = {
    pptx,
    assets,
    warnings: [],
    charts: new Map(),
  };
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightLook = new Look(palette(true), deckLanguage, true);
  // A slide's ground as the web's `--slide-ground`: its hue at 7 % on the background, which every
  // fill in the ground's colour takes too.
  const grounded = new Map<string, Look>();
  const lookOf = (slide: Slide | undefined) => {
    const base = dark || !slide || !isDeepDive(slide) ? deckLook : nightLook;
    const ground = slide ? groundOf(slide as Grounded) : "intro";
    if (ground === "intro") return base;
    const key = `${base.dark}-${ground}`;
    if (!grounded.has(key)) {
      const { c } = base;
      const hue = { primary: c.teal, secondary: c.purple, accent: c.amber, success: c.green }[
        ground
      ];
      grounded.set(key, base.grounded(hue));
    }
    return grounded.get(key)!;
  };
  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const sheet = new Sheet(lookOf(slide), s, out);
    frame(sheet, deck, i);
    const drawn = slideDrawn(slide);
    const render = SLIDES[drawn.type as keyof typeof SLIDES] as Render | undefined;
    if (!render)
      throw new Error(
        `slide ${i + 1} is a ${JSON.stringify(slide.type)}, which slides-pptx cannot draw`,
      );
    render(sheet, drawn as never);
  });
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  // pptxgenjs numbers charts across every deck of the process: within one, they run in drawing order.
  const chartFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  for (const name of Object.keys(zip.files).filter((f) => /^ppt\/.+\.xml$/.test(f))) {
    const raw = await zip.file(name)!.async("string");
    const fix = out.charts.get(chartFiles.indexOf(name) + 1);
    const xml = fix ? finishChart(raw, fix) : raw;
    const n = /^ppt\/slides\/slide(\d+)\.xml$/.exec(name);
    const slideC = lookOf(n ? deck.slides[Number(n[1]) - 1] : undefined).c;
    zip.file(
      name,
      xml
        // Each font reference names its pitch and family class, so PowerPoint on a machine without
        // the brand fonts substitutes a sans for Inter and a monospace for JetBrains Mono instead of
        // its default face. pptxgenjs writes the typeface alone, or a sans pitch for every face in
        // a table.
        .replace(
          /typeface="([^"]+)"(?:\s+(?:pitchFamily|charset|panose)="[^"]*")*/g,
          (m, face: string) =>
            PITCH[face] ? `typeface="${face}" pitchFamily="${PITCH[face]}" charset="0"` : m,
        )
        // pptxgenjs marks every run en-US, so PowerPoint's spelling and hyphenation take a German
        // deck for English.
        .replaceAll('lang="en-US"', `lang="${lang}"`)
        .replaceAll(`lang="${CAPS}"`, `lang="${lang}" cap="all"`)
        // pptxgenjs writes one `adj` for any preset: the brand corner's two radii, 4 to 1.
        .replace(
          /prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val (\d+)"\/>/g,
          (_, v: string) =>
            `prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val ${v}"/><a:gd name="adj2" fmla="val ${Math.round(+v / 4)}"/>`,
        )
        // A bullet in the brand colour, as the web's square marker; pptxgenjs writes no bullet
        // colour. The brand faces have no square, so the bullet names Arial's, which every
        // PowerPoint has: at 130 % it is 0.29 em and stands 0.07 em above the web marker's
        // centre, a third of the text's size centred on its first line.
        .replace(/<a:buSzPct val="100000"\/><a:buChar char="&#x(\w+);"\/>/g, (_, code: string) => {
          const hue = HUE_OF_MARKER[code];
          const marked = hue ? slideC[hue] : slideC.teal;
          return `<a:buClr><a:srgbClr val="${marked}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${hue ? MARKER_SQUARE : code};"/>`;
        }),
    );
    if (n)
      for (const found of checkSlide(await zip.file(name)!.async("string"), W, H))
        out.warnings.push(`slide ${n[1]}: ${found}`);
  }
  return { zip, warnings: out.warnings };
}
