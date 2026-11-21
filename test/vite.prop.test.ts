import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { importsOf } from "../lib/vite";

const modes = fc.constantFrom(
  "static",
  "side-effect",
  "export",
  "dynamic",
  "type",
  "line",
  "block",
);
const longSubpath = `/${"舞".repeat(1024)}`;
const endings = fc.constantFrom("", "/éntry/sub-path", longSubpath, ".json", ".css", "?url");
const specifiers = fc.constantFrom(
  "package",
  "@scope/pkg",
  "node:fs",
  "prettier",
  "@hackersandwizards/slides",
  "./local",
  "../local",
);

test.prop([fc.array(fc.tuple(modes, specifiers, endings)), unicodeString], {
  examples: [
    [[], ""],
    [
      [
        ["static", "package", ""],
        ["side-effect", "@scope/pkg", "/éntry/sub-path"],
        ["side-effect", "@scope/pkg", longSubpath],
        ["export", "package", ""],
        ["dynamic", "package", ""],
        ["type", "package", ""],
        ["line", "package", ""],
        ["block", "package", ""],
        ["static", "node:fs", ""],
        ["static", "prettier", ""],
        ["static", "@hackersandwizards/slides", ""],
        ["static", "../local", ""],
        ["static", "./local", ""],
        ["dynamic", "package", ".json"],
        ["dynamic", "package", ".css"],
        ["dynamic", "package", "?url"],
      ],
      "/*大阪//".repeat(256),
    ],
  ],
})(
  "the optimizer scan preserves ordered runtime imports and drops non-bundleable specifiers",
  (imports, text) => {
    const expected = [];
    const source = [`const text = ${JSON.stringify(text)};`];
    for (const [mode, pkg, ending] of imports) {
      const specifier = pkg + ending;
      const quoted = JSON.stringify(specifier);
      const statement = {
        static: `import x from ${quoted};`,
        "side-effect": `import ${quoted};`,
        export: `export { x } from ${quoted};`,
        dynamic: `const value = import(${quoted});`,
        type: `import type { X } from ${quoted};`,
        line: `// import ${quoted};`,
        block: `/*\nimport ${quoted};\n*/`,
      }[mode];
      source.push(statement);
      if (
        ["static", "side-effect", "export", "dynamic"].includes(mode) &&
        (pkg === "package" || pkg === "@scope/pkg" || (pkg === "prettier" && ending !== "")) &&
        (ending === "" || ending.startsWith("/"))
      )
        expected.push(specifier);
    }
    expect(importsOf(source.join("\n"))).toEqual(expected);
  },
);
