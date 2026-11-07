import brand from "@hackersandwizards/brand/package.json";
import { createRequire } from "node:module";

// Relative to the print pages in dist/catalog/print/.
export const brandHref = "../../brand";
const urlToken = /url\(\s*(["']?)(.*?)\1\s*\)/gis;
const inline = (url: string) => /^(data:|#)/.test(url);

const exportName = (path: string) => {
  for (const [name, target] of Object.entries(brand.exports as Record<string, string>)) {
    const [from, to] = [target.slice(2), name.slice(2)];
    if (from === path) return to;
    if (from.endsWith("*") && path.startsWith(from.slice(0, -1)))
      return to.slice(0, -1) + path.slice(from.length - 1);
  }
};

const fromPackage = createRequire(import.meta.url);
/** The file brand exports under `name`; throws where brand exports none. */
export const brandFile = (name: string) => fromPackage.resolve(`@hackersandwizards/brand/${name}`);

const bareName = /^@hackersandwizards\/brand\/(.+)$/;
/** The file a URL names: a URL naming a brand export by its package becomes its path. */
const resolved = (token: string, url: string) => {
  const name = bareName.exec(url)?.[1];
  if (!name) return url;
  try {
    return brandFile(name);
  } catch (cause) {
    throw new Error(`no brand export to place: ${token}`, { cause });
  }
};

/**
 * Points each `url()` of a compiled stylesheet, which names a brand file by its path in
 * `node_modules` or by its export (`@hackersandwizards/brand/<name>`), at that file's export name
 * under `href`, and fails on any other file.
 */
export const placeBrandUrls = (css: string, href: string) =>
  css.replace(urlToken, (token, _quote, url: string) => {
    if (inline(url)) return token;
    const path = /(?:^|\/)node_modules\/@hackersandwizards\/brand\/(.+)$/.exec(
      resolved(token, url),
    )?.[1];
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
