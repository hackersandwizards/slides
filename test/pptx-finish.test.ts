import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, expect, it } from "vitest";
import type { Presentation, Slide } from "../types/slide";
import { buildSlides, deckGrounds, overflowWarnings } from "../scripts/pptx/deck";
import { MONO, SANS } from "../scripts/pptx/faces";
import {
  chartPartFix,
  finishChart,
  finishParts,
  setBrandCorners,
  setBulletMarkers,
  setFontPitch,
  setTextLanguage,
} from "../scripts/pptx/finish";
import { hex, mixColor, palette } from "../scripts/pptx/palette";
import type { ChartFix, Output } from "../scripts/pptx/sheet";
import { CAPS, MARKER_CODES, MARKER_SQUARE } from "../scripts/pptx/text";

async function readPart(zip: JSZip, name: string): Promise<string> {
  const file = zip.file(name);
  assert(file, `expected ${name} in zip`);
  return file.async("string");
}

it("replaces brand typeface attributes with their pitch and keeps other faces unchanged", () => {
  const xml = [
    `<a:latin typeface="${MONO}" pitchFamily="34" charset="0" panose="020B"/>`,
    `<a:latin typeface="${SANS}"/>`,
    '<a:latin typeface="Arial" pitchFamily="34"/>',
  ].join("");
  expect(setFontPitch(xml)).toEqual(
    [
      `<a:latin typeface="${MONO}" pitchFamily="49" charset="0"/>`,
      `<a:latin typeface="${SANS}" pitchFamily="34" charset="0"/>`,
      '<a:latin typeface="Arial" pitchFamily="34"/>',
    ].join(""),
  );
});

it.each([
  { language: "de" as const, expected: "de-DE" },
  { language: "en" as const, expected: "en-US" },
])("sets XML language and caps attribute for $language", ({ language, expected }) => {
  const xml = `<a:rPr lang="en-US"/><a:rPr lang="${CAPS}"/><a:rPr lang="fr-FR"/>`;
  expect(setTextLanguage(xml, language)).toEqual(
    `<a:rPr lang="${expected}"/><a:rPr lang="${expected}" cap="all"/><a:rPr lang="fr-FR"/>`,
  );
});

it("splits round2DiagRect adj into a 4-to-1 adj1/adj2 pair and keeps other presets", () => {
  const xml = [
    '<a:prstGeom prst="round2DiagRect"><a:avLst><a:gd name="adj" fmla="val 10002"/></a:avLst></a:prstGeom>',
    '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 10000"/></a:avLst></a:prstGeom>',
  ].join("");
  expect(setBrandCorners(xml)).toEqual(
    [
      '<a:prstGeom prst="round2DiagRect"><a:avLst><a:gd name="adj1" fmla="val 10002"/><a:gd name="adj2" fmla="val 2501"/></a:avLst></a:prstGeom>',
      '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 10000"/></a:avLst></a:prstGeom>',
    ].join(""),
  );
});

it.each([
  {
    name: "green private marker",
    code: MARKER_CODES.green,
    hue: "green" as const,
    out: MARKER_SQUARE,
  },
  { name: "red private marker", code: MARKER_CODES.red, hue: "red" as const, out: MARKER_SQUARE },
  { name: "plain bullet code", code: "2022", hue: "teal" as const, out: "2022" },
])("colours $name in its palette hue with Arial at 130%", ({ code, hue, out }) => {
  const day = palette(false);
  const xml = `<a:buSzPct val="100000"/><a:buChar char="&#x${code};"/>`;
  expect(setBulletMarkers(xml, day)).toEqual(
    `<a:buClr><a:srgbClr val="${day[hue]}"/></a:buClr><a:buSzPct val="130000"/><a:buFont typeface="Arial" pitchFamily="34" charset="0"/><a:buChar char="&#x${out};"/>`,
  );
});

it.each([
  {
    name: "keeps level bar labels horizontal",
    fix: { level: true } as ChartFix,
    expected: '<c:catAx><c:txPr><a:bodyPr rot="0" vert="horz"/></c:txPr></c:catAx>',
  },
  {
    name: "leaves tilted bar labels untouched",
    fix: { level: false } as ChartFix,
    expected: "<c:catAx><c:txPr><a:bodyPr/></c:txPr></c:catAx>",
  },
])("finishChart $name", ({ fix, expected }) => {
  const xml = "<c:catAx><c:txPr><a:bodyPr/></c:txPr></c:catAx>";
  expect(finishChart(xml, fix)).toEqual(expected);
});

it("finishChart sets midCat and sorts hidden legend entries for an unmarked trend", () => {
  const xml = '<c:crossBetween val="between"/><c:legendPos val="t"/>';
  expect(finishChart(xml, { now: -1, unnamed: [2, 0] })).toEqual(
    '<c:crossBetween val="midCat"/><c:legendPos val="t"/><c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry><c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>',
  );
});

