import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { compile } from "@tailwindcss/node";

export const compileSlides = (root: string) => {
  const stylesheet = join(root, "styles", "slides.css");
  return compile(readFileSync(stylesheet, "utf8"), {
    base: dirname(stylesheet),
    from: stylesheet,
    onDependency: () => {},
    shouldRewriteUrls: true,
  });
};

export const unescapeHtml = (text: string) =>
  text
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

// The class attributes alone: a scan of the markup reads `[&_strong]:x` as its escaped text, which
// names no utility, and the prose around it as candidates.
export const classesIn = (html: string) =>
  [...html.matchAll(/\bclass="([^"]*)"/g)].flatMap(([, list]) =>
    unescapeHtml(list).split(/\s+/).filter(Boolean),
  );
