import { exports } from "@hackersandwizards/brand/package.json";

export const BRAND = "@hackersandwizards/brand/";
// The brand files as dist/brand/ holds them, under their export names, relative to the print pages
// in dist/catalog/print/.
export const brandHref = "../../brand";
const urlToken = /url\(\s*(["']?)(.*?)\1\s*\)/gis;
const inline = (url: string) => /^(data:|#)/.test(url);

// A file of the brand package under the name its `exports` give it: `tokens/fonts/x.woff2` is
// `fonts/x.woff2`.
const exportName = (path: string) => {
  for (const [name, target] of Object.entries(exports as Record<string, string>)) {
    const [from, to] = [target.slice(2), name.slice(2)];
    if (from === path) return to;
    if (from.endsWith("*") && path.startsWith(from.slice(0, -1)))
      return to.slice(0, -1) + path.slice(from.length - 1);
  }
};

/**
 * Points each `url()` of a compiled stylesheet, which names a brand file by its path in
 * `node_modules`, at that file's export name under `href`, and fails on any other file.
 */
export const placeBrandUrls = (css: string, href: string) =>
  css.replace(urlToken, (token, _quote, url: string) => {
    if (inline(url)) return token;
    const path = /(?:^|\/)node_modules\/@hackersandwizards\/brand\/(.+)$/.exec(url)?.[1];
    const name = path && exportName(path);
    if (!name) throw new Error(`no brand export to place: ${token}`);
    return `url("${href}/${name}")`;
  });

/** Whether a stylesheet the build copies alone reaches for no further file. */
export const selfContained = (css: string) =>
  !/@import/i.test(css) && [...css.matchAll(urlToken)].every(([, , url]) => inline(url));

/** The export names a built page links through `brandHref`. */
export const brandNames = (page: string) =>
  [...page.matchAll(/\.\.\/brand\/([\w./-]+)/g)].map(([, name]) => name);
