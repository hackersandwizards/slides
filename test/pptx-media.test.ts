import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";
import {
  annotatedCrop,
  annotatedNotes,
  drawAnnotatedNote,
  type AnnotatedCrop,
  type AnnotatedNote,
} from "../scripts/pptx/blocks/annotated";
import type { Block } from "../scripts/pptx/blocks/kind";
import { galleryCell, videoCover, videoMissing } from "../scripts/pptx/blocks/media";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import type { Area } from "../scripts/pptx/stage";
import { shapesOf } from "./fixtures/rendered-deck";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function drawOnSheet(assets: string, draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const warnings: string[] = [];
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets,
    warnings,
    charts: new Map(),
  });
  draw(sheet);
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = zip.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  const coverFile = zip.file("ppt/media/image-1-3.png");
  const coverBase64 = coverFile ? await coverFile.async("base64") : "";
  return {
    xml: await file.async("string"),
    shapes: shapesOf(await file.async("string")),
    media: Object.keys(zip.files)
      .filter((name) => name.startsWith("ppt/media/"))
      .filter((name) => !name.endsWith("/"))
      .sort(),
    coverMatchesPoster: coverBase64 === MINIMAL_PNG.toString("base64"),
    warnings,
  };
}

describe("annotatedCrop", () => {
  const area: Area = { x: 1, y: 2, w: 10, h: 4 };

  it.each<{
    label: string;
    size: readonly [number, number];
    crop: Block<"annotated">["crop"];
    expected: AnnotatedCrop;
  }>([
    {
      label: "an uncropped wide image limited by the 62% image width",
      size: [1600, 800],
      crop: undefined,
      expected: {
        iw: 6.2,
        top: 0,
        bottom: 1,
        fullW: 6.2,
        fullH: 3.1,
        cropY: 0,
        pw: 6.2,
        ph: 3.1,
      },
    },
    {
      label: "a cropped tall band limited by the area height",
      size: [1000, 2000],
      crop: { top: 0.25, bottom: 0.75, right: 0.8 },
      expected: {
        iw: 6.2,
        top: 0.25,
        bottom: 0.75,
        fullW: 4,
        fullH: 8,
        cropY: 2,
        pw: 3.2,
        ph: 4,
      },
    },
  ])("computes the crop geometry for $label", ({ size, crop, expected }) => {
    expect(annotatedCrop(size, area, crop)).toEqual(expected);
  });
});

describe("annotatedNotes", () => {
  it("places numbered callout markers on the cropped image edge and boxes in the note column", () => {
    const area: Area = { x: 1, y: 2, w: 10, h: 4 };
    const fit: AnnotatedCrop = {
      iw: 6.2,
      top: 0.25,
      bottom: 0.75,
      fullW: 4,
      fullH: 8,
      cropY: 2,
      pw: 3.2,
      ph: 4,
    };
    const notes: Block<"annotated">["notes"] = [
      { y: 0.25, text: "Top edge" },
      { y: 0.5, text: "Middle point" },
    ];
    expect(annotatedNotes(notes, area, fit)).toEqual<AnnotatedNote[]>([
      {
        number: 1,
        text: "Top edge",
        marker: { x: 4.0600000000000005, y: 1.8599999999999999, w: 0.28, h: 0.28 },
        box: { x: 7.55, y: 1.8, w: 3.4499999999999997, h: 0.6 },
      },
      {
        number: 2,
        text: "Middle point",
        marker: { x: 4.0600000000000005, y: 3.86, w: 0.28, h: 0.28 },
        box: { x: 7.55, y: 3.8, w: 3.4499999999999997, h: 0.6 },
      },
    ]);
  });
});

describe("drawAnnotatedNote", () => {
  it("draws a teal ellipse, white centered number, and prefixed note text", async () => {
    const note: AnnotatedNote = {
      number: 2,
      text: "Check header",
      marker: { x: 4.06, y: 3.86, w: 0.28, h: 0.28 },
      box: { x: 7.55, y: 3.8, w: 3.45, h: 0.6 },
    };
    const { shapes } = await drawOnSheet("", (sheet) => {
      drawAnnotatedNote(sheet, note, { size: 16, color: sheet.c.ink, line: 1.375 });
    });
    const round = (n: number) => Number(n.toFixed(2));
    expect(
      shapes.map(({ prst, x, y, fill, texts }) => ({
        prst,
        x: round(x),
        y: round(y),
        fill,
        texts,
      })),
    ).toEqual([
      { prst: "ellipse", x: 4.06, y: 3.86, fill: "1A7285", texts: [] },
      { prst: "rect", x: 4.06, y: 3.86, fill: "FFFFFF", texts: ["2"] },
      { prst: "rect", x: 7.55, y: 3.8, fill: "1A7285", texts: ["2  ", "Check header"] },
    ]);
  });
});

