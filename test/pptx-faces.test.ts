import { readFileSync } from "node:fs";
import { brotliCompressSync } from "node:zlib";
import { expect, it } from "vitest";
import { faceFiles, faceMetrics, woff2Tables } from "../scripts/pptx-text";

// The measure reads hmtx as a plain table; a WOFF2 encoder may transform it, which drops the left
// side bearings and would shift every advance it reads.
it("refuses a face whose hmtx table is transformed, and reads one whose hmtx is plain", () => {
  const font = Buffer.from(readFileSync(faceFiles(false, false)[0]));
  expect(woff2Tables(font).get("hmtx")!.length).toBeGreaterThan(0);
  let at = 48;
  const skip = () => {
    while (font[at++] & 0x80);
  };
  for (let i = 0; i < font.readUInt16BE(12); i++) {
    const flags = font[at];
    if ((flags & 0x3f) === 3) {
      font[at] = flags | 0x40;
      break;
    }
    at += (flags & 0x3f) === 63 ? 5 : 1;
    skip();
    const index = flags & 0x3f;
    if (index === 10 || index === 11 ? flags >> 6 !== 3 : flags >> 6 !== 0) skip();
  }
  expect(() => woff2Tables(font)).toThrow(/hmtx/);
});

function woff2WithDirectory(count: number, directory: number[], tables: Buffer) {
  const compressed = brotliCompressSync(tables);
  const header = Buffer.alloc(48);
  header.write("wOF2");
  header.writeUInt16BE(count, 12);
  header.writeUInt32BE(compressed.length, 20);
  return Buffer.concat([header, Buffer.from(directory), compressed]);
}

it("refuses a WOFF2 table length that continues after five UIntBase128 bytes", () => {
  const directory = [0, 0x80, 0x80, 0x80, 0x80, 0x80];
  const font = woff2WithDirectory(1, directory, Buffer.alloc(0));
  expect(() => woff2Tables(font)).toThrow("bad UIntBase128");
});

it("reads the advances of a supplementary range in a format 12 cmap", () => {
  const cmap = Buffer.alloc(40);
  cmap.writeUInt16BE(1, 2);
  cmap.writeUInt16BE(3, 4);
  cmap.writeUInt16BE(10, 6);
  cmap.writeUInt32BE(12, 8);
  cmap.writeUInt16BE(12, 12);
  cmap.writeUInt32BE(28, 16);
  cmap.writeUInt32BE(1, 24);
  cmap.writeUInt32BE(0x10000, 28);
  cmap.writeUInt32BE(0x10001, 32);
  cmap.writeUInt32BE(1, 36);

  const head = Buffer.alloc(20);
  head.writeUInt16BE(1000, 18);
  const hhea = Buffer.alloc(36);
  hhea.writeInt16BE(800, 4);
  hhea.writeInt16BE(-200, 6);
  hhea.writeUInt16BE(3, 34);
  const hmtx = Buffer.alloc(12);
  hmtx.writeUInt16BE(500, 4);
  hmtx.writeUInt16BE(750, 8);

  const directory = [0, cmap.length, 1, head.length, 2, hhea.length, 3, hmtx.length];
  const font = woff2WithDirectory(4, directory, Buffer.concat([cmap, head, hhea, hmtx]));
  const { advance } = faceMetrics([font]);
  expect([advance(0x10000), advance(0x10001), advance(0x10002)]).toEqual([0.5, 0.75, undefined]);
});
