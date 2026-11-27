import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, expect, it } from "vitest";
import type { Presentation, Slide } from "../types/slide";
import { buildSlides, deckGrounds, overflowWarnings, slidePartNumber } from "../scripts/pptx/deck";
import { MONO } from "../scripts/pptx/faces";
import {
  chartPartFix,
  finishChart,
  finishParts,
  setBrandCorners,
  setBulletMarkers,
  setFontPitch,
  setTextLanguage,
} from "../scripts/pptx/finish";
import { palette } from "../scripts/pptx/palette";
import type { ChartFix, Output } from "../scripts/pptx/sheet";
import { CAPS, MARKER_CODES, MARKER_SQUARE } from "../scripts/pptx/text";

async function readPart(zip: JSZip, name: string): Promise<string> {
  const file = zip.file(name);
  assert(file, `expected ${name} in zip`);
  return file.async("string");
}

it("strips stale panose attributes on brand faces and leaves non-brand faces unchanged", () => {
  const xml = [
    `<a:latin typeface="${MONO}" pitchFamily="34" charset="0" panose="020B"/>`,
    '<a:latin typeface="Arial" pitchFamily="34"/>',
  ].join("");
  expect(setFontPitch(xml)).toEqual(
    [
      `<a:latin typeface="${MONO}" pitchFamily="49" charset="0"/>`,
      '<a:latin typeface="Arial" pitchFamily="34"/>',
    ].join(""),
  );
});

it("stamps en as en-US and preserves other language tags", () => {
  const xml = `<a:rPr lang="en-US"/><a:rPr lang="${CAPS}"/><a:rPr lang="fr-FR"/>`;
  expect(setTextLanguage(xml, "en")).toEqual(
    '<a:rPr lang="en-US"/><a:rPr lang="en-US" cap="all"/><a:rPr lang="fr-FR"/>',
  );
});

it("rounds round2DiagRect adj2 to the nearest quarter and leaves other presets unchanged", () => {
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

it("sorts hidden legend entries in ascending index order on an unmarked trend", () => {
  const xml = '<c:crossBetween val="between"/><c:legendPos val="t"/>';
  expect(finishChart(xml, { now: -1, unnamed: [2, 0] })).toEqual(
    '<c:crossBetween val="midCat"/><c:legendPos val="t"/><c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry><c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>',
  );
});

it("adds the 11pt marked circle with the first series fill, 19050 white ring and bubble3D off", () => {
  const xml =
    '<c:ser><c:spPr><a:ln><a:solidFill><a:srgbClr val="1A7285"/></a:solidFill></a:ln></c:spPr><c:dLbls><c:showVal val="0"/></c:dLbls><c:marker><c:symbol val="none"/></c:marker></c:ser>';
  expect(finishChart(xml, { now: 2, unnamed: [] })).toEqual(
    '<c:ser><c:spPr><a:ln><a:solidFill><a:srgbClr val="1A7285"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="none"/></c:marker><c:dPt><c:idx val="2"/><c:marker><c:symbol val="circle"/><c:size val="11"/><c:spPr><a:solidFill><a:srgbClr val="1A7285"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt><c:dLbls><c:showVal val="0"/></c:dLbls></c:ser>',
  );
});

it("applies part fixes in numeric chart order across ppt XML parts and skips root parts", async () => {
  const zip = new JSZip();
  zip.file("ppt/charts/chart10.xml", '<c:legendPos val="t"/>');
  zip.file("ppt/charts/chart2.xml", '<c:legendPos val="t"/>');
  zip.file("ppt/slides/slide1.xml", "<a:t>RAW</a:t>");
  zip.file("[Content_Types].xml", "<a:t>RAW</a:t>");
  const charts = new Map<number, ChartFix>([
    [1, { now: -1, unnamed: [0] }],
    [2, { now: -1, unnamed: [2] }],
  ]);
  await finishParts(zip, [chartPartFix(zip, charts), (xml) => xml.replace("RAW", "DONE")]);
  expect({
    chart2: await readPart(zip, "ppt/charts/chart2.xml"),
    chart10: await readPart(zip, "ppt/charts/chart10.xml"),
    slide1: await readPart(zip, "ppt/slides/slide1.xml"),
    contentTypes: await readPart(zip, "[Content_Types].xml"),
  }).toEqual({
    chart2:
      '<c:legendPos val="t"/><c:legendEntry><c:idx val="0"/><c:delete val="1"/></c:legendEntry>',
    chart10:
      '<c:legendPos val="t"/><c:legendEntry><c:idx val="2"/><c:delete val="1"/></c:legendEntry>',
    slide1: "<a:t>DONE</a:t>",
    contentTypes: "<a:t>RAW</a:t>",
  });
});

it.each([
  { part: "ppt/slides/slide12.xml", expected: 12 },
  { part: "ppt/notesSlides/notesSlide1.xml", expected: undefined },
])("parses the slide number from $part", ({ part, expected }) => {
  expect(slidePartNumber(part)).toEqual(expected);
});

const lightDeck: Presentation = { name: "Light", lang: "de", slides: [] };
const darkDeck: Presentation = { name: "Dark", lang: "en", theme: "brand-dark", slides: [] };
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
const deepAccentSlide: Slide = {
  type: "content",
  headline: "DA",
  content: [{ type: "paragraph", text: "Yes" }],
  sectionTheme: "deepdive",
  ground: "accent",
};

it.each([
  {
    name: "day base",
    deck: lightDeck,
    slide: undefined,
    expected: { dark: false, bg: "F7F9FA", lang: "de" },
  },
  {
    name: "dark deck base",
    deck: darkDeck,
    slide: undefined,
    expected: { dark: true, bg: "0B1118", lang: "en" },
  },
  {
    name: "deep-dive on day deck",
    deck: lightDeck,
    slide: deepSlide,
    expected: { dark: true, bg: "0B1118", lang: "de" },
  },
  {
    name: "deep-dive on dark deck",
    deck: darkDeck,
    slide: deepSlide,
    expected: { dark: true, bg: "0B1118", lang: "en" },
  },
  {
    name: "accent ground on day deck",
    deck: lightDeck,
    slide: accentSlide,
    expected: { dark: false, bg: "F2EDE9", lang: "de" },
  },
  {
    name: "accent ground on deep-dive slide",
    deck: lightDeck,
    slide: deepAccentSlide,
    expected: { dark: true, bg: "1B1B17", lang: "de" },
  },
])("resolves theme, ground and language for $name", ({ deck, slide, expected }) => {
  const look = deckGrounds(deck)(slide);
  expect({ dark: look.dark, bg: look.c.bg, lang: look.lang }).toEqual(expected);
});

it("caches grounded looks per base and ground", () => {
  const lookOf = deckGrounds(lightDeck);
  expect(lookOf(accentSlide)).toBe(lookOf(accentSlide));
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
