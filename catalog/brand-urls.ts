import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import brand from "@hackersandwizards/brand/package.json";

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

const brandDir = dirname(fromPackage.resolve("@hackersandwizards/brand/package.json"));

const exportTarget = (name: string) => {
  for (const [exported, target] of Object.entries(brand.exports as Record<string, string>)) {
    const [from, to] = [exported.slice(2), target.slice(2)];
    if (from === name) return to;
    if (from.endsWith("*") && name.startsWith(from.slice(0, -1)))
      return to.slice(0, -1) + name.slice(from.length - 1);
  }
};

/** The file brand exports under `name`, or undefined where brand exports no existing file for it. */
export const findBrandFile = (
  name: string,
  lookup: (id: string) => string = brandFile,
): string | undefined => {
  if (!name || name.includes("..")) return undefined;
  const target = exportTarget(name);
  if (!target) return undefined;
  const candidate = resolve(brandDir, target);
  if (
    !candidate.startsWith(`${brandDir}${sep}`) ||
    !statSync(candidate, { throwIfNoEntry: false })?.isFile()
  )
    return undefined;
  return lookup(name);
};

const bareName = /^@hackersandwizards\/brand\/(.+)$/;
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
