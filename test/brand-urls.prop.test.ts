import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { brandNames, placeBrandUrls, selfContained } from "../catalog/brand-urls";

const quote = fc.constantFrom("", "'", '"');
const url = fc.constantFrom("url", "URL", "uRl");
const edge = "/構成/constructor/__proto__/toString/".repeat(40);

test.prop([fc.array(fc.tuple(fc.boolean(), quote, url, unicodeString), { maxLength: 6 })], {
  examples: [
    [[]],
    [
      [
        [true, '"', "url", edge],
        [true, "'", "uRl", ""],
        [true, "", "URL", "x"],
        [false, "'", "URL", "大阪"],
      ],
    ],
  ],
})(
  "inline stylesheet URLs are left byte-for-byte intact and external ones need a file",
  (tokens) => {
    const css = tokens
      .map(([inline, quote, fn, text]) => {
        const path = text.replace(/[\s'"()\\]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
        return `a{b:${fn}( ${quote}${inline ? (quote ? "data:," : "#") : "/outside/"}${path}${quote} )}`;
      })
      .join("\n");
    const contained = tokens.every(([inline]) => inline);
    expect(selfContained(css)).toBe(contained);
    if (contained) expect(placeBrandUrls(css, "./assets")).toBe(css);
    else expect(() => placeBrandUrls(css, "./assets")).toThrow("no brand export to place");
  },
);

const names = fc.constantFrom(
  "header.css",
  "logos/a.svg",
  "fonts/Inter-400.woff2",
  "constructor",
  "__proto__",
  "toString",
  "nested/_.svg",
);

test.prop([fc.array(names), unicodeString], {
  examples: [
    [[], ""],
    [["constructor", "nested/_.svg", "constructor", "__proto__"], edge],
  ],
})(
  "brand links keep their names, duplicates and order across the page's quoting styles",
  (names, text) => {
    const quote = ['"', "'", "&quot;"];
    const links = names.map(
      (name, index) =>
        `${quote[index % quote.length]}../../brand/${name}${quote[index % quote.length]}`,
    );
    const prose = `dist/brand/${encodeURIComponent(text)}`;
    expect(brandNames([prose, ...links].join(" "))).toEqual(names);
  },
);
