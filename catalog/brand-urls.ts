export const BRAND = "@hackersandwizards/brand/";
// The brand files as dist/brand/ holds them, under their export names, relative to the print pages
// in dist/catalog/print/.
export const brandHref = "../../brand";

/** Points each `url()` of a stylesheet at `href`, and fails on one that is no brand export. */
export const placeBrandUrls = (css: string, href: string) =>
  css.replace(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi,
    (token, double?: string, single?: string, bare?: string) => {
      const url = double ?? single ?? bare ?? "";
      if (url.startsWith("data:")) return token;
      if (!url.startsWith(BRAND)) throw new Error(`no brand export to place: ${token}`);
      return `url("${href}/${url.slice(BRAND.length)}")`;
    },
  );

/** The export names a built page links through `brandHref`. */
export const brandNames = (page: string) =>
  [...page.matchAll(/\.\.\/brand\/([\w./-]+)/g)].map(([, name]) => name);
