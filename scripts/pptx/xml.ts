export const xmlAttr = (xml: string, name: string) =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(xml)?.[1];
export const num = (xml: string, name: string, fallback = 0) => {
  const v = xmlAttr(xml, name);
  return v === undefined ? fallback : Number(v);
};
/** An XML text node's characters, its entities resolved. */
export const unescape = (t: string) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
