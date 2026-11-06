import { describe, expect, it } from "vitest";
import { brandNames, placeBrandUrls, selfContained } from "../catalog/brand-urls";

const font = "../node_modules/@hackersandwizards/brand/tokens/fonts/inter.woff2";
const placed = 'url("../x/fonts/inter.woff2")';

describe("placeBrandUrls", () => {
  it.each([`url("${font}")`, `url('${font}')`, `url(${font})`, `URL( "${font}" )`])(
    "places %s under its export name",
    (token) => expect(placeBrandUrls(`src: ${token};`, "../x")).toBe(`src: ${placed};`),
  );

  it("places a file brand exports by its own path under that name", () => {
    const css = 'a{b:url("/r/node_modules/@hackersandwizards/brand/tokens/print.css")}';
    expect(placeBrandUrls(css, "../x")).toBe('a{b:url("../x/print.css")}');
  });

  it("leaves a data URL as written, its inner quotes and brackets included", () => {
    const css = `a{mask:url("data:image/svg+xml,%3Csvg fill='rgb(0,0,0)'/%3E")}b{c:url(data:,x)}`;
    expect(placeBrandUrls(css, "../x")).toBe(css);
  });

  it("leaves a fragment, which names no file", () => {
    const css = "a{filter:url(#grain)}";
    expect(placeBrandUrls(css, "../x")).toBe(css);
  });

  it("leaves a url( in an escaped utility class alone", () => {
    const css = ".bg-\\[url\\(x\\)\\]{color:red}";
    expect(placeBrandUrls(css, "../x")).toBe(css);
  });

  it.each([
    'url("fonts/inter.woff2")',
    "url('../tokens/fonts/inter.woff2')",
    "url(fonts/inter.woff2)",
    'url("https://example.org/inter.woff2")',
    'url("@hackersandwizards/slides/x.png")',
    'url("@hackersandwizards/brand/fonts/inter.woff2")',
    'url("../node_modules/@hackersandwizards/brand/scripts/tokens.ts")',
    'url("../node_modules/@hackersandwizards/slides/x.png")',
    'url("a" b)',
    "url()",
  ])("fails on %s, which it cannot place", (token) => {
    expect(() => placeBrandUrls(`a{b:${token}}`, "../x")).toThrow(token);
  });
});

describe("selfContained", () => {
  it("takes a stylesheet whose only URLs are inline", () => {
    expect(selfContained(`a{b:url("data:image/svg+xml,%3Csvg/%3E")}`)).toBe(true);
  });

  it.each([
    '@import "./select.css";',
    '@IMPORT url("a.css");',
    `a{b:url("${font}")}`,
    "a{b:url(fonts/x.woff2)}",
    "a{b:URL('fonts/x.woff2')}",
    "a{b:url(\n  fonts/x.woff2\n)}",
  ])("refuses %s", (css) => expect(selfContained(css)).toBe(false));
});

describe("brandNames", () => {
  it("reads each export name a page links, whatever quotes it", () => {
    const page = `<link href="../../brand/header.css"><iframe srcdoc="&lt;img src=&quot;../../brand/logos/a.svg&quot;&gt;"></iframe><style>a{b:url('../../../brand/fonts/c.woff2')}</style>`;
    expect(brandNames(page)).toEqual(["header.css", "logos/a.svg", "fonts/c.woff2"]);
  });

  it("skips the path the page's prose names", () => {
    expect(brandNames("<code>dist/brand/</code>")).toEqual([]);
  });
});
