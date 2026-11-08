import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// A story renders its slide after hydration from the island's props, so a deck image's path there
// must carry the Pages base too, or every portrait on the published stories is a 404.
const dist = join(import.meta.dirname, "..", "..", "dist");
const stories = join(dist, "stories");

it("names each deck image under the base, in the markup and in the props", () => {
  const paths = readdirSync(stories, { recursive: true, encoding: "utf8" })
    .filter((page) => page.endsWith(".html"))
    .flatMap((page) => [
      ...readFileSync(join(stories, page), "utf8").matchAll(
        /(?:="|&quot;)(\/(?:[\w.-]+\/)*_astro\/[\w.-]+\.(?:png|mp4))/g,
      ),
    ])
    .map(([, path]) => path);
  expect(paths.length).toBeGreaterThan(0);
  for (const path of new Set(paths)) {
    expect(path).toMatch(/^\/slides\/_astro\//);
    expect(existsSync(join(dist, path.replace(/^\/slides/, ""))), path).toBe(true);
  }
});