it("finishChart dashes planned series, dots the marked point and hides axis labels", () => {
  const white = hex("--color-white");
  const xml = [
    '<c:crossBetween val="between"/>',
    '<c:legendPos val="t"/>',
    '<c:catAx><c:tickLblPos val="nextTo"/></c:catAx>',
    '<c:ser><a:srgbClr val="008080"/><a:prstDash val="solid"/><c:dLbls><c:showVal val="0"/></c:dLbls><c:marker><c:symbol val="none"/></c:marker></c:ser>',
    '<c:ser><a:srgbClr val="008080"/><a:prstDash val="solid"/></c:ser>',
  ].join("");
  expect(finishChart(xml, { now: 1, unnamed: [3] })).toEqual(
    [
      '<c:crossBetween val="midCat"/>',
      '<c:legendPos val="t"/><c:legendEntry><c:idx val="1"/><c:delete val="1"/></c:legendEntry><c:legendEntry><c:idx val="3"/><c:delete val="1"/></c:legendEntry>',
      '<c:catAx><c:tickLblPos val="none"/></c:catAx>',
      `<c:ser><a:srgbClr val="008080"/><a:prstDash val="solid"/><c:marker><c:symbol val="none"/></c:marker><c:dPt><c:idx val="1"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="008080"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${white}"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt><c:dLbls><c:showVal val="0"/></c:dLbls></c:ser>`,
      '<c:ser><a:srgbClr val="008080"/><a:prstDash val="dash"/></c:ser>',
    ].join(""),
  );
});

it("applies part fixes in drawing order across ppt XML parts and skips root parts", async () => {
  const zip = new JSZip();
  zip.file("ppt/charts/chart10.xml", '<c:catAx><a:bodyPr/></c:catAx><a:latin typeface="Inter"/>');
  zip.file("ppt/charts/chart2.xml", "<c:catAx><a:bodyPr/></c:catAx>");
  zip.file("ppt/slides/slide1.xml", `<a:latin typeface="${MONO}"/>`);
  zip.file("[Content_Types].xml", `<a:latin typeface="${MONO}"/>`);
  const charts = new Map<number, ChartFix>([
    [1, { level: true }],
    [2, { level: false }],
  ]);
  await finishParts(zip, [chartPartFix(zip, charts), { name: "font-pitch", fix: setFontPitch }]);
  expect({
    chart2: await readPart(zip, "ppt/charts/chart2.xml"),
    chart10: await readPart(zip, "ppt/charts/chart10.xml"),
    slide1: await readPart(zip, "ppt/slides/slide1.xml"),
    contentTypes: await readPart(zip, "[Content_Types].xml"),
  }).toEqual({
    chart2: '<c:catAx><a:bodyPr rot="0" vert="horz"/></c:catAx>',
    chart10: `<c:catAx><a:bodyPr/></c:catAx><a:latin typeface="${SANS}" pitchFamily="34" charset="0"/>`,
    slide1: `<a:latin typeface="${MONO}" pitchFamily="49" charset="0"/>`,
    contentTypes: `<a:latin typeface="${MONO}"/>`,
  });
});

it("resolves day, deep-dive night, cached tinted grounds and dark deck looks", () => {
  const day = palette(false);
  const night = palette(true);
  const lightDeck: Presentation = { name: "Light", lang: "de", slides: [] };
  const darkDeck: Presentation = { name: "Dark", lang: "en", theme: "brand-dark", slides: [] };
  const lightOf = deckGrounds(lightDeck);
  const darkOf = deckGrounds(darkDeck);
  const accentSlide: Slide = {
    type: "content",
    headline: "Q",
    content: [{ type: "paragraph", text: "Yes" }],
    ground: "accent",
  };
  const deepSlide: Slide = {
    type: "content",
    headline: "D",
    content: [{ type: "paragraph", text: "Yes" }],
    sectionTheme: "deepdive",
  };
  const accentFirst = lightOf(accentSlide);
  const accentSecond = lightOf(accentSlide);
  expect({
    base: {
      dark: lightOf(undefined).dark,
      lang: lightOf(undefined).lang,
      bg: lightOf(undefined).c.bg,
    },
    deep: { dark: lightOf(deepSlide).dark, bg: lightOf(deepSlide).c.bg },
    accentBg: accentFirst.c.bg,
    cached: accentFirst === accentSecond,
    darkDeck: { dark: darkOf(undefined).dark, bg: darkOf(undefined).c.bg },
  }).toEqual({
    base: { dark: false, lang: "de", bg: day.bg },
    deep: { dark: true, bg: night.bg },
    accentBg: mixColor(day.amber, day.bg, 0.07),
    cached: true,
    darkDeck: { dark: true, bg: night.bg },
  });
});

it("builds one pptx slide per deck slide on the output presentation", async () => {
  const deck: Presentation = {
    name: "Build",
    lang: "en",
    slides: [
      { type: "title", title: "Start" },
      { type: "content", headline: "Ask", content: [{ type: "paragraph", text: "Next" }] },
    ],
  };
  const out: Output = { pptx: new PptxGenJS(), assets: "", warnings: [], charts: new Map() };
  buildSlides(deck, out, deckGrounds(deck));
  const zip = await JSZip.loadAsync((await out.pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const slides = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort();
  expect({ slides, warnings: out.warnings }).toEqual({
    slides: ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml"],
    warnings: [],
  });
});

it("reports overflow findings per slide part and ignores non-slide parts", async () => {
  const zip = new JSZip();
  const shapeAt = (xEmu: number, text: string) =>
    `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Box"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${xEmu}" y="914400"/><a:ext cx="914400" cy="457200"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr sz="1400"/><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;
  zip.file("ppt/slides/slide1.xml", `<p:sld>${shapeAt(914400, "Fits")}</p:sld>`);
  zip.file("ppt/slides/slide2.xml", `<p:sld>${shapeAt(13000000, "Wide")}</p:sld>`);
  zip.file("ppt/notesSlides/notesSlide2.xml", `<p:notes>${shapeAt(13000000, "Ignored")}</p:notes>`);
  expect(await overflowWarnings(zip)).toEqual(['slide 2: Box "Wide" stands outside the slide']);
});
