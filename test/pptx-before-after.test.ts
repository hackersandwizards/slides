import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { assert, describe, expect, it } from "vitest";
import {
  beforeAfterLayout,
  circleIcon,
  drawBeforeAfter,
  type BeforeAfterMode,
  type CircleIconKind,
} from "../scripts/pptx/blocks/before-after";
import { Look } from "../scripts/pptx/look";
import { palette } from "../scripts/pptx/palette";
import { Sheet } from "../scripts/pptx/sheet";
import { shapesOf } from "./fixtures/rendered-deck";

async function drawOnSheet(draw: (sheet: Sheet) => void) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const sheet = new Sheet(new Look(palette(false), "en", false), pptx.addSlide(), {
    pptx,
    assets: "",
    warnings: [],
    charts: new Map(),
  });
  draw(sheet);
  const out = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const file = out.file("ppt/slides/slide1.xml");
  assert(file, "slide1.xml");
  return shapesOf(await file.async("string"));
}

describe("circleIcon", () => {
  it.each<{
    kind: CircleIconKind;
    strokes: { x: number; y: number; w: number; h: number; flipV: boolean }[];
  }>([
    {
      kind: "check",
      strokes: [
        { x: 1.15, y: 2.26, w: 0.075, h: 0.075, flipV: false },
        { x: 1.225, y: 2.18, w: 0.135, h: 0.155, flipV: true },
      ],
    },
    {
      kind: "cross",
      strokes: [
        { x: 1.175, y: 2.175, w: 0.15, h: 0.15, flipV: false },
        { x: 1.175, y: 2.175, w: 0.15, h: 0.15, flipV: true },
      ],
    },
  ])("draws the $kind disc and its two line strokes", async ({ kind, strokes }) => {
    const shapes = await drawOnSheet((sheet) => {
      circleIcon(sheet, { x: 1, y: 2, d: 0.5 }, { kind, color: "1A7285" });
    });
    expect(
      shapes.map((sh) => ({
        prst: sh.prst,
        x: sh.x,
        y: sh.y,
        w: sh.w,
        h: sh.h,
        flipV: sh.xml.includes('flipV="1"'),
        hasColor: sh.xml.includes('<a:srgbClr val="1A7285"/>'),
      })),
    ).toEqual([
      { prst: "ellipse", x: 1, y: 2, w: 0.5, h: 0.5, flipV: false, hasColor: true },
      ...strokes.map((s) => ({ prst: "line", ...s, hasColor: true })),
    ]);
  });
});

describe("beforeAfterLayout", () => {
  const look = new Look(palette(false), "en", false);
  const sides = {
    before: { label: "Old", items: ["Manual step"] },
    after: { label: "New", highlight: "Fast", items: ["Auto step"] },
  };

  it.each<{
    mode: BeforeAfterMode;
    connector: "arrow" | "plus";
    beforeFill: string;
    beforeIcon: { kind: CircleIconKind; color: string; d: number } | undefined;
    beforeIndent: number;
    beforeStrike: "sngStrike" | undefined;
    afterIcon: { kind: CircleIconKind; color: string; d: number } | undefined;
    afterIndent: number;
  }>([
    {
      mode: "replace",
      connector: "arrow",
      beforeFill: "ECEEEF",
      beforeIcon: { kind: "cross", color: "545861", d: 0.1625 },
      beforeIndent: 0.2825,
      beforeStrike: "sngStrike",
      afterIcon: { kind: "check", color: "1A7285", d: 0.1625 },
      afterIndent: 0.2825,
    },
    {
      mode: "transition",
      connector: "arrow",
      beforeFill: "FFFFFF",
      beforeIcon: undefined,
      beforeIndent: 0,
      beforeStrike: undefined,
      afterIcon: { kind: "check", color: "1A7285", d: 0.1625 },
      afterIndent: 0.2825,
    },
    {
      mode: "add",
      connector: "plus",
      beforeFill: "FFFFFF",
      beforeIcon: undefined,
      beforeIndent: 0,
      beforeStrike: undefined,
      afterIcon: undefined,
      afterIndent: 0,
    },
  ])(
    "measures a $mode pair at scale 0.5 with its icons, fills, connector and height",
    ({
      mode,
      connector,
      beforeFill,
      beforeIcon,
      beforeIndent,
      beforeStrike,
      afterIcon,
      afterIndent,
    }) => {
      const layout = beforeAfterLayout(look, { ...sides, mode }, { w: 10, k: 0.5 });
      const [before, after] = layout.sides;
      expect({
        pad: layout.pad,
        gap: layout.gap,
        half: layout.half,
        connector: layout.connector,
        h: layout.h,
        beforeSurface: before.surface,
        beforeIcon: before.icon,
        beforeIndent: before.indent,
        beforeStrike: before.rest[0].runs[0].options?.strike,
        afterSurface: after.surface,
        afterIcon: after.icon,
        afterIndent: after.indent,
        afterRestCount: after.rest.length,
      }).toEqual({
        pad: 0.125,
        gap: 0.35,
        half: 4.825,
        connector,
        h: 0.9895833333333334,
        beforeSurface: { fill: beforeFill, line: "D0D2D8" },
        beforeIcon,
        beforeIndent,
        beforeStrike,
        afterSurface: { fill: "DCE9EC", line: "1A7285" },
        afterIcon,
        afterIndent,
        afterRestCount: 2,
      });
    },
  );
});

describe("drawBeforeAfter", () => {
  it("places both cards, their icons, indented labels and the connector inside the given area", async () => {
    const shapes = await drawOnSheet((sheet) => {
      const layout = beforeAfterLayout(
        sheet,
        {
          before: { label: "Old", items: ["Manual step"] },
          after: { label: "New", items: ["Auto step"] },
          mode: "replace",
        },
        { w: 10, k: 1 },
      );
      drawBeforeAfter(sheet, layout, { x: 1.5, y: 2, w: 10, h: 3.5 });
    });
    const cards = shapes.filter((sh) => sh.prst === "round2DiagRect");
    const icons = shapes.filter((sh) => sh.prst === "ellipse");
    const arrow = shapes.find((sh) => sh.xml.includes('tailEnd type="triangle"'));
    const labels = shapes.filter((sh) => ["Old", "New"].includes(sh.texts.join("")));
    assert(arrow, "connector arrow");
    expect({
      cards: cards.map(({ x, y, w, h, fill }) => ({ x, y, w, h, fill })),
      iconX: icons.map((sh) => sh.x),
      labelX: labels.map((sh) => sh.x),
      arrow: { x: arrow.x, y: arrow.y, w: arrow.w },
    }).toEqual({
      cards: [
        { x: 1.5, y: 2, w: 4.65, h: 3.5, fill: "ECEEEF" },
        { x: 6.85, y: 2, w: 4.65, h: 3.5, fill: "DCE9EC" },
      ],
      iconX: [1.75, 7.1],
      labelX: [2.195, 7.545],
      arrow: { x: 6.27, y: 3.75, w: 0.46 },
    });
  });
});
