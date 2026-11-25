import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { figureChars, numbersGrid } from "../lib/figure-layout";
import { bulletsAsStatement } from "../lib/content-redraw";
import { formatDuration } from "../lib/slide-timing";
import { pageLabel } from "../lib/slide-framing";
import { personAccent } from "../lib/people-slides";
import { logoPlaces, resolveSlideLogo, HW_LOGO } from "../lib/logo";
import { DEFAULT_SECTION_STYLE, getSectionStyle, SECTION_STYLES } from "../lib/section-styles";

test.prop([fc.integer({ min: -100_000, max: 1_000_000_000 })], {
  examples: [[-1], [0], [999], [59_999], [60_000], [3_599_999], [3_600_000], [36_000_000]],
})("the elapsed-time label encodes whole seconds in canonical clock fields", (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const fields = formatDuration(ms).split(":");
  expect(fields.join(":")).toMatch(
    seconds < 3600 ? /^(?:0|[1-5]?\d):[0-5]\d$/ : /^[1-9]\d*:[0-5]\d:[0-5]\d$/,
  );
  expect(fields.reduce((total, field) => total * 60 + Number(field), 0)).toBe(seconds);
});

test.prop([fc.integer({ min: 1, max: 1100 }), fc.nat(), fc.boolean()], {
  examples: [
    [1, 0, false],
    [99, 98, false],
    [100, 0, false],
    [1, 0, true],
    [1000, 999, false],
  ],
})(
  "the corner counter uses the deck's digit width and omits title slides",
  (size, offset, title) => {
    const index = offset % size;
    const slides = Array.from({ length: size }, (_, i) => ({
      type: title && i === index ? "title" : "statement",
    }));
    const width = Math.max(2, String(size).length);
    expect(pageLabel(slides, index)).toBe(
      title
        ? undefined
        : `${String(index + 1).padStart(width, "0")} / ${String(size).padStart(width, "0")}`,
    );
  },
);

test.prop([fc.nat({ max: 1_000_000 })], { examples: [[0], [1], [2]] })(
  "person accents alternate from teal in the first position",
  (index) => {
    expect(personAccent(0)).toBe("primary");
    expect(personAccent(index)).not.toBe(personAccent(index + 1));
  },
);

test.prop([fc.array(fc.integer({ min: 1, max: 1024 }), { minLength: 1, maxLength: 10 })], {
  examples: [
    [[1]],
    [[1, 2]],
    [[1, 1, 1]],
    [[1, 2, 1, 1]],
    [[1, 1, 1, 1, 1]],
    [[1, 1, 1024, 1, 1, 1]],
    [[1, 1, 1, 1, 1, 1, 1]],
  ],
})(
  "the numbers grid allocates its documented columns and scales for the widest figure",
  (lengths) => {
    const values = lengths.map((length) => "7".repeat(length));
    const grid = numbersGrid(values);
    const expectedColumns = lengths.length < 5 ? lengths.length : lengths.length < 7 ? 3 : 4;
    const cap = lengths.length > 4 ? 5 : lengths.length === 2 ? 9 : 7;
    const available = 1650 / expectedColumns - 60;
    expect(grid.cols).toBe(expectedColumns);
    expect(grid.wrapped).toBe(lengths.length > 4);
    expect(grid.size).toBeCloseTo(
      Math.min(cap, available / (Math.max(...lengths) * 0.6 * 21.333)),
      10,
    );
  },
);

test.prop(
  [
    fc.array(fc.constantFrom("ca.", "über", "à", "plus", "up")),
    fc.constantFrom("7", "-90 %", "$9M", "7".repeat(1024)),
  ],
  {
    examples: [
      [[], "7"],
      [["über", "ca."], "7".repeat(1024)],
    ],
  },
)("a figure's lowercase prefix counts half and its separator adds no width", (words, figure) => {
  const prefix = words.join(" ");
  expect(figureChars(`${prefix}${prefix ? " " : ""}${figure}`)).toBe(
    figure.length + prefix.length / 2,
  );
});

const bullet = fc.oneof(
  unicodeString,
  fc.constantFrom("界".repeat(90), "界".repeat(91)),
  unicodeString.map((text) => ({ text, children: ["nested"] })),
);

test.prop([fc.array(bullet, { maxLength: 4 }), fc.boolean()], {
  examples: [
    [[], false],
    [[""], false],
    [["界".repeat(90), "/constructor"], false],
    [["界".repeat(91)], false],
    [["a", "b", "c"], false],
    [[{ text: "a", children: ["b"] }], false],
    [["a"], true],
  ],
})(
  "only an unordered list of one or two short flat bullets becomes a statement",
  (items, ordered) => {
    const statement = bulletsAsStatement({
      type: "content",
      headline: "Slide",
      content: [{ type: "bullets", ordered, items }],
    });
    if (
      ordered ||
      items.length === 0 ||
      items.length > 2 ||
      items.some((item) => typeof item !== "string" || item.length > 90)
    ) {
      expect(statement).toBeUndefined();
    } else {
      expect(statement).toMatchObject({
        type: "statement",
        lines: ["Slide"],
        subtitle: items[0],
        closing: items[1],
      });
    }
  },
);

const logos = fc.record({ src: unicodeString, alt: unicodeString });

test.prop([fc.array(logos, { maxLength: 5 })], {
  examples: [
    [[]],
    [[{ src: "", alt: "" }]],
    [
      [
        { src: "/舞台/logo.svg", alt: "舞台" },
        { src: "/last.svg", alt: "長".repeat(1024) },
      ],
    ],
  ],
})("logo placement keeps the original order, putting the last logo in the corner", (list) => {
  const { start, corner } = logoPlaces(list);
  expect([...start, corner]).toEqual(list.length ? list : [HW_LOGO]);
  expect(start).toHaveLength(Math.max(0, list.length - 1));
  expect(logoPlaces(null)).toEqual({ start: [], corner: HW_LOGO });
  expect(logoPlaces(undefined)).toEqual({ start: [], corner: HW_LOGO });
  if (list.length) expect(logoPlaces(list[0])).toEqual({ start: [], corner: list[0] });
});

test.prop([fc.nat({ max: 1000 }), fc.option(logos), fc.option(logos, { nil: undefined })], {
  examples: [
    [0, null, undefined],
    [1000, { src: "/大阪.svg", alt: "" }, { src: "", alt: "界".repeat(1024) }],
  ],
})(
  "an explicit slide logo wins and every other index falls back to the deck logo",
  (index, override, logo) => {
    const deck = { logo, slideLogos: { [index]: override } };
    expect(resolveSlideLogo(deck, index)).toBe(override);
    expect(resolveSlideLogo(deck, index + 1)).toBe(logo);
    expect(resolveSlideLogo({ logo }, index)).toBe(logo);
  },
);

test.prop([fc.option(unicodeString, { nil: undefined })], {
  examples: [
    [undefined],
    [""],
    ["constructor"],
    ["__proto__"],
    ["toString"],
    ["/テーマ".repeat(400)],
  ],
})("only authored theme keys select a section style", (theme) => {
  const styles = new Map(Object.entries(SECTION_STYLES));
  expect(getSectionStyle(theme)).toBe(styles.get(theme ?? "") ?? DEFAULT_SECTION_STYLE);
  for (const key of styles.keys()) {
    expect(getSectionStyle(key)).toBe(styles.get(key));
  }
});
