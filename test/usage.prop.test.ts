import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readUsage } from "../catalog/usage";
import { entriesOf } from "../scripts/usage";
import type { ContentBlock } from "../types/slide";

vi.mock("node:fs", { spy: true });

const count = fc.integer({ min: 0, max: 100_000 });
const ids = fc.oneof(unicodeString, fc.constantFrom("constructor", "__proto__", "toString"));
const usageFile = fc.record({
  decks: count,
  slides: count,
  entries: fc.uniqueArray(fc.tuple(ids, count), { selector: ([id]) => id, maxLength: 6 }),
});

test.prop([fc.array(usageFile, { maxLength: 5 })], {
  examples: [
    [[]],
    [
      [
        {
          decks: 1,
          slides: 2,
          entries: [
            ["constructor", 1],
            ["__proto__", 2],
            ["toString", 0],
            ["", 2],
            ["/大阪".repeat(512), 1],
          ],
        },
        {
          decks: 4,
          slides: 5,
          entries: [
            ["constructor", 3],
            ["__proto__", 1],
            ["toString", 2],
          ],
        },
      ],
    ],
  ],
})("usage files sum every own entry and their deck and slide totals", (input) => {
  const files = input.map((_, index) => `usage-${index}.json`);
  const read = vi.mocked(readFileSync);
  for (const file of input) {
    read.mockReturnValueOnce(
      JSON.stringify({ ...file, entries: Object.fromEntries(file.entries) }),
    );
  }
  try {
    const result = readUsage([" ", ...files.map((file) => ` ${file} `), ""].join(","));
    expect(result.files).toEqual(files);
    expect(read.mock.calls).toEqual(files.map((file) => [resolve(file), "utf8"]));
    expect(result.decks).toBe(input.reduce((sum, file) => sum + file.decks, 0));
    expect(result.slides).toBe(input.reduce((sum, file) => sum + file.slides, 0));
    const entries = input.flatMap((file) => file.entries);
    expect(new Map(Object.entries(result.entries))).toEqual(
      new Map(
        entries.map(([id]) => [
          id,
          entries.filter(([key]) => key === id).reduce((sum, [, n]) => sum + n, 0),
        ]),
      ),
    );
  } finally {
    read.mockReset();
  }
});

const blocks: Record<string, ContentBlock> = {
  cards: { type: "cards", items: [] },
  bars: { type: "bars", bars: [] },
  callout: { type: "callout", text: "Example" },
  paragraph: { type: "paragraph", text: "Example" },
};

test.prop([fc.array(fc.constantFrom("cards", "bars", "callout", "paragraph"))], {
  examples: [[[]], [["cards", "bars", "cards", "paragraph", "callout", "bars"]]],
})("each counted block kind contributes one entry in first-use order", (kinds) => {
  const slide = {
    type: "content" as const,
    headline: "Example",
    content: kinds.map((kind) => blocks[kind]),
  };
  const expected = Array.from(new Set(kinds)).filter((kind) => kind !== "paragraph");
  expect(entriesOf(slide)).toEqual(["content", ...expected.map((kind) => `block-${kind}`)]);
});
