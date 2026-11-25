import { expect, it } from "vitest";
import { MONO } from "../scripts/pptx/faces";
import { breakAt, paraType, textWidth } from "../scripts/pptx/fit";

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
