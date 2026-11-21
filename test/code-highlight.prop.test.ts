import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { Children, isValidElement } from "react";
import { expect } from "vitest";
import { highlightLines } from "../lib/code-highlight";

const sourceLine = unicodeString.map((line) => line.replace(/[\r\n\0]/g, " "));

test.prop(
  [
    fc.array(sourceLine, { minLength: 1, maxLength: 4 }),
    fc.constantFrom(undefined, "constructor", "typescript", "text"),
  ],
  {
    examples: [
      [[""], undefined],
      [["", "大阪/Grüße", "", "<a> & b", ""], "typescript"],
      [["y".repeat(1024)], "constructor"],
    ],
  },
)(
  "highlighting keeps the source lines and their text, including empty lines",
  (lines, language) => {
    const result = highlightLines(lines.join("\n"), language);
    expect(result).toHaveLength(lines.length);
    const displayed = result.map((line) =>
      Children.toArray(line)
        .map((token) =>
          isValidElement<{ children: string }>(token) ? token.props.children : token,
        )
        .join(""),
    );
    expect(displayed).toEqual(lines.map((line) => line || "\u00a0"));
  },
);
