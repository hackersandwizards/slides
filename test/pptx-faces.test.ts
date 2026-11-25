import { readFileSync } from "node:fs";
import { brotliCompressSync } from "node:zlib";
import { assert, expect, it } from "vitest";
import {
  faceFiles,
  faceMetrics,
  readCmapFormat12,
  readCmapFormat4,
  woff2Tables,
} from "../scripts/pptx/faces";

it("reads the plain hmtx table of a brand face", () => {
  const font = readFileSync(faceFiles(false, false)[0]);
  const metrics = woff2Tables(font).get("hmtx");
  assert(metrics, "The brand face has horizontal metrics");
  expect(metrics.length).toBeGreaterThan(0);
});

function woff2WithDirectory(count: number, directory: number[], tables: Buffer) {
  const compressed = brotliCompressSync(tables);
  const header = Buffer.alloc(48);
  header.write("wOF2");
  header.writeUInt16BE(count, 12);
  header.writeUInt32BE(compressed.length, 20);
  return Buffer.concat([header, Buffer.from(directory), compressed]);
}

// The measure reads hmtx as a plain table; a WOFF2 encoder may transform it, which drops the left
// side bearings and would shift every advance it reads.
it("refuses a transformed hmtx directory entry", () => {
  const directory = [0x43, 4];
  const font = woff2WithDirectory(1, directory, Buffer.alloc(0));
  expect(() => woff2Tables(font)).toThrow("a transformed hmtx table");
});

it("maps both range groups in a format 12 subtable at a nonzero offset", () => {
  const cmap = Buffer.alloc(48);
  const at = 8;
  cmap.writeUInt16BE(12, at);
  cmap.writeUInt32BE(40, at + 4);
  cmap.writeUInt32BE(2, at + 12);
  cmap.writeUInt32BE(0x1f680, at + 16);
  cmap.writeUInt32BE(0x1f681, at + 20);
  cmap.writeUInt32BE(11, at + 24);
  cmap.writeUInt32BE(0x20000, at + 28);
  cmap.writeUInt32BE(0x20000, at + 32);
  cmap.writeUInt32BE(70, at + 36);

  expect(readCmapFormat12(cmap, at)).toEqual(
    new Map([
      [0x1f680, 11],
      [0x1f681, 12],
      [0x20000, 70],
    ]),
  );
});

it("maps format 4 delta and glyph-array segments and skips glyph zero", () => {
  const cmap = Buffer.alloc(48);
  const at = 4;
  cmap.writeUInt16BE(4, at);
  cmap.writeUInt16BE(44, at + 2);
  cmap.writeUInt16BE(6, at + 6);

  // endCode, startCode, idDelta and idRangeOffset for each segment.
  cmap.writeUInt16BE(0x42, at + 14);
  cmap.writeUInt16BE(0x62, at + 16);
  cmap.writeUInt16BE(0xffff, at + 18);
  cmap.writeUInt16BE(0x41, at + 22);
  cmap.writeUInt16BE(0x61, at + 24);
  cmap.writeUInt16BE(0xffff, at + 26);
  cmap.writeInt16BE(-64, at + 28);
  cmap.writeInt16BE(-2, at + 30);
  cmap.writeInt16BE(1, at + 32);
  cmap.writeUInt16BE(4, at + 36);
  cmap.writeUInt16BE(0, at + 40);
  cmap.writeUInt16BE(7, at + 42);

  expect(readCmapFormat4(cmap, at)).toEqual(
    new Map([
      [0x41, 1],
      [0x42, 2],
      [0x62, 5],
    ]),
  );
});

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
