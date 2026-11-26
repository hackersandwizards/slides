import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import type { Grounded, Presentation, Slide } from "../../types/slide";
import { groundOf } from "../../components/slides/SlideShell";
import { isDeepDive } from "../../lib/slide-framing";
import { deckLang } from "../../lib/slide-utils";
import { frame } from "./chrome";
import { MONO, SANS } from "./faces";
import {
  chartPartFix,
  finishParts,
  setBrandCorners,
  setBulletMarkers,
  setFontPitch,
  setTextLanguage,
} from "./finish";
import { Look } from "./look";
import { checkSlide } from "./overflow";
import { palette } from "./palette";
import { Sheet, type Output } from "./sheet";
import { SLIDES, slideDrawn } from "./slides";
import { W, H } from "./stage";

export function slidePartNumber(part: string): number | undefined {
  const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(part);
  return match ? Number(match[1]) : undefined;
}

export function deckGrounds(deck: Presentation): (slide?: Slide) => Look {
  const deckLanguage = deckLang(deck);
  const dark = deck.theme === "brand-dark";
  const deckLook = new Look(palette(dark), deckLanguage, dark);
  // A deep-dive slide stands on night, as on the web (`isDeepDive`).
  const nightLook = new Look(palette(true), deckLanguage, true);
  // A slide's ground as the web's `--slide-ground`: its hue at 7 % on the background, which every
  // fill in the ground's colour takes too.
  const grounded = new Map<string, Look>();
  return (slide?: Slide) => {
    const base = dark || !slide || !isDeepDive(slide) ? deckLook : nightLook;
    const ground = slide ? groundOf(slide as Grounded) : "intro";
    if (ground === "intro") return base;
    const key = `${base.dark}-${ground}`;
    const existing = grounded.get(key);
    if (existing) return existing;
    const { c } = base;
    const hue = { primary: c.teal, secondary: c.purple, accent: c.amber, success: c.green }[ground];
    const look = base.grounded(hue);
    grounded.set(key, look);
    return look;
  };
}

export function buildSlides(
  deck: Presentation,
  out: Output,
  lookOf: (slide?: Slide) => Look,
): void {
  deck.slides.forEach((slide, i) => {
    const s = out.pptx.addSlide();
    const sheet = new Sheet(lookOf(slide), s, out);
    frame(sheet, deck, i);
    const drawn = slideDrawn(slide);
    if (!Object.hasOwn(SLIDES, drawn.type))
      throw new Error(
        `slide ${i + 1} is a ${JSON.stringify(slide.type)}, which slides-pptx cannot draw`,
      );
    const render = SLIDES[drawn.type as keyof typeof SLIDES];
    render(sheet, drawn as never);
  });
}

export async function overflowWarnings(zip: JSZip): Promise<string[]> {
  const warnings: string[] = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    const n = slidePartNumber(name);
    if (n === undefined || entry.dir) continue;
    for (const found of checkSlide(await entry.async("string"), W, H))
      warnings.push(`slide ${n}: ${found}`);
  }
  return warnings;
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
  const lookOf = deckGrounds(deck);
  if (deck.speakers?.length) pptx.author = deck.speakers.join(", ");
  pptx.theme = { headFontFace: MONO, bodyFontFace: SANS };
  const out: Output = { pptx, assets, warnings: [], charts: new Map() };
  buildSlides(deck, out, lookOf);
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  await finishParts(zip, [
    chartPartFix(zip, out.charts),
    setFontPitch,
    (xml) => setTextLanguage(xml, deckLanguage),
    setBrandCorners,
    (xml, part) => {
      const n = slidePartNumber(part);
      return setBulletMarkers(xml, lookOf(n !== undefined ? deck.slides[n - 1] : undefined).c);
    },
  ]);
  out.warnings.push(...(await overflowWarnings(zip)));
  return { zip, warnings: out.warnings };
}
