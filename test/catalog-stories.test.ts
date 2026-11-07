import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aliasTypes } from "../lib/slide-components";
import { slideCatalogue } from "../specimen/slide-catalogue";
import { PARTS } from "../catalog/parts";

// The catalog (catalog/stories) shows every slide type with each of its specimen slides
// as a state, and every part with its sheet of variants: a type, a specimen slide or a part
// without a story fails here, as the print page fails on a part without an entry.
const STORIES = join(import.meta.dirname, "..", "catalog", "stories");
const files = (group: string) =>
  readdirSync(join(STORIES, group)).map((f) => f.replace(/\.stories\.ts$/, ""));
const registry = readFileSync(
  join(import.meta.dirname, "..", "lib", "slide-components.ts"),
  "utf8",
);
const types = [...registry.matchAll(/^\s*"?([\w-]+)"?: (\w+) as SlideComponent/gm)]
  .filter(([, type]) => !aliasTypes[type as keyof typeof aliasTypes])
  .map(([, type, component]) => ({ type, component }));

describe("catalog stories", () => {
  it("has a story file per slide type and per part, and no other", () => {
    expect(files("Types").sort()).toEqual(types.map((t) => t.component).sort());
    expect(files("Parts").sort()).toEqual(Object.keys(PARTS).sort());
  });

  it.each(types)("shows every specimen slide of $type as a state", ({ type, component }) => {
    const source = readFileSync(join(STORIES, "Types", `${component}.stories.ts`), "utf8");
    // A story shows the slide in its deck's chrome, as `StorySlide` renders it.
    expect(source).toContain("export default { component: StorySlide };");
    const states = [...source.matchAll(/state\("([\w-]+)", (\d+), "(\w+)"\)/g)];
    const count = slideCatalogue.slides.filter((s) => s.type === type).length;
    expect(states.map(([, t, n, c]) => `${t} ${n} ${c}`)).toEqual(
      Array.from({ length: count }, (_, n) => `${type} ${n} ${component}`),
    );
  });
});
