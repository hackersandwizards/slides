import { expect, it } from "vitest";
import { MONO, SANS } from "../scripts/pptx/faces";
import {
  boxFit,
  boxPlace,
  boxRuns,
  breakAt,
  BULLET_INDENT,
  paraBullet,
  paraProps,
  paraRuns,
  paraType,
  textWidth,
} from "../scripts/pptx/fit";
import { MARKER_CODES, MARKER_SQUARE, type BoxOpts, type Para } from "../scripts/pptx/text";

it("sets a paragraph in its own face, weight and relative size", () => {
  const paragraph = { runs: [{ text: "Plan" }], mono: true, bold: false, rel: 0.75 };
  const box = { size: 20, mono: false, bold: true, tracking: 0.125, color: "123456" };
  expect(paraType(paragraph, box, 0.5)).toEqual({
    size: 7.5,
    face: MONO,
    bold: false,
    tracking: 0.9375,
  });
});

it.each([
  {
    name: "a single measured line",
    runs: [{ text: "Plan" }],
    lines: [{ text: "Plan", width: 34 }],
    expected: [{ text: "Plan" }],
  },
  {
    name: "a measured break across styled runs",
    runs: [{ text: "Today " }, { text: "we plan", options: { bold: true } }],
    lines: [
      { text: "Today", width: 48 },
      { text: "we plan", width: 62 },
    ],
    expected: [{ text: "Today\n" }, { text: "we plan", options: { bold: true } }],
  },
  {
    name: "an explicit line break",
    runs: [{ text: "Today\nwe plan" }],
    lines: [
      { text: "Today", width: 48 },
      { text: "we plan", width: 62 },
    ],
    expected: [{ text: "Today\nwe plan" }],
  },
])("preserves run formatting and places breaks for $name", ({ runs, lines, expected }) => {
  expect(breakAt(runs, lines)).toEqual(expected);
});

it.each([
  { name: "bold", type: { size: 18, bold: true } },
  { name: "positive tracking", type: { size: 18, tracking: 0.06 } },
])("measures a wider line with $name", ({ type }) => {
  expect(textWidth("Today we plan", type)).toBeGreaterThan(
    textWidth("Today we plan", { size: 18 }),
  );
});

it.each([
  {
    name: "keeps full scale and options when paragraphs fit",
    height: 1.5,
    expected: { k: 1, o: { size: 20, line: 1.5, color: "112233" } },
  },
  {
    name: "closes leading at full size before shrinking the font",
    height: 0.8,
    expected: { k: 1, o: { size: 20, line: 1.5, color: "112233", lineScale: 0.96 } },
  },
  {
    name: "shrinks scale when closing leading to 1.0 still overflows",
    height: 0.45,
    expected: { k: 0.6, o: { size: 20, line: 1.5, color: "112233" } },
  },
])("boxFit $name", ({ height, expected }) => {
  const paras: Para[] = [{ runs: [{ text: "Line one\nLine two" }] }];
  const o: BoxOpts = { size: 20, line: 1.5, color: "112233" };
  expect(boxFit(paras, o, { w: 4, h: height })).toEqual(expected);
});

it.each([
  { name: "no bullet", para: { runs: [{ text: "Plain" }] } as Para, expected: {} },
  {
    name: "a numbered item",
    para: { runs: [{ text: "One" }], bullet: "number" } as Para,
    expected: { bullet: { type: "number", indent: BULLET_INDENT }, indentLevel: 0 },
  },
  {
    name: "an indented green marker",
    para: { runs: [{ text: "Good" }], bullet: true, marker: "green", indent: 2 } as Para,
    expected: { bullet: { code: MARKER_CODES.green, indent: BULLET_INDENT }, indentLevel: 2 },
  },
  {
    name: "a default square marker",
    para: { runs: [{ text: "Item" }], bullet: true } as Para,
    expected: { bullet: { code: MARKER_SQUARE, indent: BULLET_INDENT }, indentLevel: 0 },
  },
])("builds paragraph bullet properties for $name", ({ para, expected }) => {
  expect(paraBullet(para)).toEqual(expected);
});

