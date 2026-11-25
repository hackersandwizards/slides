import { describe, expect, it } from "vitest";
import { pretty, wrap } from "../scripts/pptx/lines";

describe("slides-pptx draws what the slide shows", () => {
  it("never leaves one word alone on a paragraph's last line, as brand's text-wrap: pretty", () => {
    const spans = [
      {
        text: "A team owns its code, its tests and its deployment, end to end",
        size: 18,
        mono: false,
        bold: false,
        tracking: 0,
      },
    ];
    // The measure at which the greedy lines leave "end" alone on the last of three.
    const width = [...Array(400).keys()]
      .map((w) => 100 + w)
      .find((w) => {
        const lines = wrap(spans, w);
        return lines.length === 3 && lines[2].text.trim() === "end";
      })!;
    expect(width).toBeDefined();
    const lines = pretty(spans, width)!;
    expect(lines).toHaveLength(3);
    expect(lines[2].text.trim()).toBe("to end");
    // A last word that can only join the line above by breaking a word stays alone.
    const label = [{ text: "Autonomous team", size: 18, mono: false, bold: true, tracking: 0 }];
    const w = wrap([{ ...label[0], text: "Autonomous" }], Infinity)[0].width + 2;
    expect(pretty(label, w)).toBeUndefined();
  });

  it("breaks a line after a space before a forced break, and after a slash", () => {
    const span = { size: 18, mono: false, bold: false, tracking: 0 };
    expect(wrap([{ ...span, text: "Hello \nWorld" }], Infinity)).toHaveLength(2);
    const path = [{ ...span, text: "input/output/storage" }];
    const lines = wrap(path, wrap([{ ...span, text: "input/output/" }], Infinity)[0].width + 1);
    expect(lines.map((l) => l.text)).toEqual(["input/output/", "storage"]);
  });
});
