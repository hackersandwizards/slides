import { describe, expect, it } from "vitest";
import { fromLocalPage, literals, replace, resolve } from "../lib/deck-edit";

const DECK = `// A comment with an apostrophe: don't
export const deck = {
  slides: [
    { title: "Agenda", bullets: ['Use **Claude** daily', "Say \\"yes\\"", \`Grüße\`] },
    /* "Agenda" in a comment is no literal */
    { title: "Agenda", notes: \`Line one
Line two\`, label: \`\${x} items\` },
  ],
};
`;

describe("literals", () => {
  it("decodes escapes, skips comments and templates with substitutions", () => {
    expect(literals(DECK).map((l) => l.value)).toEqual([
      "Agenda",
      "Use **Claude** daily",
      'Say "yes"',
      "Grüße",
      "Agenda",
      "Line one\nLine two",
    ]);
  });
});

describe("resolve", () => {
  it("finds a string by its rendered text, markdown markers and whitespace ignored", () => {
    expect(resolve(DECK, ["Claude", "Use Claude daily"])).toEqual({
      value: "Use **Claude** daily",
      index: 1,
    });
    expect(resolve(DECK, ["Line oneLine two"])).toEqual({ value: "Line one\nLine two", index: 0 });
  });

  it("refuses a text that is in the file twice or not at all", () => {
    expect(resolve(DECK, ["Agenda"])).toHaveProperty("error");
    expect(resolve(DECK, ["Nowhere"])).toHaveProperty("error");
  });
});

describe("replace", () => {
  it("keeps each literal's quote style and escapes what that style needs", () => {
    const to = `It's "Grüße" \\ done`;
    const single = replace(DECK, "Use **Claude** daily", to);
    expect(single).toEqual({
      source: DECK.replace(`'Use **Claude** daily'`, `'It\\'s "Grüße" \\\\ done'`),
    });
    const double = replace(DECK, 'Say "yes"', to);
    expect(double).toEqual({
      source: DECK.replace(`"Say \\"yes\\""`, `"It's \\"Grüße\\" \\\\ done"`),
    });
    const template = replace(DECK, "Grüße", "a `b` ${c}");
    expect(template).toEqual({ source: DECK.replace("`Grüße`", "`a \\`b\\` \\${c}`") });
  });

  it("round-trips: the written literal decodes to the new value", () => {
    const to = `It's "Grüße" \\ done\nnext`;
    const written = replace(DECK, 'Say "yes"', to);
    expect("source" in written && literals(written.source).map((l) => l.value)).toContain(to);
  });

  it("refuses a duplicate or missing original", () => {
    expect(replace(DECK, "Agenda", "x")).toHaveProperty("error");
    expect(replace(DECK, "Nowhere", "x")).toHaveProperty("error");
  });
});

describe("review findings", () => {
  const deck = `export const d = {
  name: "Stop Building Features. Build the Factory.",
  slides: [{ title: "Stop Building Features.\\nBuild the Factory.", quote: "Stay curious." }],
};`;

  it("tells a title with a line break from a deck name without one", () => {
    expect(resolve(deck, ["Stop Building Features.Build the Factory."])).toEqual({
      value: "Stop Building Features.\nBuild the Factory.",
      index: 0,
    });
  });

  it("ignores the quote marks a component draws around a quote", () => {
    expect(resolve(deck, ["“Stay curious.”"])).toEqual({ value: "Stay curious.", index: 0 });
  });

  it("refuses to write an empty text", () => {
    expect(replace(deck, "Stay curious.", "  ")).toHaveProperty("error");
  });
});

describe("substitutions and escapes", () => {
  it("skips a substitution whose quoted strings hold an unmatched brace", () => {
    const source = 'const a = `${x ? "{" : ""} items`;\nconst b = "after";';
    expect(literals(source).map((l) => l.value)).toEqual(["after"]);
  });

  it("writes tabs, invisible spaces and carriage returns back as escapes", () => {
    const source = 'const a = "one";\nconst t = `two`;';
    expect(replace(source, "one", "a\tb\u00a0c")).toEqual({
      source: source.replace('"one"', '"a\\tb\\u00a0c"'),
    });
    const written = replace(source, "two", "a\rb");
    expect(written).toEqual({ source: source.replace("`two`", "`a\\rb`") });
    expect("source" in written && literals(written.source).map((l) => l.value)).toContain("a\rb");
  });
});

describe("fromLocalPage", () => {
  it("takes loopback on the dev port, and a .localhost name behind the local proxy", () => {
    expect(fromLocalPage("127.0.0.1:4324", null, "4324")).toBe(true);
    expect(fromLocalPage("localhost:4324", "http://localhost:4324", "4324")).toBe(true);
    expect(fromLocalPage("[::1]:4324", "http://[::1]:4324", "4324")).toBe(true);
    expect(fromLocalPage("talks.localhost", "https://talks.localhost", "4324")).toBe(true);
  });

  it("refuses a foreign Host or Origin, another port and an opaque origin", () => {
    expect(fromLocalPage("evil.example:4324", null, "4324")).toBe(false);
    expect(fromLocalPage("127.0.0.1:4324", "http://evil.example", "4324")).toBe(false);
    expect(fromLocalPage("127.0.0.1:8080", null, "4324")).toBe(false);
    expect(fromLocalPage("127.0.0.1:4324", "null", "4324")).toBe(false);
    expect(fromLocalPage("localhost.evil.example:4324", null, "4324")).toBe(false);
    expect(fromLocalPage(null, null, "4324")).toBe(false);
  });
});
