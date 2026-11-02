import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// The code ground's utility reads the code role, in the stylesheet Tailwind compiles for the print
// pages (test/code-highlight.test.tsx holds the role's values).
const built = readFileSync(
  join(import.meta.dirname, "..", "..", "dist", "catalog", "print", "build", "slides.css"),
  "utf8",
);

it("compiles bg-code-bg to the code role", () => {
  expect(built).toMatch(/\.bg-code-bg \{\s*background-color: var\(--color-code-bg\);/);
});
