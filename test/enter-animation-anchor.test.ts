import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A BlurFade animates a transform and a filter, and either makes the wrapper the containing block
// of an absolutely placed child until the fade ends: the child then jumps to its real anchor after
// the first paint (the phased-pills title pill moved 53 px). A placed element is the fade itself.
const dir = join(__dirname, "../components/slides");

const OFFENDER = /<BlurFade\b[^>]*>\s*<(div|span)\b[^>]*className=["{`][^"`]*\babsolute\b/g;

describe("enter animations", () => {
  it("finds a placed child in a BlurFade, the control", () => {
    expect(
      '<BlurFade delay={0.2}>\n  <div className="absolute top-0">'.match(OFFENDER),
    ).toHaveLength(1);
  });

  it.each(readdirSync(dir).filter((f) => f.endsWith(".tsx")))(
    "%s wraps no absolutely placed child in a BlurFade",
    (file) => {
      expect(readFileSync(join(dir, file), "utf8").match(OFFENDER)).toBeNull();
    },
  );
});