it("builds scaled paragraph properties with tracking, tabs and marker bullet", () => {
  const para: Para = {
    runs: [{ text: "Step\tDetails" }],
    align: "right",
    after: 10,
    tabs: [1.5, 3],
    bullet: true,
    marker: "red",
    indent: 1,
  };
  const o: BoxOpts = { size: 20, color: "112233", italic: true, tracking: 0.05, line: 1.4 };
  expect(paraProps(para, o, 0.5)).toEqual({
    fontFace: SANS,
    fontSize: 10,
    color: "112233",
    bold: undefined,
    italic: true,
    charSpacing: 0.5,
    align: "right",
    lineSpacing: 14,
    paraSpaceAfter: 5,
    tabStops: [
      { position: 0.75, alignment: "l" },
      { position: 1.5, alignment: "l" },
    ],
    bullet: { code: MARKER_CODES.red, indent: BULLET_INDENT },
    indentLevel: 1,
  });
});

it("expands a paragraph's explicit line break into styled runs", () => {
  const para: Para = {
    runs: [{ text: "First\nSecond", options: { bold: true } }],
    after: 6,
  };
  const o: BoxOpts = { size: 16, color: "223344", line: 1.25 };
  const base = {
    fontFace: SANS,
    fontSize: 16,
    color: "223344",
    bold: true,
    italic: undefined,
    align: "left" as const,
    lineSpacing: 20,
    paraSpaceAfter: 6,
  };
  expect(paraRuns(para, o, { w: 4, k: 1 })).toEqual([
    { text: "First", options: base },
    { text: "Second", options: { ...base, softBreakBefore: true } },
  ]);
});

it("adds breakLine between paragraphs and zeroes paraSpaceAfter on the last", () => {
  const paras: Para[] = [
    { runs: [{ text: "One" }], after: 8 },
    { runs: [{ text: "Two" }], after: 8 },
  ];
  const o: BoxOpts = { size: 20, color: "112233", line: 1.2 };
  expect(boxRuns(paras, o, { w: 4, k: 0.5 })).toEqual([
    {
      text: "One",
      options: {
        fontFace: SANS,
        fontSize: 10,
        color: "112233",
        bold: undefined,
        italic: undefined,
        align: "left",
        lineSpacing: 12,
        paraSpaceAfter: 4,
        breakLine: true,
      },
    },
    {
      text: "Two",
      options: {
        fontFace: SANS,
        fontSize: 10,
        color: "112233",
        bold: undefined,
        italic: undefined,
        align: "left",
        lineSpacing: 12,
        paraSpaceAfter: 0,
      },
    },
  ]);
});

it.each([
  {
    name: "left-aligned unfilled box",
    o: { size: 16, color: "112233" } as BoxOpts,
    paras: [{ runs: [{ text: "A" }] }] as Para[],
    expected: { x: 2, y: 1, w: 5.05, h: 1 },
  },
  {
    name: "centred unfilled box",
    o: { size: 16, color: "112233", align: "center" } as BoxOpts,
    paras: [{ runs: [{ text: "A" }] }] as Para[],
    expected: { x: 1.975, y: 1, w: 5.05, h: 1 },
  },
  {
    name: "right-aligned unfilled box",
    o: { size: 16, color: "112233", align: "right" } as BoxOpts,
    paras: [{ runs: [{ text: "A" }] }] as Para[],
    expected: { x: 1.95, y: 1, w: 5.05, h: 1 },
  },
  {
    name: "paragraph-centred override",
    o: { size: 16, color: "112233", align: "left" } as BoxOpts,
    paras: [{ runs: [{ text: "A" }], align: "center" }] as Para[],
    expected: { x: 1.975, y: 1, w: 5.05, h: 1 },
  },
  {
    name: "filled box with no spare width",
    o: { size: 16, color: "112233", fill: "FFFFFF", align: "right" } as BoxOpts,
    paras: [{ runs: [{ text: "A" }] }] as Para[],
    expected: { x: 2, y: 1, w: 5, h: 1 },
  },
])("places a $name with its alignment spare", ({ o, paras, expected }) => {
  expect(boxPlace({ x: 2, y: 1, w: 5, h: 1 }, o, paras)).toEqual(expected);
});
