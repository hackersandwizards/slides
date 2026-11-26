import { Font, woff2 } from "fonteditor-core";
import JSZip from "jszip";
import { assert, expect, it, vi } from "vitest";
import { eotFace, registerFonts, usedCodePoints } from "../scripts/pptx/embed-fonts";
import { faceFiles } from "../scripts/pptx/faces";

it("keeps Latin ranges, slide text, chart values and their capitals", async () => {
  const zip = new JSZip();
  zip.file("ppt/slides/slide1.xml", "<a:t>я&#x1F680;</a:t>");
  zip.file("ppt/charts/chart1.xml", "<c:v>β</c:v>");
  zip.file("ppt/notesSlides/notesSlide1.xml", "<a:t>Ж</a:t>");
  const latin = [
    ...Array.from({ length: 95 }, (_, i) => 32 + i),
    ...Array.from({ length: 96 }, (_, i) => 160 + i),
  ];
  expect([...(await usedCodePoints(zip))]).toEqual([...latin, 1103, 1071, 128640, 946, 914]);
});

it("merges the requested glyphs from the Latin and Latin Extended files", async () => {
  // Load the same WOFF2 decoder as the CLI, from the local WASM file.
  const browser = globalThis.window;
  vi.stubGlobal("window", undefined);
  try {
    await woff2.init();
  } finally {
    vi.stubGlobal("window", browser);
  }
  const eot = eotFace(Font, faceFiles(false, false), new Set([65, 321]));
  const ttf = eot.subarray(eot.length - eot.readUInt32LE(4));
  expect(Object.keys(Font.create(ttf, { type: "ttf" }).get().cmap).map(Number)).toEqual([65, 321]);
});

it("assigns distinct face parts to relationship IDs after the highest occupied ID", async () => {
  const zip = new JSZip();
  const rels = "ppt/_rels/presentation.xml.rels";
  zip.file(
    rels,
    '<Relationships><Relationship Id="rId2"/><Relationship Id="rId8"/></Relationships>',
  );
  zip.file("[Content_Types].xml", "<Types></Types>");
  zip.file("ppt/presentation.xml", "<p:presentation><p:notesSz/></p:presentation>");
  await registerFonts(zip, [
    { typeface: "Inter", regular: Buffer.from("inter"), bold: Buffer.from("inter bold") },
    { typeface: "JetBrains Mono", regular: Buffer.from("mono"), bold: Buffer.from("mono bold") },
  ]);
  const xml = await zip.file(rels)?.async("string");
  assert(xml, "Missing presentation relationships");
  expect({
    ids: Array.from(xml.matchAll(/Id="(rId\d+)"/g), (match) => match[1]),
    parts: await Promise.all(
      [9, 10, 11, 12].map(async (id) => {
        const part = zip.file(`ppt/fonts/font${id}.fntdata`);
        assert(part, `Missing font part ${id}`);
        return part.async("string");
      }),
    ),
  }).toEqual({
    ids: ["rId2", "rId8", "rId9", "rId10", "rId11", "rId12"],
    parts: ["inter", "inter bold", "mono", "mono bold"],
  });
});
