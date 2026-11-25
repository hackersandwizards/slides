import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { faceFiles, woff2Tables } from "../scripts/pptx-text";

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
