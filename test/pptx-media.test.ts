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

function picsOf(xml: string) {
  return [...xml.matchAll(/<p:pic>(.*?)<\/p:pic>/gs)].map(([, body]) => {
    const match = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/.exec(body);
    assert(match, "picture frame coordinates");
    const [x, y, w, h] = match.slice(1).map((v) => Number(v) / 914400);
    return { x, y, w, h };
  });
}

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
  const xml = await file.async("string");
  return {
    shapes: shapesOf(xml),
    pics: picsOf(xml),
    media: Object.keys(zip.files)
      .filter((name) => name.startsWith("ppt/media/"))
      .filter((name) => !name.endsWith("/"))
      .sort(),
    warnings,
    zip,
  };
}

async function videoCoverBase64(zip: JSZip) {
  const coverFile = zip.file("ppt/media/image-1-3.png");
  assert(coverFile, "the video cover part");
  return coverFile.async("base64");
}

function createMediaAssets() {
  const dir = mkdtempSync(join(tmpdir(), "pptx-media-test-"));
  writeFileSync(join(dir, "demo.mp4"), Buffer.from("00000018667479706d703432", "hex"));
  writeFileSync(join(dir, "poster.png"), MINIMAL_PNG);
  writeFileSync(join(dir, "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  writeFileSync(join(dir, "photo.png"), MINIMAL_PNG);
  return dir;
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
    expect(
      shapes.map(({ prst, x, y, w, h, fill, texts }) => ({ prst, x, y, w, h, fill, texts })),
    ).toEqual([
      { prst: "ellipse", x: 4.06, y: 3.86, w: 0.28, h: 0.28, fill: "1A7285", texts: [] },
      {
        prst: "rect",
        x: 4.058600174978127,
        y: 3.86,
        w: 0.2827996500437445,
        h: 0.28,
        fill: "FFFFFF",
        texts: ["2"],
      },
      {
        prst: "rect",
        x: 7.55,
        y: 3.8,
        w: 3.4845002187226597,
        h: 0.6,
        fill: "1A7285",
        texts: ["2  ", "Check header"],
      },
    ]);
  });
});

describe("videoCover and videoMissing", () => {
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = createMediaAssets();
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{
    label: string;
    poster: string | undefined;
    area: Area;
    expectedPics: Area[];
    expectedCoverMatches: boolean;
    expectedWarnings: (dir: string) => string[];
  }>([
    {
      label: "a height-limited 16:9 frame centred inside a wide area with a PNG poster",
      poster: "poster.png",
      area: { x: 1, y: 1, w: 8, h: 3.6 },
      expectedPics: [{ x: 1.8, y: 1, w: 6.4, h: 3.6 }],
      expectedCoverMatches: true,
      expectedWarnings: () => [],
    },
    {
      label: "a width-limited frame with a non-PNG poster warning",
      poster: "poster.jpg",
      area: { x: 1, y: 1, w: 4, h: 3.6 },
      expectedPics: [{ x: 1, y: 1, w: 4, h: 3.6 }],
      expectedCoverMatches: false,
      expectedWarnings: (dir) => [`video source.mp4: poster poster.jpg is no PNG under ${dir}`],
    },
    {
      label: "a width-limited frame without a poster",
      poster: undefined,
      area: { x: 2, y: 1.5, w: 4, h: 3 },
      expectedPics: [{ x: 2, y: 1.5, w: 4, h: 3 }],
      expectedCoverMatches: false,
      expectedWarnings: () => [],
    },
  ])(
    "embeds $label",
    async ({ poster, area, expectedPics, expectedCoverMatches, expectedWarnings }) => {
      const out = await drawOnSheet(assetsDir, (sheet) => {
        videoCover(
          sheet,
          { type: "video", src: "source.mp4", poster },
          { area, path: join(assetsDir, "demo.mp4") },
        );
      });
      const coverBase64 = await videoCoverBase64(out.zip);
      expect({
        pics: out.pics,
        coverMatchesPoster: coverBase64 === MINIMAL_PNG.toString("base64"),
        warnings: out.warnings,
      }).toEqual({
        pics: expectedPics,
        coverMatchesPoster: expectedCoverMatches,
        warnings: expectedWarnings(assetsDir),
      });
    },
  );

  it("videoMissing falls back to src when alt is absent and fills the slot area", async () => {
    const out = await drawOnSheet(assetsDir, (sheet) => {
      videoMissing(
        sheet,
        { type: "video", src: "absent.mp4" },
        { area: { x: 1, y: 1.5, w: 6, h: 3 }, k: 1, centered: false },
      );
    });
    expect({
      warnings: out.warnings,
      shapes: out.shapes.map(({ prst, x, y, w, h, fill, texts }) => ({
        prst,
        x,
        y,
        w,
        h,
        fill,
        texts,
      })),
    }).toEqual({
      warnings: [`video absent.mp4: not found under ${assetsDir}`],
      shapes: [
        { prst: "round2DiagRect", x: 1, y: 1.5, w: 6, h: 3, fill: "EEF1F4", texts: [] },
        { prst: "rect", x: 0.97, y: 1.5, w: 6.06, h: 3, fill: "545861", texts: ["absent.mp4"] },
      ],
    });
  });
});

describe("galleryCell", () => {
  let assetsDir = "";

  beforeAll(() => {
    assetsDir = createMediaAssets();
  });

  afterAll(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it.each<{
    label: string;
    item: Block<"gallery">["items"][number];
    expected: {
      pics: Area[];
      shapes: Array<{
        prst: string | undefined;
        x: number;
        y: number;
        w: number;
        h: number;
        fill: string | undefined;
        texts: string[];
      }>;
      media: string[];
    };
  }>([
    {
      label: "a picture item reserves capH for its caption below the picture",
      item: { src: "photo.png", alt: "Sample", caption: "Figure 1" },
      expected: {
        pics: [{ x: 1.65, y: 1, w: 2.7, h: 2.7 }],
        shapes: [
          {
            prst: "rect",
            x: 0.98,
            y: 3.75,
            w: 4.04,
            h: 0.25,
            fill: "545861",
            texts: ["Figure 1"],
          },
        ],
        media: ["ppt/media/image-1-1.png"],
      },
    },
    {
      label: "a picture item without a caption uses the full cell height",
      item: { src: "photo.png", alt: "Sample" },
      expected: {
        pics: [{ x: 1.5, y: 1, w: 3, h: 3 }],
        shapes: [],
        media: ["ppt/media/image-1-1.png"],
      },
    },
    {
      label: "a video item with a caption routes to video rendering inside the cell",
      item: { src: "demo.mp4", alt: "Clip", caption: "Clip 1" },
      expected: {
        pics: [{ x: 1, y: 1, w: 4, h: 2.65 }],
        shapes: [
          {
            prst: "rect",
            x: 0.98,
            y: 3.73,
            w: 4.04,
            h: 0.27,
            fill: "545861",
            texts: ["Clip 1"],
          },
        ],
        media: ["ppt/media/image-1-3.png", "ppt/media/media-1-1.mp4"],
      },
    },
  ])("draws $label", async ({ item, expected }) => {
    const out = await drawOnSheet(assetsDir, (sheet) => {
      galleryCell(sheet, item, { x: 1, y: 1, w: 4, h: 3 });
    });
    expect({
      pics: out.pics,
      shapes: out.shapes.map(({ prst, x, y, w, h, fill, texts }) => ({
        prst,
        x,
        y,
        w,
        h,
        fill,
        texts,
      })),
      media: out.media,
    }).toEqual(expected);
  });
});
