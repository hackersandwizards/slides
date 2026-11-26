import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import {
  drawProcessCaption,
  processCaptionLayout,
  type ProcessCaptionLayout,
} from "../scripts/pptx/slides/process";
import { shapesOf } from "./fixtures/rendered-deck";

const r4 = (n: number) => Number(n.toFixed(4));

describe("processCaptionLayout", () => {
  const look = new Look(palette(false), "en", false);
  const o = { size: 18, color: "19283A", align: "center" as const, valign: "middle" as const };

  it.each<{ label: string; text: string; expected: ProcessCaptionLayout }>([
    {
      label: "a short caption fitted to its text width plus callout padding",
      text: "Repeat every sprint",
      expected: {
        text: "Repeat every sprint",
        o,
        w: 2.8656283365885415,
        h: 0.8810104166666666,
        textH: 0.3625,
      },
    },
    {
      label: "a long caption capped at 1365 / 144 inches and wrapped",
      text: "Every team iterates through discovery, planning, delivery, verification, and feedback on every single release cycle",
      expected: {
        text: "Every team iterates through discovery, planning, delivery, verification, and feedback on every single release cycle",
        o,
        w: 9.479166666666666,
        h: 1.2435104166666666,
        textH: 0.725,
      },
    },
  ])("measures $label", ({ text, expected }) => {
    expect(processCaptionLayout(look, text)).toEqual(expected);
  });
});

describe("drawProcessCaption", () => {
  it("draws a centred teal-tinted callout card and padded text box at y", async () => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
      pptx,
      assets: "",
      warnings: [],
      charts: new Map(),
    });
    const caption: ProcessCaptionLayout = {
      text: "Repeat every sprint",
      o: { size: 18, color: "19283A", align: "center", valign: "middle" },
      w: 4,
      h: 0.76,
      textH: 0.4,
    };
    drawProcessCaption(sheet, caption, 5.2);
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const file = zip.file("ppt/slides/slide1.xml");
    assert(file, "slide1.xml");
    expect(
      shapesOf(await file.async("string")).map(
        ({ prst, x, y, w, h, fill, line, lineW, texts }) => ({
          prst,
          x: r4(x),
          y: r4(y),
          w: r4(w),
          h: r4(h),
          fill,
          line,
          lineW,
          texts,
        }),
      ),
    ).toEqual([
      {
        prst: "round2DiagRect",
        x: 4.6665,
        y: 5.2,
        w: 4,
        h: 0.76,
        fill: "E8F1F3",
        line: undefined,
        lineW: undefined,
        texts: [],
      },
      {
        prst: "rect",
        x: 4.9083,
        y: 5.4593,
        w: 3.5163,
        h: 0.4,
        fill: "19283A",
        line: undefined,
        lineW: undefined,
        texts: ["Repeat every sprint"],
      },
    ]);
  });
});
