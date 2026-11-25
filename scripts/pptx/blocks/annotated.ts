import { existsSync } from "node:fs";
import type PptxGenJS from "pptxgenjs";
import { altText, assetFile } from "../images";
import type { Sheet } from "../sheet";
import { PT, type Area } from "../stage";
import { md, type BoxOpts } from "../text";
import { bodyO, type Block, type BlockKind } from "./kind";

export interface AnnotatedCrop {
  iw: number;
  top: number;
  bottom: number;
  fullW: number;
  fullH: number;
  cropY: number;
  pw: number;
  ph: number;
}

export interface AnnotatedNote {
  number: number;
  text: string;
  marker: Area;
  box: Area;
}

/** Computes the scaled image dimensions and visible crop rectangle for an annotated block. */
export function annotatedCrop(
  size: readonly [number, number],
  area: Area,
  crop?: Block<"annotated">["crop"],
): AnnotatedCrop {
  const iw = area.w * 0.62;
  const [w0, h0] = size;
  const top = crop?.top ?? 0;
  const bottom = crop?.bottom ?? 1;
  const right = crop?.right ?? 1;
  const srcW = w0 * right;
  const srcH = h0 * (bottom - top);
  const k2 = Math.min(iw / srcW, area.h / srcH);
  return {
    iw,
    top,
    bottom,
    fullW: w0 * k2,
    fullH: h0 * k2,
    cropY: top * h0 * k2,
    pw: srcW * k2,
    ph: srcH * k2,
  };
}

/** Places each callout marker on the cropped picture's right edge and its text box beside it. */
export function annotatedNotes(
  notes: Block<"annotated">["notes"],
  area: Area,
  fit: AnnotatedCrop,
): AnnotatedNote[] {
  return notes.map((n, i) => {
    const y = area.y + ((n.y - fit.top) / (fit.bottom - fit.top)) * fit.ph;
    return {
      number: i + 1,
      text: n.text,
      marker: { x: area.x + fit.pw - 0.14, y: y - 0.14, w: 0.28, h: 0.28 },
      box: { x: area.x + fit.iw + 0.35, y: y - 0.2, w: area.w - fit.iw - 0.35, h: 0.6 },
    };
  });
}

/** Draws one numbered callout dot on the image edge and its paired note beside the picture. */
export function drawAnnotatedNote(sheet: Sheet, note: AnnotatedNote, o: BoxOpts): void {
  const { slide: s, c } = sheet;
  s.addShape("ellipse", {
    ...note.marker,
    fill: { color: c.teal },
    line: { type: "none" },
  });
  sheet.box({ runs: [{ text: String(note.number) }] }, note.marker, {
    size: PT.label,
    mono: true,
    bold: true,
    color: c.card,
    align: "center",
    valign: "middle",
  });
  sheet.box(
    {
      runs: [
        { text: `${note.number}  `, options: { bold: true, color: c.teal } },
        ...md(note.text, c),
      ],
    },
    note.box,
    o,
  );
}

export const annotated: BlockKind<"annotated"> = {
  draw(sheet, b, { area: a, k, centered }) {
    const { slide: s, c } = sheet;
    const o = bodyO(c, k, centered ? { align: "center" } : {});
    const fit = annotatedCrop(b.size, a, b.crop);
    const path = assetFile(sheet.out.assets, b.src);
    if (existsSync(path)) {
      s.addImage({
        path,
        // pptxgenjs crops a picture of this whole size to the box below, as the portrait does.
        x: a.x,
        y: a.y,
        w: fit.fullW,
        h: fit.fullH,
        altText: altText(b.alt),
        sizing: {
          type: "crop",
          x: 0,
          y: fit.cropY,
          w: fit.pw,
          h: fit.ph,
        } as unknown as PptxGenJS.ImageProps["sizing"],
      });
    } else sheet.warn(`image ${b.src}: not found under ${sheet.out.assets}`);
    const noteO: BoxOpts = { ...o, size: PT.sm * k };
    for (const note of annotatedNotes(b.notes, a, fit)) drawAnnotatedNote(sheet, note, noteO);
  },
};
