import { describe, expect, it } from "vitest";
import { importsOf, slidesOptimizeDeps } from "../lib/vite";

describe("slidesOptimizeDeps", () => {
  it("excludes the engine and names the packages its islands import", () => {
    const { exclude, include } = slidesOptimizeDeps();
    expect(exclude).toEqual(["@hackersandwizards/slides"]);
    expect(include).toEqual(
      expect.arrayContaining(["recharts", "motion/react", "shiki/core", "lucide-react/icons/mail"]),
    );
    expect(
      include.filter((s) => /^(node:|next\/|prettier$|\.)|\.(json|css)$|\?url$/.test(s)),
    ).toEqual([]);
  });

  it("reads a comment marker inside a string as text", () => {
    const source = [
      'const a = "x/*y";',
      'import b from "kept-package";',
      "/* a comment */",
      'import c from "other";',
      '// import d from "commented-out";',
    ].join("\n");
    expect(importsOf(source)).toEqual(["kept-package", "other"]);
  });
});
