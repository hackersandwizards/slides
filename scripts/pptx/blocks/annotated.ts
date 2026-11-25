import { existsSync } from "node:fs";
import type PptxGenJS from "pptxgenjs";
import { altText, assetFile } from "../images";
import { PT } from "../stage";
import { md } from "../text";
import { bodyO, type BlockKind } from "./kind";

export const annotated: BlockKind<"annotated"> = {
  draw(sheet, b, { area: a, k, centered }) {
    const { slide: s, c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const iw = a.w * 0.62;
    const [w0, h0] = b.size;
    const top = b.crop?.top ?? 0;
    const bottom = b.crop?.bottom ?? 1;
    const right = b.crop?.right ?? 1;
    const srcW = w0 * right;
    const srcH = h0 * (bottom - top);
    const k2 = Math.min(iw / srcW, a.h / srcH);
    const pw = srcW * k2;
    const ph = srcH * k2;
    const path = assetFile(sheet.out.assets, b.src);
    if (existsSync(path)) {
      s.addImage({
        path,
        // pptxgenjs crops a picture of this whole size to the box below, as the portrait does.
        x: a.x,
        y: a.y,
        w: w0 * k2,
        h: h0 * k2,
        altText: altText(b.alt),
        sizing: {
          type: "crop",
          x: 0,
          y: top * h0 * k2,
          w: pw,
          h: ph,
        } as unknown as PptxGenJS.ImageProps["sizing"],
      });
    } else sheet.warn(`image ${b.src}: not found under ${sheet.out.assets}`);
    b.notes.forEach((n, i) => {
      const y = a.y + ((n.y - top) / (bottom - top)) * ph;
      s.addShape("ellipse", {
        x: a.x + pw - 0.14,
        y: y - 0.14,
        w: 0.28,
        h: 0.28,
        fill: { color: c.teal },
        line: { type: "none" },
      });
      sheet.box(
        { runs: [{ text: String(i + 1) }] },
        { x: a.x + pw - 0.14, y: y - 0.14, w: 0.28, h: 0.28 },
        {
          size: PT.label,
          mono: true,
          bold: true,
          color: c.card,
          align: "center",
          valign: "middle",
        },
      );
      sheet.box(
        {
          runs: [{ text: `${i + 1}  `, options: { bold: true, color: c.teal } }, ...md(n.text, c)],
        },
        { x: a.x + iw + 0.35, y: y - 0.2, w: a.w - iw - 0.35, h: 0.6 },
        { ...o, size: PT.sm * k },
      );
    });
  },
};
