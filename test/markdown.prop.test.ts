import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { hasMarkdown, markdownless } from "../lib/markdown";

const kinds = fc.constantFrom("plain", "code", "link", "bold", "emphasis");

test.prop([fc.array(fc.tuple(kinds, unicodeString), { maxLength: 8 })], {
  examples: [
    [[]],
    [
      [
        ["plain", ""],
        ["code", "*.ts"],
        ["link", "大阪/constructor"],
        ["bold", "é".repeat(1024)],
        ["emphasis", "__proto__"],
      ],
    ],
  ],
})(
  "the inline markdown parser keeps visible text and strips only its markers and link targets",
  (parts) => {
    const fragments = parts.map(([kind, raw]) => {
      const text = `a${raw.replace(/[`*[\]()]|[\n\r]/g, "_")}z`;
      return {
        kind,
        text,
        marked: {
          plain: text,
          code: `\`${text}\``,
          link: `[${text}](/a/b?q=constructor)`,
          bold: `**${text}**`,
          emphasis: `*${text}*`,
        }[kind],
      };
    });
    const input = fragments.map(({ marked }) => marked).join(" | ");
    expect(markdownless(input)).toBe(fragments.map(({ text }) => text).join(" | "));
    expect(hasMarkdown(input)).toBe(fragments.some(({ kind }) => kind !== "plain"));
  },
);