describe("videoCover and videoMissing", () => {
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "pptx-media-test-"));
    writeFileSync(join(assetsDir, "demo.mp4"), Buffer.from("00000018667479706d703432", "hex"));
    writeFileSync(join(assetsDir, "poster.png"), MINIMAL_PNG);
    writeFileSync(join(assetsDir, "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    writeFileSync(join(assetsDir, "photo.png"), MINIMAL_PNG);
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{
    label: string;
    poster: string | undefined;
    expectedCoverMatches: boolean;
    expectedMedia: string[];
    expectedWarnings: (dir: string) => string[];
  }>([
    {
      label: "a video with a valid PNG poster",
      poster: "poster.png",
      expectedCoverMatches: true,
      expectedMedia: ["ppt/media/image-1-3.png", "ppt/media/media-1-1.mp4"],
      expectedWarnings: () => [],
    },
    {
      label: "a video with a non-PNG poster warns and omits the cover",
      poster: "poster.jpg",
      expectedCoverMatches: false,
      expectedMedia: ["ppt/media/image-1-3.png", "ppt/media/media-1-1.mp4"],
      expectedWarnings: (dir) => [`video demo.mp4: poster poster.jpg is no PNG under ${dir}`],
    },
    {
      label: "a video without a poster",
      poster: undefined,
      expectedCoverMatches: false,
      expectedMedia: ["ppt/media/image-1-3.png", "ppt/media/media-1-1.mp4"],
      expectedWarnings: () => [],
    },
  ])("embeds $label", async ({ poster, expectedCoverMatches, expectedMedia, expectedWarnings }) => {
    const out = await drawOnSheet(assetsDir, (sheet) => {
      videoCover(sheet, { type: "video", src: "demo.mp4", poster }, { x: 1, y: 1, w: 8, h: 3.6 });
    });
    expect({
      coverMatchesPoster: out.coverMatchesPoster,
      media: out.media,
      warnings: out.warnings,
    }).toEqual({
      coverMatchesPoster: expectedCoverMatches,
      media: expectedMedia,
      warnings: expectedWarnings(assetsDir),
    });
  });

  it("draws a tinted placeholder card with alt fallback and warns when video is missing", async () => {
    const out = await drawOnSheet(assetsDir, (sheet) => {
      videoMissing(
        sheet,
        { type: "video", src: "absent.mp4", alt: "Demo reel" },
        { area: { x: 1, y: 1.5, w: 6, h: 3 }, k: 1, centered: false },
      );
    });
    expect({
      warnings: out.warnings,
      card: out.shapes
        .filter((sh) => sh.prst === "round2DiagRect")
        .map(({ fill, x, y }) => ({ fill, x, y })),
      texts: out.shapes.flatMap((sh) => sh.texts),
    }).toEqual({
      warnings: [`video absent.mp4: not found under ${assetsDir}`],
      card: [{ fill: "EEF1F4", x: 1, y: 1.5 }],
      texts: ["Demo reel"],
    });
  });

  it.each<{
    label: string;
    item: Block<"gallery">["items"][number];
    expected: { texts: string[]; media: string[] };
  }>([
    {
      label: "a picture item with its caption",
      item: { src: "photo.png", alt: "Sample", caption: "Figure 1" },
      expected: { texts: ["Figure 1"], media: ["ppt/media/image-1-1.png"] },
    },
    {
      label: "a video item routed to video rendering with its caption",
      item: { src: "demo.mp4", alt: "Clip", caption: "Clip 1" },
      expected: {
        texts: ["Clip 1"],
        media: ["ppt/media/image-1-3.png", "ppt/media/media-1-1.mp4"],
      },
    },
  ])("draws a gallery cell for $label", async ({ item, expected }) => {
    const out = await drawOnSheet(assetsDir, (sheet) => {
      galleryCell(sheet, item, { x: 1, y: 1, w: 4, h: 3 });
    });
    expect({
      texts: out.shapes.flatMap((sh) => sh.texts),
      media: out.media,
    }).toEqual(expected);
  });
});
