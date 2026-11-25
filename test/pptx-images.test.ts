import { expect, it } from "vitest";
import { imageSize, picturePlace, type PictureOpts } from "../scripts/pptx/images";
import type { Area } from "../scripts/pptx/stage";

function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

const SIZE_CASES: { name: string; buf: Buffer; expected: [number, number] | undefined }[] = [
  { name: "a PNG header", buf: pngHeader(320, 180), expected: [320, 180] },
  {
    name: "a GIF header",
    buf: Buffer.from("47494638396128001400", "hex"),
    expected: [40, 20],
  },
  {
    name: "a WEBP VP8X header",
    buf: Buffer.from("5249464600000000574542505650385800000000000000005900001d0000", "hex"),
    expected: [90, 30],
  },
  {
    name: "a WEBP VP8L header",
    buf: Buffer.from("5249464600000000574542505650384c000000002f63000600", "hex"),
    expected: [100, 25],
  },
  {
    name: "a lossy WEBP VP8 header",
    buf: Buffer.from("524946460000000057454250565038200000000000000000000096001e00", "hex"),
    expected: [150, 30],
  },
  {
    name: "a JPEG that skips a DHT marker before SOF2",
    buf: Buffer.from("ffd8ffc400040000ffc2000708005000a0", "hex"),
    expected: [160, 80],
  },
  {
    name: "a JPEG with no start-of-frame marker",
    buf: Buffer.from("ffd8ffe000040000", "hex"),
    expected: undefined,
  },
];

it.each(SIZE_CASES)("reads pixel dimensions from $name", ({ buf, expected }) => {
  expect(imageSize(buf)).toEqual(expected);
});

const PLACE_CASES: {
  name: string;
  size: readonly [number, number];
  area: Area;
  opts: PictureOpts;
  expected: Area;
}[] = [
  {
    name: "centred image constrained by height",
    size: [200, 100],
    area: { x: 1, y: 2, w: 4, h: 1 },
    opts: {},
    expected: { x: 2, y: 2, w: 2, h: 1 },
  },
  {
    name: "left-aligned image",
    size: [100, 200],
    area: { x: 1, y: 2, w: 4, h: 4 },
    opts: { align: "left" },
    expected: { x: 1, y: 2, w: 2, h: 4 },
  },
  {
    name: "right-aligned image",
    size: [200, 100],
    area: { x: 1, y: 2, w: 4, h: 1 },
    opts: { align: "right" },
    expected: { x: 3, y: 2, w: 2, h: 1 },
  },
  {
    name: "native-capped image that never scales above 144 px/in",
    size: [144, 72],
    area: { x: 1, y: 2, w: 4, h: 2 },
    opts: { native: true },
    expected: { x: 2.5, y: 2.75, w: 1, h: 0.5 },
  },
];

it.each(PLACE_CASES)("places a $name inside its area", ({ size, area, opts, expected }) => {
  expect(picturePlace(size, area, opts)).toEqual(expected);
});
