import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aliasTypes } from "../lib/slide-components";
import { slideCatalog } from "../specimen/slide-catalog";
import { PARTS } from "../catalog/parts";

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
  it("has a story file per slide type, per part and per deck component, and no other", () => {
    expect(files("Types").sort()).toEqual(types.map((t) => t.component).sort());
    expect(files("Parts").sort()).toEqual(Object.keys(PARTS).sort());
    const deck = readdirSync(join(import.meta.dirname, "..", "components", "deck"));
    const components = deck.filter((f) => f.endsWith(".tsx")).map((f) => f.slice(0, -4));
    expect(files("Deck").sort()).toEqual(components.sort());
  });

  it.each(types)("shows every specimen slide of $type as a state", ({ type, component }) => {
    const source = readFileSync(join(STORIES, "Types", `${component}.stories.ts`), "utf8");
    expect(source).toContain(`export default { component: storySlide(${component}) };`);
    const states = [...source.matchAll(/state\("([\w-]+)", (\d+), "(\w+)"\)/g)];
    const count = slideCatalog.slides.filter((s) => s.type === type).length;
    expect(states.map(([, t, n, c]) => `${t} ${n} ${c}`)).toEqual(
      Array.from({ length: count }, (_, n) => `${type} ${n} ${component}`),
    );
  });
});
