import { describe, expect, it } from "vitest";
import { fitPieces, pretty, wrap } from "../scripts/pptx/lines";

describe("slides-pptx draws what the slide shows", () => {
  const style = { size: 18, mono: false, bold: false, tracking: 0 };

  it.each([
    {
      name: "moves the lone last word onto a line with another word",
      spans: [{ ...style, text: "A team owns its code, its tests and its deployment, end to end" }],
      width: 260,
      expected: [
        { text: "A team owns its code, its", width: 212.923828125 },
        { text: "tests and its deployment, end", width: 250.962890625 },
        { text: "to end", width: 53.89453125 },
      ],
    },
    {
      name: "keeps a word alone when joining it would break a word",
      spans: [{ ...style, text: "Autonomous team", bold: true }],
      width: 115.2734375,
      expected: undefined,
    },
  ])("pretty $name", ({ spans, width, expected }) => {
    expect(pretty(spans, width)).toEqual(expected);
  });

  it("measures code points, space and forced breaks in order", () => {
    const spans = [{ ...style, size: 0, tracking: 1, text: "\nxy z\n" }];
    expect([...fitPieces(spans, 1)]).toEqual([
      { text: "", width: 0, forced: true },
      { text: "", width: 0, breakMeasure: { width: 3, space: 1 } },
      { text: "x", width: 1, breakMeasure: { width: 1, space: 0 } },
      { text: "y", width: 1, breakMeasure: { width: 1, space: 0 } },
      { text: " ", width: 1 },
      { text: "", width: 0, trailing: 1, forced: false },
      { text: "z", width: 1, breakMeasure: { width: 1, space: 0 }, trailing: 0, forced: true },
    ]);
  });

  it("breaks an overlong word onto a new line before splitting its characters", () => {
    const spans = [{ ...style, size: 0, tracking: 1, text: "x ABC\nz" }];
    expect(wrap(spans, 2)).toEqual([
      { text: "x", width: 1 },
      { text: "AB", width: 2 },
      { text: "C", width: 1 },
      { text: "z", width: 1 },
    ]);
  });

  it("breaks a line after a space before a forced break, and after a slash", () => {
    const span = { size: 18, mono: false, bold: false, tracking: 0 };
    expect(wrap([{ ...span, text: "Hello \nWorld" }], Infinity)).toHaveLength(2);
    const path = [{ ...span, text: "input/output/storage" }];
    const lines = wrap(path, wrap([{ ...span, text: "input/output/" }], Infinity)[0].width + 1);
    expect(lines.map((l) => l.text)).toEqual(["input/output/", "storage"]);
  });
});
