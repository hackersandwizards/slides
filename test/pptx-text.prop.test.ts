import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { balance, wrap } from "../scripts/pptx-text";

const sizes = fc.integer({ min: 40, max: 500 });

test.prop([unicodeString, sizes], {
  examples: [
    ["", 80],
    ["大阪/Grüße-舞台\n\nconstructor / __proto__", 42],
    ["長".repeat(1024), 500],
  ],
})(
  "balancing preserves the greedy line count and the content of every non-space character",
  (text, width) => {
    const spans = [{ text, size: 12, mono: false, bold: false }];
    const greedy = wrap(spans, width);
    const balanced = balance(spans, width);
    expect(balanced).toHaveLength(greedy.length);
    expect(
      balanced
        .map(({ text }) => text)
        .join("")
        .replace(/\s/g, ""),
    ).toBe(text.replace(/\s/g, ""));
    expect(Math.max(...balanced.map(({ width }) => width))).toBeLessThanOrEqual(width + 1e-7);
  },
);
