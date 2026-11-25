import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { BRAND_MARK } from "../../lib/logo";
import type { Area } from "./stage";

interface ImageFormat {
  is: (buf: Buffer) => boolean;
  size: (buf: Buffer) => [number, number] | undefined;
}

function jpegSize(buf: Buffer): [number, number] | undefined {
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    i += 2 + len;
  }
  return undefined;
}

const IMAGE_FORMATS: readonly ImageFormat[] = [
  {
    is: (buf) => buf.readUInt32BE(0) === 0x89504e47,
    size: (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)],
  },
  {
    is: (buf) => buf.toString("ascii", 0, 3) === "GIF",
    size: (buf) => [buf.readUInt16LE(6), buf.readUInt16LE(8)],
  },
  {
    is: (buf) =>
      buf.toString("ascii", 8, 12) === "WEBP" && buf.toString("ascii", 12, 16) === "VP8X",
    size: (buf) => [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)],
  },
  {
    is: (buf) =>
      buf.toString("ascii", 8, 12) === "WEBP" && buf.toString("ascii", 12, 16) === "VP8L",
    size: (buf) => {
      const b = buf.readUInt32LE(21);
      return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
    },
  },
  {
    is: (buf) => buf.toString("ascii", 8, 12) === "WEBP",
    size: (buf) => [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff],
  },
  {
    is: (buf) => buf[0] === 0xff && buf[1] === 0xd8,
    size: jpegSize,
  },
];

export function imageSize(buf: Buffer): [number, number] | undefined {
  const format = IMAGE_FORMATS.find((entry) => entry.is(buf));
  return format ? format.size(buf) : undefined;
}

export function picturePlace(
  [iw, ih]: readonly [number, number],
  { x, y, w, h }: Area,
  o: PictureOpts,
): Area {
  const k = Math.min(w / iw, h / ih, o.native ? 1 / 144 : Infinity);
  const pw = iw * k;
  const ph = ih * k;
  const px = o.align === "left" ? x : o.align === "right" ? x + w - pw : x + (w - pw) / 2;
  const py = y + (h - ph) / 2;
  return { x: px, y: py, w: pw, h: ph };
}

function brandLogo(name: string): string {
  return createRequire(import.meta.url).resolve(`@hackersandwizards/brand/logos/${name}.png`);
}

/** A brand logo's path and its width over its height, read from the file, since each cut has its
 *  own (the night lockup is wider than the day one). */
const cuts = new Map<string, [string, number]>();

export function brandCut(name: string): [string, number] {
  const known = cuts.get(name);
  if (known) return known;
  const path = brandLogo(name);
  const [w, h] = imageSize(readFileSync(path))!;
  cuts.set(name, [path, w / h]);
  return [path, w / h];
}

/** A deck file's path: a root path under the consumer's public directory, else a file path as it
 *  stands, which is what Bun gives an imported image, the specimen's among them. Vite's dev URL
 *  for one keeps its query. */
export const assetFile = (assets: string, src: string) => {
  const path = src.replace(/\?.*$/, "");
  const inAssets = join(assets, path.replace(/^\//, ""));
  return existsSync(inAssets) || !existsSync(path) ? inAssets : path;
};

/** A picture's description. pptxgenjs describes a picture without one by its file path, which
 *  names the exporting machine's user and folders: a space describes it as nothing. */
export const altText = (alt?: string) => alt || " ";

/** A picture's link. pptxgenjs escapes a text run's link, never a picture's, which it writes into
 *  the slide's relationships as it stands: a raw `&` there leaves the part malformed. */
export const pictureLink = (href?: string) =>
  href
    ? {
        hyperlink: {
          url: href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
        },
      }
    : {};

export interface PictureMetadata {
  alt?: string;
  href?: string;
}

export interface PictureOpts extends PictureMetadata {
  align?: "center" | "left" | "right";
  /** Never drawn larger than the file at 144 px to the inch, as the slide never scales one up. */
  native?: boolean;
}

export function imageFile(assets: string, src: string) {
  const logo = BRAND_MARK.exec(src);
  const path = logo ? brandLogo(logo[1]) : assetFile(assets, src);
  const size = existsSync(path) ? imageSize(readFileSync(path)) : undefined;
  return { src, path, size };
}
