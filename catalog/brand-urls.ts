export const BRAND = "@hackersandwizards/brand/";
// The brand files as dist/brand/ holds them, under their export names, relative to the print pages
// in dist/catalog/print/.
export const brandHref = "../../brand";
const urlToken = /url\(\s*(["']?)(.*?)\1\s*\)/gis;
const inline = (url: string) => /^(data:|#)/.test(url);

/**
 * Points each `url()` of a stylesheet at `href`, and fails on one outside brand. A name brand does
 * not export fails where the build resolves it.
 */
export const placeBrandUrls = (css: string, href: string) =>
  css.replace(urlToken, (token, _quote, url: string) => {
    if (inline(url)) return token;
    if (!url.startsWith(BRAND)) throw new Error(`no brand export to place: ${token}`);
    return `url("${href}/${url.slice(BRAND.length)}")`;
  });

/** Whether a stylesheet the build copies alone reaches for no further file. */
export const selfContained = (css: string) =>
  !/@import/i.test(css) && [...css.matchAll(urlToken)].every(([, , url]) => inline(url));

/** The export names a built page links through `brandHref`. */
export const brandNames = (page: string) =>
  [...page.matchAll(/\.\.\/brand\/([\w./-]+)/g)].map(([, name]) => name);
