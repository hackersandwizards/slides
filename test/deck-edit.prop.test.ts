import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { encode, literals, replace, resolve, type Literal } from "../lib/deck-edit";

const quotes = fc.constantFrom<Literal["quote"]>("'", '"', "`");
const edgeText = "constructor/__proto__/toString\\'\"`${x}\n\r\0\t\u2028\u{10ffff}";

test.prop([unicodeString, quotes], {
  examples: [
    ["", "'"],
    [edgeText, "'"],
    [edgeText, '"'],
    [edgeText, "`"],
    ["舞台".repeat(1024), "`"],
  ],
})("a serialized deck literal preserves its value, delimiters and source span", (value, quote) => {
  const source = encode(value, quote);
  expect(source.startsWith(quote) && source.endsWith(quote)).toBe(true);
  expect(literals(`const text = ${source};`)).toEqual([
    { start: 13, end: 13 + source.length, quote, value },
  ]);
});

test.prop([fc.integer({ min: 0, max: 0x10ffff }), fc.integer({ min: 0, max: 40 })], {
  examples: [
    [0, 0],
    [0, 8],
    [0xffff, 0],
    [0x10000, 0],
    [0x10ffff, 40],
  ],
})("a braced Unicode escape decodes with any permitted number of leading zeros", (code, zeros) => {
  const source = `"\\u{${"0".repeat(zeros)}${code.toString(16)}}"`;
  expect(literals(source)).toEqual([
    { start: 0, end: source.length, quote: '"', value: String.fromCodePoint(code) },
  ]);
});

test.prop([unicodeString, unicodeString], {
  examples: [
    ["", ""],
    ["constructor", "__proto__"],
    ["大阪".repeat(600), edgeText],
  ],
})(
  "an edit changes only its unique literal and refuses missing or duplicated matches",
  (value, next) => {
    const original = `Value ${value}`;
    const replacement = `Edited ${next}`;
    const literal = JSON.stringify(original);
    const source = `const first = ${literal};\n/* ${literal.replaceAll("*/", "* /")} */`;
    const written = replace(source, original, replacement);
    expect(written).toHaveProperty("source");
    if ("source" in written) {
      expect(literals(written.source).map(({ value }) => value)).toEqual([replacement]);
      expect(written.source.slice(written.source.indexOf(";\n"))).toBe(
        source.slice(source.indexOf(";\n")),
      );
    }
    const outside = `${original}!`;
    expect(replace(source, outside, replacement)).toHaveProperty("error");
    expect(replace(`${source}\nconst second = ${literal};`, original, replacement)).toHaveProperty(
      "error",
    );
  },
);

const words = fc.array(fc.constantFrom("Grüße", "大阪", "factory", "constructor", "value"), {
  minLength: 1,
  maxLength: 60,
});

test.prop([words], { examples: [[["constructor"]], [["大阪", "Grüße"]]] })(
  "rendered whitespace leaves a unique match intact and cannot select an absent or repeated literal",
  (parts) => {
    const value = parts.join(" ");
    const shown = parts.join("\n\t");
    const literal = JSON.stringify(value);
    expect(resolve(`const text = ${literal};`, [shown])).toEqual({ value, index: 0 });
    expect(resolve(`const texts = [${literal}, ${literal}];`, [shown])).toHaveProperty("error");
    expect(resolve(`const text = ${literal};`, [`${shown}!`])).toHaveProperty("error");
  },
);
