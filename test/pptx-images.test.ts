import { expect, it } from "vitest";
import { imageSize, picturePlace, type PictureOpts } from "../scripts/pptx/images";

function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

it.each([
  {
    name: "a PNG header",
    buf: pngHeader(320, 180),
    expected: [320, 180] as [number, number],
  },
  {
    name: "a JPEG that skips a DHT marker before SOF2",
    buf: Buffer.from("ffd8ffc400040000ffc2000708005000a0", "hex"),
    expected: [160, 80] as [number, number],
  },
  {
    name: "a JPEG with no start-of-frame marker",
    buf: Buffer.from("ffd8ffe000040000", "hex"),
    expected: undefined,
  },
])("reads pixel dimensions from $name", ({ buf, expected }) => {
  expect(imageSize(buf)).toEqual(expected);
});

it.each([
  {
    name: "centred image constrained by height",
    size: [200, 100] as const,
    area: { x: 1, y: 2, w: 4, h: 1 },
    opts: {} as PictureOpts,
    expected: { x: 2, y: 2, w: 2, h: 1 },
  },
  {
    name: "left-aligned image",
    size: [100, 200] as const,
    area: { x: 1, y: 2, w: 4, h: 4 },
    opts: { align: "left" } as PictureOpts,
    expected: { x: 1, y: 2, w: 2, h: 4 },
  },
  {
    name: "right-aligned image",
    size: [200, 100] as const,
    area: { x: 1, y: 2, w: 4, h: 1 },
    opts: { align: "right" } as PictureOpts,
    expected: { x: 3, y: 2, w: 2, h: 1 },
  },
  {
    name: "native-capped image that never scales above 144 px/in",
    size: [144, 72] as const,
    area: { x: 1, y: 2, w: 4, h: 2 },
    opts: { native: true } as PictureOpts,
    expected: { x: 2.5, y: 2.75, w: 1, h: 0.5 },
  },
])("places a $name inside its area", ({ size, area, opts, expected }) => {
  expect(picturePlace(size, area, opts)).toEqual(expected);
});
